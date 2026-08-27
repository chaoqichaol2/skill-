import AppKit
import Foundation
import SwiftUI

enum UsagePeriod: String, CaseIterable, Identifiable {
    case day = "DAY"
    case month = "MONTH"
    case total = "TOTAL"

    var id: Self { self }
}

struct UsageSummary {
    let tokens: Int64
    let cost: Double?

    var tokenText: String { tokens.formatted(.number.grouping(.automatic)) }
    func costText(language: AppLanguage) -> String {
        guard let cost else { return language.text("本地用量", "Local usage") }
        return cost.formatted(.currency(code: "USD"))
    }
}

struct UsageMetric: Identifiable {
    let id = UUID()
    let label: String
    let remainingPercent: Int
    let resetText: String
    let accent: Color
}

struct UsageBalance {
    let amountText: String
    let detailText: String
    let isAvailable: Bool
    let amount: Double?
    let currency: String?
}

enum CodexTaskStatus: Equatable {
    case idle
    case running(Date)
    case completed(Date)

    var isRunning: Bool {
        if case .running = self { return true }
        return false
    }
}

struct UsageProvider: Identifiable {
    let id = UUID()
    let name: String
    let symbol: String
    let plan: String?
    let updatedText: String
    let accent: Color
    let metrics: [UsageMetric]
    let accountName: String?
    let note: String?
    let balance: UsageBalance?
}

enum DashboardState {
    case loading
    case ready
    case failed(String)
}

@MainActor
final class UsageDashboardModel: ObservableObject {
    @Published var period: UsagePeriod = .day
    @Published var state: DashboardState = .loading
    @Published var summaries: [UsagePeriod: UsageSummary] = [:]
    @Published var providers: [UsageProvider] = []
    @Published var isRefreshing = false
    @Published var showingSettings = false
    @Published var lastUpdated: Date?
    @Published var language: AppLanguage = .saved
    @Published var deepSeekKeyDraft = ""
    @Published var deepSeekKeyConfigured = DeepSeekKeychain.hasKey
    @Published var deepSeekSettingsMessage: String?
    @Published var taskStatus: CodexTaskStatus = .idle
    @Published var notifyUsageExhausted = ReminderPreferences.bool("notifyUsageExhausted", default: true) {
        didSet { ReminderPreferences.set(notifyUsageExhausted, for: "notifyUsageExhausted") }
    }
    @Published var notifyReset = ReminderPreferences.bool("notifyReset", default: true) {
        didSet { ReminderPreferences.set(notifyReset, for: "notifyReset") }
    }
    @Published var notifyCost = ReminderPreferences.bool("notifyCost", default: true) {
        didSet { ReminderPreferences.set(notifyCost, for: "notifyCost") }
    }
    @Published var costAlertThreshold = ReminderPreferences.double("costAlertThreshold", default: 10) {
        didSet { ReminderPreferences.set(costAlertThreshold, for: "costAlertThreshold") }
    }

    private let service = LocalUsageService()
    private let taskMonitor = CodexTaskMonitor()
    private var monitoringTask: Task<Void, Never>?
    private var refreshTimerTask: Task<Void, Never>?
    private var hasLoadedSnapshot = false

    var summary: UsageSummary {
        summaries[period] ?? UsageSummary(tokens: 0, cost: nil)
    }

