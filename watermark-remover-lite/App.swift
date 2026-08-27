import AppKit
import ImageIO
import Vision
import UniformTypeIdentifiers

private struct DetectionEngine {
    static func likelyWatermarks(in image: CGImage) throws -> [CGRect] {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        request.recognitionLanguages = ["zh-Hans", "en-US"]
        request.minimumTextHeight = 0.012

        try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
        let observations = request.results ?? []

        var candidates = observations.compactMap { observation -> CGRect? in
            guard let text = observation.topCandidates(1).first, text.confidence >= 0.25 else {
                return nil
            }

            let box = observation.boundingBox
            let nearEdge = box.minX < 0.24 || box.maxX > 0.76 || box.minY < 0.24 || box.maxY > 0.76
            let reasonableSize = box.width * box.height < 0.08 && box.height < 0.18 && box.width < 0.72
            guard nearEdge && reasonableSize else { return nil }
            return box.insetBy(dx: -0.010, dy: -0.010).intersection(CGRect(x: 0, y: 0, width: 1, height: 1))
        }

        var merged: [CGRect] = []
        while let first = candidates.popLast() {
            var combined = first
            var changed = true
            while changed {
                changed = false
                for index in candidates.indices.reversed() {
                    let neighbor = candidates[index]
                    let reach = combined.insetBy(dx: -0.025, dy: -0.018)
                    if reach.intersects(neighbor) {
                        combined = combined.union(neighbor)
                        candidates.remove(at: index)
                        changed = true
                    }
                }
            }
            merged.append(combined.intersection(CGRect(x: 0, y: 0, width: 1, height: 1)))
        }

        return merged.sorted { lhs, rhs in
            if abs(lhs.minY - rhs.minY) > 0.02 { return lhs.minY < rhs.minY }
            return lhs.minX < rhs.minX
        }
    }
}

struct RepairEngine {
    static func repair(image: CGImage, regions: [CGRect]) -> CGImage? {
        guard !regions.isEmpty else { return image }

        let width = image.width
        let height = image.height
        let bytesPerPixel = 4
        let bytesPerRow = width * bytesPerPixel
        var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)

        guard let context = CGContext(
            data: &pixels,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return nil
        }

        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

        // 0 = original, 1 = masked, 2 = repaired.
        var state = [UInt8](repeating: 0, count: width * height)
        let padding = max(3, min(width, height) / 300)

        for region in regions {
            let x0 = max(0, Int(floor(region.minX * CGFloat(width))) - padding)
            let x1 = min(width - 1, Int(ceil(region.maxX * CGFloat(width))) + padding)
            let y0 = max(0, Int(floor((1 - region.maxY) * CGFloat(height))) - padding)
            let y1 = min(height - 1, Int(ceil((1 - region.minY) * CGFloat(height))) + padding)
            guard x0 <= x1 && y0 <= y1 else { continue }

            for y in y0...y1 {
                for x in x0...x1 {
                    state[y * width + x] = 1
                }
            }
        }

        // Approximate Telea fast-marching inpainting: first calculate each
        // masked pixel's distance from intact content, then reconstruct from
        // the boundary inward with distance, direction and image-gradient
        // weights. This preserves gradients and edges instead of smearing the
        // region with an eight-neighbour average.
        let cardinal = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        let unknown = Int.max
        var distance = [Int](repeating: 0, count: width * height)
        var order: [Int] = []
        order.reserveCapacity(state.reduce(0) { $0 + ($1 == 1 ? 1 : 0) })

        for index in state.indices where state[index] == 1 {
            distance[index] = unknown
        }
        for y in 0..<height {
            for x in 0..<width {
                let index = y * width + x
                guard state[index] == 1 else { continue }
                let touchesOriginal = cardinal.contains { dx, dy in
                    let nx = x + dx
                    let ny = y + dy
                    return nx >= 0 && nx < width && ny >= 0 && ny < height && state[ny * width + nx] == 0
                }
                if touchesOriginal {
                    distance[index] = 1
                    order.append(index)
                }
            }
        }

