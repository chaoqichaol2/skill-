import AppKit
import SwiftUI

@MainActor
struct UsageDashboardView: View {
    @StateObject private var model: UsageDashboardModel

    init(model: UsageDashboardModel) {
        _model = StateObject(wrappedValue: model)
    }

    var body: some View {
        ZStack {
            dashboardBackground

            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 0) {
                            Color.clear
                                .frame(height: 0)
                                .id("dashboard-top")
                            header
                            summary

                            switch model.state {
                            case .loading:
                                StatusMessage(
                                    icon: "arrow.triangle.2.circlepath",
                                    title: model.language.text("正在读取本机使用记录", "Reading local usage"),
                                    detail: model.language.text("首次统计较大的 Codex 历史可能需要一些时间。", "The first scan may take a moment for large Codex histories.")
                                )
                            case let .failed(message):
                                StatusMessage(
                                    icon: "exclamationmark.triangle",
                                    title: model.language.text("暂时无法读取数据", "Unable to read usage"),
                                    detail: message
                                )
                            case .ready:
                                ForEach(Array(model.providers.enumerated()), id: \.element.id) { index, provider in
                                    if index > 0 {
                                        Divider()
                                            .overlay(UsageTheme.line)
                                            .padding(.vertical, 22)
                                    }
                                    ProviderSection(provider: provider)
                                }
                            }
                        }
                        .padding(.horizontal, 26)
                        .padding(.top, 22)
                        .padding(.bottom, 18)
                    }
                    .onAppear {
                        DispatchQueue.main.async {
                            proxy.scrollTo("dashboard-top", anchor: .top)
                        }
                    }
                }

                Divider().overlay(UsageTheme.line)
                bottomBar
            }

            if model.showingSettings {
                SettingsOverlay(model: model)
                    .transition(.opacity.combined(with: .scale(scale: 0.97)))
            }
        }
        .frame(width: 430, height: 780)
        .preferredColorScheme(.dark)
        .animation(.easeOut(duration: 0.18), value: model.showingSettings)
        .environmentObject(model)
        .task { model.start() }
    }

    private var dashboardBackground: some View {
        ZStack {
            Rectangle().fill(.ultraThinMaterial)
            LinearGradient(
                colors: [
                    Color.black.opacity(0.42),
                    UsageTheme.panel.opacity(0.88),
                    Color(red: 0.05, green: 0.12, blue: 0.18).opacity(0.78),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            RadialGradient(
                colors: [Color.blue.opacity(0.18), .clear],
                center: .bottomTrailing,
                startRadius: 10,
                endRadius: 330
            )
        }
        .ignoresSafeArea()
    }

    private var header: some View {
        HStack(spacing: 12) {
            HStack(spacing: 9) {
                AppLogo()
                Text("TokenPulse")
                    .usageMonospaced(14, weight: .semibold)
            }
            .foregroundStyle(UsageTheme.text)

            Spacer()

            PeriodSelector(selection: $model.period, language: model.language)
                .frame(width: 232)
        }
        .padding(.bottom, 36)
    }

    private var summary: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(model.language.text("总计 TOKEN", "TOTAL TOKENS"))
                .foregroundStyle(UsageTheme.secondary)
                .usageMonospaced(15, weight: .medium)

            Text(model.summary.tokenText)
                .foregroundStyle(UsageTheme.text)
                .font(.system(size: 44, weight: .medium, design: .rounded))
                .monospacedDigit()
                .minimumScaleFactor(0.72)
                .lineLimit(1)

            Text(model.summary.costText(language: model.language))
                .foregroundStyle(UsageTheme.secondary)
                .usageMonospaced(18, weight: .medium)
        }
        .padding(.bottom, 32)
    }

    private var bottomBar: some View {
        HStack(spacing: 12) {
            Button {
                model.refresh()
            } label: {
                HStack(spacing: 9) {
                    Image(systemName: model.isRefreshing ? "arrow.triangle.2.circlepath" : "gauge.with.dots.needle.bottom.50percent")
                        .rotationEffect(.degrees(model.isRefreshing ? 180 : 0))
                    Text(
                        model.isRefreshing
                            ? model.language.text("刷新中", "Refreshing")
                            : model.language.text("刷新", "Refresh")
                    )
                }
                .foregroundStyle(UsageTheme.secondary)
                .usageMonospaced(14, weight: .medium)
                .padding(.horizontal, 15)
                .frame(height: 42)
                .background(UsageTheme.control, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(UsageTheme.controlBorder, lineWidth: 1)
                }
            }
            .buttonStyle(.plain)
            .animation(.linear(duration: 0.4), value: model.isRefreshing)

            Spacer()

            Button {
                model.showingSettings = true
            } label: {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(UsageTheme.text)
                    .frame(width: 42, height: 42)
                    .background(UsageTheme.control, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(UsageTheme.controlBorder, lineWidth: 1)
                    }
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 26)
        .padding(.vertical, 14)
        .background(Color.black.opacity(0.13))
    }
}

