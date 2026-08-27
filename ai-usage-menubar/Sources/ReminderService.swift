import Foundation
import UserNotifications

enum ReminderPreferences {
    static func bool(_ key: String, default defaultValue: Bool) -> Bool {
        guard UserDefaults.standard.object(forKey: key) != nil else { return defaultValue }
        return UserDefaults.standard.bool(forKey: key)
    }

    static func double(_ key: String, default defaultValue: Double) -> Double {
        guard UserDefaults.standard.object(forKey: key) != nil else { return defaultValue }
        return UserDefaults.standard.double(forKey: key)
    }

    static func set(_ value: Bool, for key: String) {
        UserDefaults.standard.set(value, forKey: key)
    }

    static func set(_ value: Double, for key: String) {
        UserDefaults.standard.set(value, forKey: key)
    }
}

enum NotificationService {
    static func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    static func send(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request)
    }
}