        var scan = 0
        while scan < order.count {
            let index = order[scan]
            scan += 1
            let x = index % width
            let y = index / width
            for (dx, dy) in cardinal {
                let nx = x + dx
                let ny = y + dy
                guard nx >= 0 && nx < width && ny >= 0 && ny < height else { continue }
                let next = ny * width + nx
                if distance[next] == unknown {
                    distance[next] = distance[index] + 1
                    order.append(next)
                }
            }
        }

        func isKnown(_ x: Int, _ y: Int) -> Bool {
            guard x >= 0 && x < width && y >= 0 && y < height else { return false }
            return state[y * width + x] != 1
        }

        func channel(_ x: Int, _ y: Int, _ c: Int) -> Double {
            Double(pixels[(y * width + x) * bytesPerPixel + c])
        }

        let radius = max(6, min(12, min(width, height) / 120))
        for index in order {
            let x = index % width
            let y = index / width
            let d = distance[index]

            let leftD = x > 0 && distance[index - 1] != unknown ? distance[index - 1] : d
            let rightD = x + 1 < width && distance[index + 1] != unknown ? distance[index + 1] : d
            let topD = y > 0 && distance[index - width] != unknown ? distance[index - width] : d
            let bottomD = y + 1 < height && distance[index + width] != unknown ? distance[index + width] : d
            var normalX = Double(rightD - leftD)
            var normalY = Double(bottomD - topD)
            let normalLength = hypot(normalX, normalY)
            if normalLength > 0.0001 {
                normalX /= normalLength
                normalY /= normalLength
            }

            var totals = [Double](repeating: 0, count: 4)
            var totalWeight = 0.0
            for oy in -radius...radius {
                for ox in -radius...radius where ox != 0 || oy != 0 {
                    let qx = x + ox
                    let qy = y + oy
                    guard isKnown(qx, qy) else { continue }
                    let squared = Double(ox * ox + oy * oy)
                    guard squared <= Double(radius * radius) else { continue }

                    let length = sqrt(squared)
                    let direction = max(0.08, abs((Double(ox) * normalX + Double(oy) * normalY) / length))
                    let level = distance[qy * width + qx]
                    let levelWeight = 1.0 / Double(1 + abs(d - level))
                    let weight = direction * levelWeight / squared

                    for c in 0..<4 {
                        let center = channel(qx, qy, c)
                        var gx = 0.0
                        var gy = 0.0
                        if isKnown(qx - 1, qy) && isKnown(qx + 1, qy) {
                            gx = (channel(qx + 1, qy, c) - channel(qx - 1, qy, c)) * 0.5
                        }
                        if isKnown(qx, qy - 1) && isKnown(qx, qy + 1) {
                            gy = (channel(qx, qy + 1, c) - channel(qx, qy - 1, c)) * 0.5
                        }
                        let predicted = center - gx * Double(ox) - gy * Double(oy)
                        totals[c] += min(255, max(0, predicted)) * weight
                    }
                    totalWeight += weight
                }
            }

            guard totalWeight > 0 else { continue }
            let offset = index * bytesPerPixel
            for c in 0..<4 {
                pixels[offset + c] = UInt8(min(255, max(0, Int((totals[c] / totalWeight).rounded()))))
            }
            state[index] = 2
        }

        return context.makeImage()
    }
}

private final class CanvasView: NSView {
    var image: NSImage? { didSet { needsDisplay = true } }
    var regions: [CGRect] = [] { didSet { needsDisplay = true; onRegionsChanged?(regions.count) } }
    var onRegionsChanged: ((Int) -> Void)?
    var onFileDrop: ((URL) -> Void)?
    private var dragStart: NSPoint?
    private var dragCurrent: NSPoint?

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.backgroundColor = NSColor(calibratedWhite: 0.08, alpha: 1).cgColor
        layer?.cornerRadius = 14
        registerForDraggedTypes([.fileURL])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func fittedImageRect() -> CGRect {
        guard let image, image.size.width > 0, image.size.height > 0 else { return .zero }
        let scale = min(bounds.width / image.size.width, bounds.height / image.size.height)
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        return CGRect(
            x: bounds.midX - size.width / 2,
            y: bounds.midY - size.height / 2,
            width: size.width,
            height: size.height
        )
    }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        guard let image else {
            let text = "拖入图片，或点击“选择图片”"
            let attributes: [NSAttributedString.Key: Any] = [
                .font: NSFont.systemFont(ofSize: 18, weight: .medium),
                .foregroundColor: NSColor.secondaryLabelColor
            ]
            let size = text.size(withAttributes: attributes)
            text.draw(
                at: NSPoint(x: bounds.midX - size.width / 2, y: bounds.midY - size.height / 2),
                withAttributes: attributes
            )
            return
        }