private struct AppLogo: View {
    var body: some View {
        Group {
            if let url = Bundle.main.url(forResource: "AppIcon", withExtension: "icns"),
               let image = NSImage(contentsOf: url) {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                Image(systemName: "waveform.path.ecg")
                    .foregroundStyle(Color.cyan)
            }
        }
        .frame(width: 27, height: 27)
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
    }
}

private struct PeriodSelector: View {
    @Binding var selection: UsagePeriod
    let language: AppLanguage

    var body: some View {
        HStack(spacing: 3) {
            ForEach(UsagePeriod.allCases) { period in
                Button {
                    selection = period
                } label: {
                    Text(period.title(language))
                        .foregroundStyle(selection == period ? UsageTheme.text : UsageTheme.secondary)
                        .usageMonospaced(11, weight: .medium)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background {
                            if selection == period {
                                RoundedRectangle(cornerRadius: 9, style: .continuous)
                                    .fill(Color.white.opacity(0.11))
                                    .overlay {
                                        RoundedRectangle(cornerRadius: 9, style: .continuous)
                                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                                    }
                            }
                        }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .frame(height: 42)
        .background(Color.white.opacity(0.065), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.white.opacity(0.055), lineWidth: 1)
        }
    }
}

private struct ProviderSection: View {
    let provider: UsageProvider

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            providerHeader

            if !provider.metrics.isEmpty {
                MetricGrid(metrics: provider.metrics)
            }

            if let balance = provider.balance {
                BalanceView(balance: balance, accent: provider.accent)
            }

            if let accountName = provider.accountName {
                HStack {
                    Text(accountName)
                    Spacer()
                    Image(systemName: "lock.fill")
                }
                .foregroundStyle(UsageTheme.secondary)
                .usageMonospaced(12, weight: .medium)
            }

            if let note = provider.note {
                Text(note)
                    .foregroundStyle(UsageTheme.secondary)
                    .usageMonospaced(12)
            }
        }
    }

    private var providerHeader: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(provider.symbol)
                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                    .foregroundStyle(UsageTheme.text)
                    .frame(width: 22)

                Text(provider.name)
                    .foregroundStyle(UsageTheme.text)
                    .usageMonospaced(20, weight: .semibold)

                Spacer()

                if let plan = provider.plan {
                    Text(plan)
                        .foregroundStyle(UsageTheme.secondary)
                        .usageMonospaced(13, weight: .medium)
                }
            }

            if !provider.updatedText.isEmpty {
                Text(provider.updatedText)
                    .foregroundStyle(UsageTheme.secondary)
                    .usageMonospaced(13)
                    .padding(.leading, 32)
            }
        }
    }
}

private struct BalanceView: View {
    let balance: UsageBalance
    let accent: Color
    @EnvironmentObject private var model: UsageDashboardModel

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline) {
                Text(model.language.text("可用余额", "AVAILABLE BALANCE"))
                    .foregroundStyle(UsageTheme.secondary)
                    .usageMonospaced(12, weight: .medium)
                Spacer()
                Circle()
                    .fill(balance.isAvailable ? Color.green : Color.orange)
                    .frame(width: 7, height: 7)
            }
            Text(balance.amountText)
                .foregroundStyle(UsageTheme.text)
                .font(.system(size: 28, weight: .semibold, design: .rounded))
                .monospacedDigit()
            Text(balance.detailText)
                .foregroundStyle(UsageTheme.secondary)
                .usageMonospaced(11)
        }
        .padding(14)
        .background(accent.opacity(0.09), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(accent.opacity(0.24), lineWidth: 1)
        }
    }
}

private struct StatusMessage: View {
    let icon: String
    let title: String
    let detail: String

    var body: some View {
        VStack(spacing: 13) {
            Image(systemName: icon)
                .font(.system(size: 24, weight: .medium))
            Text(title)
                .usageMonospaced(15, weight: .semibold)
            Text(detail)
                .foregroundStyle(UsageTheme.secondary)
                .usageMonospaced(12)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(UsageTheme.text)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 58)
        .padding(.horizontal, 24)
    }
}

private struct MetricGrid: View {
    let metrics: [UsageMetric]

    private var columns: [GridItem] {
        metrics.count == 2
            ? [GridItem(.flexible(), spacing: 16), GridItem(.flexible())]
            : [GridItem(.flexible())]
    }

