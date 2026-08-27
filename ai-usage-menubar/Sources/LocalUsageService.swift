import Foundation
import SwiftUI

struct DashboardSnapshot {
    let summaries: [UsagePeriod: UsageSummary]
    let providers: [UsageProvider]
    let updatedAt: Date
}

enum LocalUsageError: LocalizedError {
    case noSupportedTools(AppLanguage)

    var errorDescription: String? {
        switch self {
        case let .noSupportedTools(language):
            return language.text(
                "没有找到 Codex、Claude 或 DeepSeek 的使用记录，请先使用对应工具或在设置中连接 DeepSeek。",
                "No Codex, Claude, or DeepSeek usage was found. Use one of the tools or connect DeepSeek in Settings."
            )
        }
    }
}

actor LocalUsageService {
    private struct Totals {
        var day: Int64 = 0
        var month: Int64 = 0
        var total: Int64 = 0
        var providers: [UsageProvider] = []
    }

    func loadSnapshot(language: AppLanguage) async throws -> DashboardSnapshot {
        async let codex = loadCodex(language: language)
        async let claude = loadClaude(language: language)
        async let deepSeek = loadDeepSeek(language: language)

        let (codexResult, claudeResult, deepSeekResult) = await (codex, claude, deepSeek)
        let results = [codexResult, claudeResult, deepSeekResult].compactMap { $0 }
        guard !results.isEmpty else { throw LocalUsageError.noSupportedTools(language) }

        var merged = Totals()
        for result in results {
            merged.day += result.day
            merged.month += result.month
            merged.total += result.total
            merged.providers.append(contentsOf: result.providers)
        }

        return DashboardSnapshot(
            summaries: [
                .day: UsageSummary(tokens: merged.day, cost: nil),
                .month: UsageSummary(tokens: merged.month, cost: nil),
                .total: UsageSummary(tokens: merged.total, cost: nil),
            ],
            providers: merged.providers,
            updatedAt: Date()
        )
    }

    private func loadCodex(language: AppLanguage) -> Totals? {
        let codexHome = resolvedCodexHome()
        let sessionsURL = codexHome.appendingPathComponent("sessions", isDirectory: true)
        guard FileManager.default.fileExists(atPath: sessionsURL.path) else { return nil }

        let files = sessionFiles(in: sessionsURL)
        guard !files.isEmpty else { return nil }

        let calendar = Calendar.current
        let now = Date()
        var dayTotal: Int64 = 0
        var monthTotal: Int64 = 0
        var lifetimeTotal: Int64 = 0
        var newestRateLimit: RateLimitSnapshot?
        var latestEventDate: Date?

        for file in files {
            guard let modified = resourceDate(file, key: .contentModificationDateKey) else { continue }
            let fileTotal = latestCumulativeTokens(in: file)
            lifetimeTotal += fileTotal
            if calendar.isDate(modified, inSameDayAs: now) { dayTotal += fileTotal }
            if calendar.component(.year, from: modified) == calendar.component(.year, from: now),
               calendar.component(.month, from: modified) == calendar.component(.month, from: now) {
                monthTotal += fileTotal
            }

            if latestEventDate == nil || modified > latestEventDate! {
                if let candidate = latestRateLimit(in: file) {
                    newestRateLimit = candidate
                    latestEventDate = modified
                }
            }
        }

        let identity = codexIdentity(from: codexHome.appendingPathComponent("auth.json"))
        let metrics = makeMetrics(from: newestRateLimit, language: language)
        let freshness = latestEventDate.map { relativeUpdateText($0, language: language) }
            ?? language.text("本地数据", "Local data")
        let provider = UsageProvider(
            name: "Codex",
            symbol: "◎",
            plan: identity.plan,
            updatedText: freshness,
            accent: Color(red: 0.27, green: 0.72, blue: 0.75),
            metrics: metrics,
            accountName: identity.email,
            note: metrics.isEmpty
                ? language.text("额度会在下一次 Codex 响应后更新", "Quota will update after the next Codex response.")
                : nil,
            balance: nil
        )
        return Totals(day: dayTotal, month: monthTotal, total: lifetimeTotal, providers: [provider])
    }

    private func loadClaude(language: AppLanguage) -> Totals? {
        let projectsURL = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".claude/projects", isDirectory: true)
        guard FileManager.default.fileExists(atPath: projectsURL.path) else { return nil }

        let files = sessionFiles(in: projectsURL)
        guard !files.isEmpty else { return nil }

        let calendar = Calendar.current
        let now = Date()
        var day: Int64 = 0
        var month: Int64 = 0
        var total: Int64 = 0
        var latest: Date?
        var latestModel: String?

        for file in files {
            guard let modified = resourceDate(file, key: .contentModificationDateKey) else { continue }
            let parsed = claudeTokens(in: file)
            total += parsed.tokens
            if calendar.isDate(modified, inSameDayAs: now) { day += parsed.tokens }
            if calendar.component(.year, from: modified) == calendar.component(.year, from: now),
               calendar.component(.month, from: modified) == calendar.component(.month, from: now) {
                month += parsed.tokens
            }
            if latest == nil || modified > latest! {
                latest = modified
                latestModel = parsed.model
            }
        }

        guard total > 0 else { return nil }
        let provider = UsageProvider(
            name: "Claude CLI",
            symbol: "✳",
            plan: nil,
            updatedText: latest.map { relativeUpdateText($0, language: language) }
                ?? language.text("本地数据", "Local data"),
            accent: Color(red: 0.92, green: 0.48, blue: 0.34),
            metrics: [],
            accountName: nil,
            note: latestModel.map { language.text("最近模型 · \($0)", "Latest model · \($0)") },
            balance: nil
        )
        return Totals(day: day, month: month, total: total, providers: [provider])
    }

    private func loadDeepSeek(language: AppLanguage) async -> Totals? {
        guard let apiKey = DeepSeekKeychain.read(), !apiKey.isEmpty else { return nil }

        do {
            let snapshot = try await DeepSeekService.fetchBalance(apiKey: apiKey)
            let preferred = snapshot.balances.first { $0.currency == "CNY" } ?? snapshot.balances.first
            let amount = preferred.map { money($0.total, currency: $0.currency) }
                ?? language.text("无余额数据", "No balance data")
            let detail = preferred.map {
                language.text(
                    "充值 \(money($0.toppedUp, currency: $0.currency)) · 赠金 \(money($0.granted, currency: $0.currency))",
                    "Top-up \(money($0.toppedUp, currency: $0.currency)) · Grant \(money($0.granted, currency: $0.currency))"
                )
            } ?? language.text("DeepSeek 未返回币种明细", "DeepSeek returned no currency details")
            let note = snapshot.isAvailable
                ? language.text("充值余额不会过期；赠金到期日请在 DeepSeek 账单页查看", "Top-up balance does not expire; check DeepSeek Billing for grant expiry.")
                : language.text("余额不足，需要充值", "Insufficient balance — top up required")
            let provider = UsageProvider(
                name: "DeepSeek API",
                symbol: "◇",
                plan: snapshot.isAvailable ? language.text("可用", "Available") : language.text("需充值", "Top up"),
                updatedText: language.text("刚刚更新", "Updated just now"),
                accent: Color(red: 0.45, green: 0.47, blue: 1.0),
                metrics: [],
                accountName: nil,
                note: note,
                balance: UsageBalance(
                    amountText: amount,
                    detailText: detail,
                    isAvailable: snapshot.isAvailable,
                    amount: preferred.map { NSDecimalNumber(decimal: $0.total).doubleValue },
                    currency: preferred?.currency
                )
            )
            return Totals(providers: [provider])
        } catch {
            let message: String
            if case DeepSeekServiceError.unauthorized = error {
                message = language.text("API Key 无效，请在设置中重新填写", "Invalid API key. Replace it in Settings.")
            } else {
                message = language.text("暂时无法连接 DeepSeek，请稍后刷新", "Could not reach DeepSeek. Refresh later.")
            }
            let provider = UsageProvider(
                name: "DeepSeek API",
                symbol: "◇",
                plan: language.text("连接异常", "Offline"),
                updatedText: language.text("查询失败", "Update failed"),
                accent: Color(red: 0.45, green: 0.47, blue: 1.0),
                metrics: [],
                accountName: nil,
                note: message,
                balance: nil
            )
            return Totals(providers: [provider])
        }
    }

    private func money(_ value: Decimal, currency: String) -> String {
        let number = NSDecimalNumber(decimal: value)
        let symbol = currency == "CNY" ? "¥" : currency == "USD" ? "$" : "\(currency) "
        return symbol + String(format: "%.2f", number.doubleValue)
    }

    private func resolvedCodexHome() -> URL {
        if let override = ProcessInfo.processInfo.environment["CODEX_HOME"], !override.isEmpty {
            return URL(fileURLWithPath: NSString(string: override).expandingTildeInPath, isDirectory: true)
        }
        return FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".codex", isDirectory: true)
    }

    private func sessionFiles(in root: URL) -> [URL] {
        guard let enumerator = FileManager.default.enumerator(
            at: root,
            includingPropertiesForKeys: [.isRegularFileKey, .contentModificationDateKey],
            options: [.skipsHiddenFiles]
        ) else { return [] }

        return enumerator.compactMap { item in
            guard let url = item as? URL, url.pathExtension == "jsonl" else { return nil }
            return url
        }
    }

    private func resourceDate(_ url: URL, key: URLResourceKey) -> Date? {
        try? url.resourceValues(forKeys: [key]).contentModificationDate
    }

    private func latestCumulativeTokens(in url: URL) -> Int64 {
        var lastValue: Int64 = 0
        scanTailLines(in: url) { data in
            guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  object["type"] as? String == "event_msg",
                  let payload = object["payload"] as? [String: Any],
                  payload["type"] as? String == "token_count",
                  let info = payload["info"] as? [String: Any],
                  let usage = info["total_token_usage"] as? [String: Any] else { return }
            lastValue = int64(usage["total_tokens"])
        }
        return lastValue
    }

    private struct RateLimitSnapshot {
        let primary: LimitWindow?
        let secondary: LimitWindow?
    }

    private struct LimitWindow {
        let usedPercent: Double
        let windowMinutes: Int
        let resetsAt: Date?
    }

    private func latestRateLimit(in url: URL) -> RateLimitSnapshot? {
        var snapshot: RateLimitSnapshot?
        scanTailLines(in: url) { data in
            guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  object["type"] as? String == "event_msg",
                  let payload = object["payload"] as? [String: Any],
                  payload["type"] as? String == "token_count",
                  let rateLimits = payload["rate_limits"] as? [String: Any] else { return }
            snapshot = RateLimitSnapshot(
                primary: parseWindow(rateLimits["primary"]),
                secondary: parseWindow(rateLimits["secondary"])
            )
        }
        return snapshot
    }

    private func parseWindow(_ value: Any?) -> LimitWindow? {
        guard let dictionary = value as? [String: Any] else { return nil }
        let used = double(dictionary["used_percent"])
        let minutes = Int(int64(dictionary["window_minutes"]))
        let resetTimestamp = double(dictionary["resets_at"])
        return LimitWindow(
            usedPercent: used,
            windowMinutes: minutes,
            resetsAt: resetTimestamp > 0 ? Date(timeIntervalSince1970: resetTimestamp) : nil
        )
    }

    private func makeMetrics(from snapshot: RateLimitSnapshot?, language: AppLanguage) -> [UsageMetric] {
        guard let snapshot else { return [] }
        let windows = [snapshot.primary, snapshot.secondary].compactMap { $0 }
        return windows.map { window in
            let label = window.windowMinutes <= 300
                ? language.text("会话", "Session")
                : language.text("每周", "Weekly")
            let remaining = max(0, min(100, Int((100 - window.usedPercent).rounded())))
            return UsageMetric(
                label: label,
                remainingPercent: remaining,
                resetText: window.resetsAt.map { resetText($0, language: language) }
                    ?? language.text("暂无重置时间", "Reset unavailable"),
                accent: Color(red: 0.27, green: 0.72, blue: 0.75)
            )
        }
    }

    private func claudeTokens(in url: URL) -> (tokens: Int64, model: String?) {
        var total: Int64 = 0
        var model: String?
        scanLines(in: url) { data in
            guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let message = object["message"] as? [String: Any],
                  let usage = message["usage"] as? [String: Any] else { return }
            model = message["model"] as? String ?? model
            total += int64(usage["input_tokens"])
            total += int64(usage["output_tokens"])
            total += int64(usage["cache_read_input_tokens"])
            total += int64(usage["cache_creation_input_tokens"])
        }
        return (total, model)
    }

    private func scanLines(in url: URL, consume: (Data) -> Void) {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return }
        defer { try? handle.close() }

        var buffer = Data()
        let newlineByte: UInt8 = 0x0A
        while true {
            guard let chunk = try? handle.read(upToCount: 1_048_576), !chunk.isEmpty else { break }
            buffer.append(chunk)
            while let newline = buffer.firstIndex(of: newlineByte) {
                let line = buffer.subdata(in: buffer.startIndex..<newline)
                buffer.removeSubrange(buffer.startIndex...newline)
                if !line.isEmpty { consume(line) }
            }
        }
        if !buffer.isEmpty { consume(buffer) }
    }

    private func scanTailLines(in url: URL, consume: (Data) -> Void) {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return }
        defer { try? handle.close() }

        let size = (try? handle.seekToEnd()) ?? 0
        let tailSize: UInt64 = 4 * 1_048_576
        let start = size > tailSize ? size - tailSize : 0
        try? handle.seek(toOffset: start)
        guard var data = try? handle.readToEnd(), !data.isEmpty else { return }

        if start > 0, let firstNewline = data.firstIndex(of: 0x0A) {
            data.removeSubrange(data.startIndex...firstNewline)
        }

        var lineStart = data.startIndex
        while let newline = data[lineStart...].firstIndex(of: 0x0A) {
            let line = data.subdata(in: lineStart..<newline)
            if !line.isEmpty { consume(line) }
            lineStart = data.index(after: newline)
        }
        if lineStart < data.endIndex {
            consume(data.subdata(in: lineStart..<data.endIndex))
        }
    }

    private func codexIdentity(from url: URL) -> (email: String?, plan: String?) {
        guard let data = try? Data(contentsOf: url),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let tokens = object["tokens"] as? [String: Any],
              let idToken = tokens["id_token"] as? String,
              let payload = decodeJWT(idToken) else { return (nil, nil) }

        let email = payload["email"] as? String
        let auth = payload["https://api.openai.com/auth"] as? [String: Any]
        let plan = (auth?["chatgpt_plan_type"] as? String)?.capitalized
        return (email.map(maskedEmail), plan)
    }

    private func decodeJWT(_ token: String) -> [String: Any]? {
        let parts = token.split(separator: ".")
        guard parts.count > 1 else { return nil }
        var base64 = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        base64 += String(repeating: "=", count: (4 - base64.count % 4) % 4)
        guard let data = Data(base64Encoded: base64) else { return nil }
        return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    }

    private func maskedEmail(_ email: String) -> String {
        guard let at = email.firstIndex(of: "@") else { return email }
        let name = String(email[..<at])
        let domain = String(email[at...])
        return "\(name.prefix(1))***\(name.suffix(1))\(domain)"
    }

    private func int64(_ value: Any?) -> Int64 {
        if let number = value as? NSNumber { return number.int64Value }
        if let string = value as? String { return Int64(string) ?? 0 }
        return 0
    }

    private func double(_ value: Any?) -> Double {
        if let number = value as? NSNumber { return number.doubleValue }
        if let string = value as? String { return Double(string) ?? 0 }
        return 0
    }

    private func resetText(_ date: Date, language: AppLanguage) -> String {
        let interval = date.timeIntervalSinceNow
        if interval <= 0 { return language.text("等待重置", "Reset pending") }
        let hours = Int(interval / 3600)
        let days = hours / 24
        let remainingHours = hours % 24
        if days > 0 {
            return language.text("\(days)天\(remainingHours)小时后重置", "Reset in \(days)d \(remainingHours)h")
        }
        return language.text("\(max(1, hours))小时后重置", "Reset in \(max(1, hours))h")
    }

    private func relativeUpdateText(_ date: Date, language: AppLanguage) -> String {
        let seconds = max(0, Date().timeIntervalSince(date))
        if seconds < 120 { return language.text("刚刚更新", "Updated just now") }
        if seconds < 3600 {
            let value = Int(seconds / 60)
            return language.text("\(value)分钟前更新", "Updated \(value)m ago")
        }
        if seconds < 86_400 {
            let value = Int(seconds / 3600)
            return language.text("\(value)小时前更新", "Updated \(value)h ago")
        }
        let value = Int(seconds / 86_400)
        return language.text("\(value)天前更新", "Updated \(value)d ago")
    }
}
