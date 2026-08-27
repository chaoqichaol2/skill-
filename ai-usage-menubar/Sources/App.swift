import AppKit
import Combine
import SwiftUI

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSPopoverDelegate {
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let popover = NSPopover()
    private let dashboardModel = UsageDashboardModel()
    private var subscriptions: Set<AnyCancellable> = []
    private var codexRemaining: Int?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        installEditMenu()

        if let button = statusItem.button {
            button.title = "Σ --%"
            button.font = .monospacedSystemFont(ofSize: 12, weight: .semibold)
            if let iconURL = Bundle.main.url(forResource: "AppIcon", withExtension: "icns"),
               let image = NSImage(contentsOf: iconURL) {
                image.size = NSSize(width: 17, height: 17)
                button.image = image
                button.imagePosition = .imageLeading
            }
            button.toolTip = "TokenPulse"
            button.target = self
            button.action = #selector(togglePopover)
            button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }

        popover.behavior = .transient
        popover.animates = true
        popover.delegate = self
        popover.contentSize = NSSize(width: 430, height: 780)
        popover.contentViewController = NSHostingController(rootView: UsageDashboardView(model: dashboardModel))

        dashboardModel.$providers
            .receive(on: RunLoop.main)
            .sink { [weak self] providers in
                guard let self else { return }
                let codex = providers.first { $0.name == "Codex" }
                self.codexRemaining = codex?.metrics.map(\.remainingPercent).min()
                self.updateStatusTitle()
            }
            .store(in: &subscriptions)

        dashboardModel.$taskStatus
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in self?.updateStatusTitle() }
            .store(in: &subscriptions)

        if ProcessInfo.processInfo.environment["AI_USAGE_PREVIEW"] == "1" {
            if ProcessInfo.processInfo.environment["AI_USAGE_SETTINGS"] == "1" {
                dashboardModel.showingSettings = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
                guard let self, let button = self.statusItem.button else { return }
                self.popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
                self.popover.contentViewController?.view.window?.makeKey()
            }
        }
    }

    private func installEditMenu() {
        let mainMenu = NSMenu()
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)
        let appMenu = NSMenu()
        appMenu.addItem(
            withTitle: dashboardModel.language.text("退出 TokenPulse", "Quit TokenPulse"),
            action: #selector(quit),
            keyEquivalent: "q"
        )
        appMenu.items.forEach { $0.target = self }
        appMenuItem.submenu = appMenu

        let editMenuItem = NSMenuItem()
        mainMenu.addItem(editMenuItem)
        let editMenu = NSMenu(title: dashboardModel.language.text("编辑", "Edit"))
        editMenuItem.submenu = editMenu
        editMenu.addItem(withTitle: dashboardModel.language.text("撤销", "Undo"), action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: dashboardModel.language.text("重做", "Redo"), action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(.separator())
        editMenu.addItem(withTitle: dashboardModel.language.text("剪切", "Cut"), action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: dashboardModel.language.text("复制", "Copy"), action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: dashboardModel.language.text("粘贴", "Paste"), action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: dashboardModel.language.text("全选", "Select All"), action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        NSApp.mainMenu = mainMenu
    }

    private func updateStatusTitle() {
        guard let button = statusItem.button else { return }
        let dotColor: NSColor
        switch dashboardModel.taskStatus {
        case .idle: dotColor = .tertiaryLabelColor
        case .running: dotColor = .systemRed
        case .completed: dotColor = .systemGreen
        }

        let title = NSMutableAttributedString(
            string: "● ",
            attributes: [
                .foregroundColor: dotColor,
                .font: NSFont.monospacedSystemFont(ofSize: 11, weight: .bold),
            ]
        )
        title.append(
            NSAttributedString(
                string: codexRemaining.map { "Σ \($0)%" } ?? "Σ --%",
                attributes: [
                    .foregroundColor: NSColor.labelColor,
                    .font: NSFont.monospacedSystemFont(ofSize: 12, weight: .semibold),
                ]
            )
        )
        button.attributedTitle = title
    }

    @objc private func togglePopover() {
        guard let button = statusItem.button else { return }

        if NSApp.currentEvent?.type == .rightMouseUp {
            showContextMenu()
            return
        }

        if popover.isShown {
            popover.performClose(nil)
        } else {
            popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
            popover.contentViewController?.view.window?.makeKey()
        }
    }

    private func showContextMenu() {
        let menu = NSMenu()
        menu.addItem(
            withTitle: dashboardModel.language.text("打开额度面板", "Open Usage Panel"),
            action: #selector(openPopoverFromMenu),
            keyEquivalent: ""
        )
        menu.addItem(.separator())
        menu.addItem(
            withTitle: dashboardModel.language.text("退出 TokenPulse", "Quit TokenPulse"),
            action: #selector(quit),
            keyEquivalent: "q"
        )
        menu.items.forEach { $0.target = self }
        statusItem.menu = menu
        statusItem.button?.performClick(nil)
        statusItem.menu = nil
    }

    @objc private func openPopoverFromMenu() {
        guard let button = statusItem.button else { return }
        popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}

@main
enum AIUsageMonitorApp {
    static func main() {
        let application = NSApplication.shared
        let delegate = AppDelegate()
        application.delegate = delegate
        application.run()
    }
}