    var body: some View {
        if metrics.count == 3 {
            VStack(spacing: 15) {
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 16), GridItem(.flexible())], spacing: 15) {
                    MetricView(metric: metrics[0])
                    MetricView(metric: metrics[1])
                }
                MetricView(metric: metrics[2])
            }
        } else {
            LazyVGrid(columns: columns, spacing: 15) {
                ForEach(metrics) { metric in
                    MetricView(metric: metric)
                }
            }
        }
    }
}

private struct MetricView: View {
    let metric: UsageMetric
    @EnvironmentObject private var model: UsageDashboardModel

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline) {
                Text(metric.label)
                    .foregroundStyle(UsageTheme.secondary)
                    .usageMonospaced(14)
                Spacer()
                Text(
                    model.language.text(
                        "剩余 \(metric.remainingPercent)%",
                        "\(metric.remainingPercent)% left"
                    )
                )
                    .foregroundStyle(UsageTheme.text)
                    .usageMonospaced(14, weight: .semibold)
                    .monospacedDigit()
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(UsageTheme.track)
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [metric.accent, metric.accent.opacity(0.72)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * CGFloat(metric.remainingPercent) / 100)
                }
            }
            .frame(height: 9)

            if !metric.resetText.isEmpty {
                Text(metric.resetText)
                    .foregroundStyle(UsageTheme.secondary)
                    .usageMonospaced(12)
            }
        }
    }
}

private struct SettingsOverlay: View {
    @ObservedObject var model: UsageDashboardModel

