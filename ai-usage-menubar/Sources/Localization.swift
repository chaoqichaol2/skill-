import Foundation

enum AppLanguage: String, CaseIterable, Identifiable, Sendable {
    case chinese = "zh-Hans"
    case english = "en"

    var id: Self { self }
    var displayName: String { self == .chinese ? "中文" : "English" }

    static var saved: AppLanguage {
        guard let value = UserDefaults.standard.string(forKey: "appLanguage"),
              let language = AppLanguage(rawValue: value) else { return .chinese }
        return language
    }

    func text(_ chinese: String, _ english: String) -> String {
        self == .chinese ? chinese : english
    }
}

extension UsagePeriod {
    func title(_ language: AppLanguage) -> String {
        switch self {
        case .day: return language.text("今日", "DAY")
        case .month: return language.text("本月", "MONTH")
        case .total: return language.text("累计", "TOTAL")
        }
    }
}