    func start() {
        guard case .loading = state else { return }
        NotificationService.requestAuthorization()
        refresh()
        monitoringTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { return }
                let status = await taskMonitor.currentStatus()
                updateTaskStatus(status)
                try? await Task.sleep(for: .seconds(5))
            }
        }
        refreshTimerTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(60))
                self?.refresh()
            }
        }
    }

    func refresh() {
        guard !isRefreshing else { return }
        isRefreshing = true

        Task {
            do {
                let snapshot = try await service.loadSnapshot(language: language)
                evaluateReminders(previous: providers, current: snapshot.providers)
                summaries = snapshot.summaries
                providers = snapshot.providers
                lastUpdated = snapshot.updatedAt
                state = .ready
                hasLoadedSnapshot = true
            } catch {
                state = .failed(error.localizedDescription)
            }
            isRefreshing = false
        }
    }

    deinit {
        monitoringTask?.cancel()
        refreshTimerTask?.cancel()
    }

    func setLanguage(_ language: AppLanguage) {
        guard self.language != language else { return }
        self.language = language
        UserDefaults.standard.set(language.rawValue, forKey: "appLanguage")
        refresh()
    }

    func saveDeepSeekKey() {
        let key = deepSeekKeyDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else {
            deepSeekSettingsMessage = language.text("请输入 API Key", "Enter an API key")
            return
        }

        do {
            try DeepSeekKeychain.save(key)
            deepSeekKeyDraft = ""
            deepSeekKeyConfigured = true
            deepSeekSettingsMessage = language.text("已安全保存并开始查询余额", "Saved securely. Checking balance now.")
            refresh()
        } catch {
            deepSeekSettingsMessage = language.text("保存失败，请稍后重试", "Could not save the key. Try again.")
        }
    }

    func pasteDeepSeekKey() {
        guard let value = NSPasteboard.general.string(forType: .string) else {
            deepSeekSettingsMessage = language.text("剪贴板中没有文本", "No text found on the clipboard")
            return
        }
        deepSeekKeyDraft = value.trimmingCharacters(in: .whitespacesAndNewlines)
        deepSeekSettingsMessage = deepSeekKeyDraft.isEmpty
            ? language.text("剪贴板中没有 API Key", "No API key found on the clipboard")
            : language.text("已粘贴，请点击连接", "Pasted. Click Connect to continue.")
    }

    func removeDeepSeekKey() {
        DeepSeekKeychain.delete()
        deepSeekKeyDraft = ""
        deepSeekKeyConfigured = false
        deepSeekSettingsMessage = language.text("API Key 已移除", "API key removed")
        refresh()
    }

    private func updateTaskStatus(_ status: CodexTaskStatus) {
        let previous = taskStatus
        taskStatus = status
        if previous.isRunning, case .completed = status {
            NotificationService.send(
                title: language.text("Codex 任务已完成", "Codex task completed"),
                body: language.text("点击 TokenPulse 查看当前额度与任务状态。", "Open TokenPulse to view usage and task status.")
            )
        }
    }

    private func evaluateReminders(previous: [UsageProvider], current: [UsageProvider]) {
        let previousMetrics = Dictionary(uniqueKeysWithValues: previous.flatMap { provider in
            provider.metrics.map { ("\(provider.name)-\($0.label)", $0.remainingPercent) }
        })

        for provider in current {
            for metric in provider.metrics {
                let key = "\(provider.name)-\(metric.label)"
                let old = previousMetrics[key]
                if notifyUsageExhausted, metric.remainingPercent == 0, old != 0 {
                    NotificationService.send(
                        title: language.text("\(provider.name) 额度已用完", "\(provider.name) quota exhausted"),
                        body: metric.resetText
                    )
                }
                if notifyReset, let old, old == 0, metric.remainingPercent > 0 {
                    NotificationService.send(
                        title: language.text("\(provider.name) 额度已重置", "\(provider.name) quota reset"),
                        body: language.text("当前剩余 \(metric.remainingPercent)%", "\(metric.remainingPercent)% is now available")
                    )
                }
            }
        }

        guard notifyCost,
              let balance = current.first(where: { $0.name == "DeepSeek API" })?.balance,
              let amount = balance.amount else { return }
        let wasLow = ReminderPreferences.bool("deepSeekBalanceWasLow", default: false)
        let isLow = amount <= costAlertThreshold
        if isLow, !wasLow, hasLoadedSnapshot {
            NotificationService.send(
                title: language.text("DeepSeek 余额提醒", "DeepSeek balance alert"),
                body: language.text("余额为 \(balance.amountText)，已低于设定阈值。", "Balance is \(balance.amountText), below your alert threshold.")
            )
        }
        ReminderPreferences.set(isLow, for: "deepSeekBalanceWasLow")
    }
}