    var body: some View {
        ZStack {
            Color.black.opacity(0.58)
                .ignoresSafeArea()
                .onTapGesture { model.showingSettings = false }

            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text(model.language.text("设置", "Settings"))
                        .foregroundStyle(UsageTheme.text)
                        .usageMonospaced(20, weight: .semibold)
                    Spacer()
                    Button {
                        model.showingSettings = false
                    } label: {
                        Image(systemName: "xmark")
                            .foregroundStyle(UsageTheme.secondary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.bottom, 18)

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(model.language.text("语言", "Language"))
                                .foregroundStyle(UsageTheme.secondary)
                                .usageMonospaced(11, weight: .medium)

                            LanguageSelector(selection: model.language) { language in
                                model.setLanguage(language)
                            }
                        }

                        Divider().overlay(UsageTheme.line)

                        ReminderSettings(model: model)

                        Divider().overlay(UsageTheme.line)

                        SourceRow(icon: "terminal", title: "Codex", detail: "~/.codex/sessions")
                        SourceRow(icon: "sparkles", title: "Claude CLI", detail: "~/.claude/projects")

                        Divider().overlay(UsageTheme.line)

                        deepSeekSettings

                        Divider().overlay(UsageTheme.line)

                        Text(
                            model.language.text(
                                "Codex 与 Claude 数据从本机会话读取；DeepSeek Key 仅保存在 macOS 钥匙串，并只发送给 DeepSeek 官方余额接口。应用不会上传对话正文。",
                                "Codex and Claude are read locally. The DeepSeek key stays in macOS Keychain and is sent only to DeepSeek's official balance endpoint. Conversation content is never uploaded."
                            )
                        )
                            .foregroundStyle(UsageTheme.secondary)
                            .usageMonospaced(12)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .frame(maxHeight: 620)
            }
            .padding(22)
            .frame(width: 370)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Color.white.opacity(0.14), lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.55), radius: 30, y: 18)
        }
    }

    private var deepSeekSettings: some View {
        VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("DeepSeek API")
                            .foregroundStyle(UsageTheme.text)
                            .usageMonospaced(13, weight: .semibold)
                        Spacer()
                        Text(
                            model.deepSeekKeyConfigured
                                ? model.language.text("已连接", "Connected")
                                : model.language.text("未连接", "Not connected")
                        )
                            .foregroundStyle(model.deepSeekKeyConfigured ? Color.green.opacity(0.85) : UsageTheme.secondary)
                            .usageMonospaced(11, weight: .medium)
                    }

                    if model.deepSeekKeyConfigured {
                        HStack {
                            Text(model.language.text("API Key 已安全保存在 macOS 钥匙串", "API key is secured in macOS Keychain"))
                                .foregroundStyle(UsageTheme.secondary)
                                .usageMonospaced(10)
                            Spacer()
                            Button(model.language.text("移除", "Remove")) {
                                model.removeDeepSeekKey()
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(Color.orange.opacity(0.9))
                            .usageMonospaced(11, weight: .medium)
                        }
                    } else {
                        HStack(spacing: 8) {
                            SecureField("sk-••••••••", text: $model.deepSeekKeyDraft)
                                .textFieldStyle(.plain)
                                .foregroundStyle(UsageTheme.text)
                                .usageMonospaced(12)
                                .padding(.horizontal, 11)
                                .frame(height: 34)
                                .background(UsageTheme.control, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                                .overlay {
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .stroke(UsageTheme.controlBorder, lineWidth: 1)
                                }
                                .onSubmit { model.saveDeepSeekKey() }

                            Button {
                                model.pasteDeepSeekKey()
                            } label: {
                                Image(systemName: "doc.on.clipboard")
                                    .frame(width: 34, height: 34)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(UsageTheme.secondary)
                            .background(UsageTheme.control, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                            .overlay {
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .stroke(UsageTheme.controlBorder, lineWidth: 1)
                            }
                            .help(model.language.text("从剪贴板粘贴", "Paste from clipboard"))

                            Button(model.language.text("连接", "Connect")) {
                                model.saveDeepSeekKey()
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(UsageTheme.text)
                            .usageMonospaced(11, weight: .semibold)
                            .padding(.horizontal, 12)
                            .frame(height: 34)
                            .background(Color(red: 0.35, green: 0.45, blue: 0.95), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                        }
                    }

                    if let message = model.deepSeekSettingsMessage {
                        Text(message)
                            .foregroundStyle(UsageTheme.secondary)
                            .usageMonospaced(10)
                    }
                }
    }
}

private struct ReminderSettings: View {
    @ObservedObject var model: UsageDashboardModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(model.language.text("提醒与任务状态", "ALERTS & TASK STATUS"))
                .foregroundStyle(UsageTheme.secondary)
                .usageMonospaced(11, weight: .medium)

            ReminderToggle(
                title: model.language.text("额度用完提醒", "Quota exhausted"),
                isOn: $model.notifyUsageExhausted
            )
            ReminderToggle(
                title: model.language.text("额度重置提醒", "Quota reset"),
                isOn: $model.notifyReset
            )
            ReminderToggle(
                title: model.language.text("费用 / 余额提醒", "Cost / balance alert"),
                isOn: $model.notifyCost
            )

            if model.notifyCost {
                HStack {
                    Text(model.language.text("DeepSeek 低余额阈值", "DeepSeek low balance"))
                        .foregroundStyle(UsageTheme.secondary)
                        .usageMonospaced(11)
                    Spacer()
                    Button { model.costAlertThreshold = max(0, model.costAlertThreshold - 5) } label: {
                        Image(systemName: "minus")
                    }
                    Text("¥\(Int(model.costAlertThreshold))")
                        .foregroundStyle(UsageTheme.text)
                        .usageMonospaced(12, weight: .semibold)
                        .frame(minWidth: 38)
                    Button { model.costAlertThreshold += 5 } label: {
                        Image(systemName: "plus")
                    }
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: 8) {
                StatusLegend(color: .red, text: model.language.text("执行中", "Running"))
                StatusLegend(color: .green, text: model.language.text("刚完成", "Completed"))
                StatusLegend(color: .gray, text: model.language.text("待机", "Idle"))
            }
        }
    }
}

private struct ReminderToggle: View {
    let title: String
    @Binding var isOn: Bool

    var body: some View {
        Toggle(title, isOn: $isOn)
            .toggleStyle(.switch)
            .controlSize(.small)
            .tint(Color(red: 0.14, green: 0.78, blue: 0.48))
            .foregroundStyle(UsageTheme.text)
            .usageMonospaced(12)
    }
}

private struct StatusLegend: View {
    let color: Color
    let text: String

    var body: some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 7, height: 7)
            Text(text)
                .foregroundStyle(UsageTheme.secondary)
                .usageMonospaced(9)
        }
    }
}

private struct LanguageSelector: View {
    let selection: AppLanguage
    let onSelect: (AppLanguage) -> Void

    var body: some View {
        HStack(spacing: 3) {
            ForEach(AppLanguage.allCases) { language in
                Button {
                    onSelect(language)
                } label: {
                    Text(language.displayName)
                        .foregroundStyle(selection == language ? UsageTheme.text : UsageTheme.secondary)
                        .usageMonospaced(12, weight: .medium)
                        .frame(maxWidth: .infinity)
                        .frame(height: 34)
                        .background {
                            if selection == language {
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(Color.white.opacity(0.11))
                                    .overlay {
                                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                                    }
                            }
                        }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(UsageTheme.control, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(UsageTheme.controlBorder, lineWidth: 1)
        }
    }
}

private struct SourceRow: View {
    let icon: String
    let title: String
    let detail: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(UsageTheme.secondary)
                .frame(width: 20)
            Text(title)
                .foregroundStyle(UsageTheme.text)
                .usageMonospaced(13, weight: .medium)
            Spacer()
            Text(detail)
                .foregroundStyle(UsageTheme.secondary)
                .usageMonospaced(11)
        }
    }
}
