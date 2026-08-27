import Foundation

actor CodexTaskMonitor {
    func currentStatus() -> CodexTaskStatus {
        let root = resolvedCodexHome().appendingPathComponent("sessions", isDirectory: true)
        guard let latest = newestSessionFile(in: root) else { return .idle }

        var lastStarted: Date?
        var lastCompleted: Date?
        scanTailLines(in: latest) { data in
            guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  object["type"] as? String == "event_msg",
                  let payload = object["payload"] as? [String: Any],
                  let event = payload["type"] as? String,
                  let timestamp = object["timestamp"] as? String,
                  let date = ISO8601DateFormatter.codex.date(from: timestamp) else { return }
            if event == "task_started" { lastStarted = date }
            if event == "task_complete" { lastCompleted = date }
        }

        if let started = lastStarted, started > (lastCompleted ?? .distantPast),
           Date().timeIntervalSince(started) < 43_200 {
            return .running(started)
        }
        if let completed = lastCompleted, Date().timeIntervalSince(completed) < 60 {
            return .completed(completed)
        }
        return .idle
    }

    private func resolvedCodexHome() -> URL {
        if let override = ProcessInfo.processInfo.environment["CODEX_HOME"], !override.isEmpty {
            return URL(fileURLWithPath: NSString(string: override).expandingTildeInPath, isDirectory: true)
        }
        return FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".codex", isDirectory: true)
    }

    private func newestSessionFile(in root: URL) -> URL? {
        guard let enumerator = FileManager.default.enumerator(
            at: root,
            includingPropertiesForKeys: [.isRegularFileKey, .contentModificationDateKey],
            options: [.skipsHiddenFiles]
        ) else { return nil }

        var newest: (url: URL, date: Date)?
        for case let url as URL in enumerator where url.pathExtension == "jsonl" {
            guard let date = try? url.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate else { continue }
            if newest == nil || date > newest!.date { newest = (url, date) }
        }
        return newest?.url
    }

    private func scanTailLines(in url: URL, consume: (Data) -> Void) {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return }
        defer { try? handle.close() }
        let size = (try? handle.seekToEnd()) ?? 0
        let tailSize: UInt64 = 1_048_576
        let start = size > tailSize ? size - tailSize : 0
        try? handle.seek(toOffset: start)
        guard var data = try? handle.readToEnd(), !data.isEmpty else { return }
        if start > 0, let newline = data.firstIndex(of: 0x0A) {
            data.removeSubrange(data.startIndex...newline)
        }
        for line in data.split(separator: 0x0A) where !line.isEmpty {
            consume(Data(line))
        }
    }
}

private extension ISO8601DateFormatter {
    static let codex: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