        let imageRect = fittedImageRect()
        image.draw(in: imageRect, from: .zero, operation: .sourceOver, fraction: 1)

        NSColor.systemRed.setStroke()
        for region in regions {
            let rect = CGRect(
                x: imageRect.minX + region.minX * imageRect.width,
                y: imageRect.minY + region.minY * imageRect.height,
                width: region.width * imageRect.width,
                height: region.height * imageRect.height
            )
            let path = NSBezierPath(rect: rect)
            path.lineWidth = 2
            path.stroke()
            NSColor.systemRed.withAlphaComponent(0.14).setFill()
            NSBezierPath(rect: rect).fill()
        }

        if let dragStart, let dragCurrent {
            NSColor.systemYellow.setStroke()
            let path = NSBezierPath(rect: CGRect(
                x: min(dragStart.x, dragCurrent.x),
                y: min(dragStart.y, dragCurrent.y),
                width: abs(dragCurrent.x - dragStart.x),
                height: abs(dragCurrent.y - dragStart.y)
            ))
            path.lineWidth = 2
            path.stroke()
        }
    }

    override func mouseDown(with event: NSEvent) {
        guard image != nil else { return }
        let point = convert(event.locationInWindow, from: nil)
        guard fittedImageRect().contains(point) else { return }
        dragStart = point
        dragCurrent = point
        needsDisplay = true
    }

    override func mouseDragged(with event: NSEvent) {
        guard dragStart != nil else { return }
        dragCurrent = convert(event.locationInWindow, from: nil)
        needsDisplay = true
    }

    override func mouseUp(with event: NSEvent) {
        defer {
            dragStart = nil
            dragCurrent = nil
            needsDisplay = true
        }
        guard let start = dragStart else { return }
        let end = convert(event.locationInWindow, from: nil)
        let imageRect = fittedImageRect()
        let selection = CGRect(
            x: min(start.x, end.x),
            y: min(start.y, end.y),
            width: abs(end.x - start.x),
            height: abs(end.y - start.y)
        ).intersection(imageRect)
        guard selection.width >= 4, selection.height >= 4 else { return }

        let normalized = CGRect(
            x: (selection.minX - imageRect.minX) / imageRect.width,
            y: (selection.minY - imageRect.minY) / imageRect.height,
            width: selection.width / imageRect.width,
            height: selection.height / imageRect.height
        )
        regions.append(normalized)
    }

    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
        .copy
    }

    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        guard
            let value = sender.draggingPasteboard.propertyList(forType: .fileURL) as? String,
            let url = URL(string: value)
        else {
            return false
        }
        onFileDrop?(url)
        return true
    }
}

