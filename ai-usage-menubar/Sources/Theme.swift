import SwiftUI

enum UsageTheme {
    static let panel = Color(red: 0.095, green: 0.10, blue: 0.115)
    static let text = Color.white.opacity(0.94)
    static let secondary = Color.white.opacity(0.52)
    static let tertiary = Color.white.opacity(0.32)
    static let line = Color.white.opacity(0.10)
    static let track = Color.white.opacity(0.09)
    static let control = Color.white.opacity(0.075)
    static let controlBorder = Color.white.opacity(0.14)
}

extension View {
    func usageMonospaced(_ size: CGFloat, weight: Font.Weight = .regular) -> some View {
        font(.system(size: size, weight: weight, design: .monospaced))
    }
}