@MainActor
private final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private let canvas = CanvasView()
    private let statusLabel = NSTextField(labelWithString: "请选择一张图片")
    private let regionLabel = NSTextField(labelWithString: "检测区域：0")
    private var sourceURL: URL?
    private var originalImage: CGImage?
    private var processedImage: CGImage?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        buildWindow()
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    private func buildWindow() {
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1040, height: 720),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "轻量去水印"
        window.minSize = NSSize(width: 820, height: 600)
        window.center()

        let root = NSView()
        root.translatesAutoresizingMaskIntoConstraints = false
        window.contentView = root

        let title = NSTextField(labelWithString: "轻量去水印")
        title.font = .systemFont(ofSize: 28, weight: .bold)
        let subtitle = NSTextField(labelWithString: "自动识别边缘文字水印，也可直接在图片上拖动画框")
        subtitle.textColor = .secondaryLabelColor

        let header = NSStackView(views: [title, subtitle])
        header.orientation = .vertical
        header.alignment = .leading
        header.spacing = 4

        let chooseButton = button("选择图片", action: #selector(chooseImage))
        let detectButton = button("自动检测", action: #selector(detectWatermarks))
        let undoButton = button("撤销框选", action: #selector(undoRegion))
        let clearButton = button("清空区域", action: #selector(clearRegions))
        let repairButton = button("去除水印", action: #selector(removeWatermarks))
        repairButton.bezelColor = .controlAccentColor
        let saveButton = button("导出结果", action: #selector(saveResult))

        let toolbar = NSStackView(views: [
            chooseButton, detectButton, undoButton, clearButton, repairButton, saveButton
        ])
        toolbar.orientation = .horizontal
        toolbar.spacing = 10

        regionLabel.textColor = .secondaryLabelColor
        statusLabel.textColor = .secondaryLabelColor
        statusLabel.lineBreakMode = .byTruncatingMiddle

        let footer = NSStackView(views: [regionLabel, NSView(), statusLabel])
        footer.orientation = .horizontal
        footer.spacing = 12

        for view in [header, toolbar, canvas, footer] {
            view.translatesAutoresizingMaskIntoConstraints = false
            root.addSubview(view)
        }

        NSLayoutConstraint.activate([
            header.topAnchor.constraint(equalTo: root.topAnchor, constant: 22),
            header.leadingAnchor.constraint(equalTo: root.leadingAnchor, constant: 24),
            header.trailingAnchor.constraint(lessThanOrEqualTo: root.trailingAnchor, constant: -24),

            toolbar.topAnchor.constraint(equalTo: header.bottomAnchor, constant: 16),
            toolbar.leadingAnchor.constraint(equalTo: root.leadingAnchor, constant: 24),

            canvas.topAnchor.constraint(equalTo: toolbar.bottomAnchor, constant: 16),
            canvas.leadingAnchor.constraint(equalTo: root.leadingAnchor, constant: 24),
            canvas.trailingAnchor.constraint(equalTo: root.trailingAnchor, constant: -24),
            canvas.bottomAnchor.constraint(equalTo: footer.topAnchor, constant: -14),

            footer.leadingAnchor.constraint(equalTo: root.leadingAnchor, constant: 24),
            footer.trailingAnchor.constraint(equalTo: root.trailingAnchor, constant: -24),
            footer.bottomAnchor.constraint(equalTo: root.bottomAnchor, constant: -18),
            footer.heightAnchor.constraint(equalToConstant: 22)
        ])

        canvas.onRegionsChanged = { [weak self] count in
            self?.regionLabel.stringValue = "检测区域：\(count)"
        }
        canvas.onFileDrop = { [weak self] url in
            self?.loadImage(from: url)
        }

        window.makeKeyAndOrderFront(nil)
    }

    private func button(_ title: String, action: Selector) -> NSButton {
        let button = NSButton(title: title, target: self, action: action)
        button.bezelStyle = .rounded
        button.controlSize = .large
        return button
    }

    @objc private func chooseImage() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.image]
        panel.allowsMultipleSelection = false
        guard panel.runModal() == .OK, let url = panel.url else { return }
        loadImage(from: url)
    }

    private func loadImage(from url: URL) {
        guard
            let image = NSImage(contentsOf: url),
            let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
        else {
            statusLabel.stringValue = "无法读取这张图片"
            NSSound.beep()
            return
        }

        sourceURL = url
        originalImage = cgImage
        processedImage = nil
        canvas.image = NSImage(cgImage: cgImage, size: NSSize(width: cgImage.width, height: cgImage.height))
        canvas.regions = []
        statusLabel.stringValue = url.path
    }

    @objc private func detectWatermarks() {
        guard let image = originalImage else {
            statusLabel.stringValue = "请先选择图片"
            NSSound.beep()
            return
        }

        statusLabel.stringValue = "正在用系统 Vision 检测…"
        window.displayIfNeeded()
        do {
            canvas.regions = try DetectionEngine.likelyWatermarks(in: image)
            if canvas.regions.isEmpty {
                statusLabel.stringValue = "没有发现明显的边缘文字水印；可在图片上拖动画框"
            } else {
                statusLabel.stringValue = "已自动标出 \(canvas.regions.count) 个区域，请确认后再去除"
            }
        } catch {
            statusLabel.stringValue = "检测失败：\(error.localizedDescription)"
        }
    }

    @objc private func undoRegion() {
        guard !canvas.regions.isEmpty else { return }
        canvas.regions.removeLast()
    }

    @objc private func clearRegions() {
        canvas.regions = []
    }

    @objc private func removeWatermarks() {
        guard let image = originalImage else {
            statusLabel.stringValue = "请先选择图片"
            return
        }
        guard !canvas.regions.isEmpty else {
            statusLabel.stringValue = "请先自动检测或手动画出水印区域"
            return
        }

        statusLabel.stringValue = "正在修复选中区域…"
        window.displayIfNeeded()
        guard let result = RepairEngine.repair(image: image, regions: canvas.regions) else {
            statusLabel.stringValue = "处理失败"
            return
        }

        processedImage = result
        canvas.image = NSImage(cgImage: result, size: NSSize(width: result.width, height: result.height))
        canvas.regions = []
        statusLabel.stringValue = "处理完成，可以导出结果"
    }

    @objc private func saveResult() {
        guard let result = processedImage else {
            statusLabel.stringValue = "请先完成去除水印"
            return
        }

        let panel = NSSavePanel()
        panel.allowedContentTypes = [.png, .jpeg]
        let baseName = sourceURL?.deletingPathExtension().lastPathComponent ?? "image"
        panel.nameFieldStringValue = "\(baseName)-clean.png"
        guard panel.runModal() == .OK, let url = panel.url else { return }

        let representation = NSBitmapImageRep(cgImage: result)
        let isJPEG = ["jpg", "jpeg"].contains(url.pathExtension.lowercased())
        let data = isJPEG
            ? representation.representation(using: .jpeg, properties: [.compressionFactor: 0.95])
            : representation.representation(using: .png, properties: [:])

        do {
            try data?.write(to: url, options: .atomic)
            statusLabel.stringValue = "已导出：\(url.path)"
        } catch {
            statusLabel.stringValue = "导出失败：\(error.localizedDescription)"
        }
    }
}

@main
private struct WatermarkRemoverApp {
    static func main() {
        if runCommandLineRepairIfRequested() { return }
        let app = NSApplication.shared
        let delegate = AppDelegate()
        app.delegate = delegate
        app.run()
    }

    private static func runCommandLineRepairIfRequested() -> Bool {
        let arguments = CommandLine.arguments
        guard arguments.count == 8, arguments[1] == "--repair" else { return false }
        guard
            let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: arguments[2]) as CFURL, nil),
            let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil),
            let x = Double(arguments[4]),
            let y = Double(arguments[5]),
            let width = Double(arguments[6]),
            let height = Double(arguments[7])
        else {
            print("无法读取测试图片或区域参数")
            return true
        }

        let normalized = CGRect(
            x: x / Double(cgImage.width),
            y: 1 - (y + height) / Double(cgImage.height),
            width: width / Double(cgImage.width),
            height: height / Double(cgImage.height)
        )
        guard let result = RepairEngine.repair(image: cgImage, regions: [normalized]) else {
            print("修复失败")
            return true
        }
        guard let destination = CGImageDestinationCreateWithURL(
            URL(fileURLWithPath: arguments[3]) as CFURL,
            UTType.png.identifier as CFString,
            1,
            nil
        ) else {
            print("无法创建输出文件")
            return true
        }
        CGImageDestinationAddImage(destination, result, nil)
        print(CGImageDestinationFinalize(destination) ? "已输出 \(arguments[3])" : "写入失败")
        return true
    }
}
