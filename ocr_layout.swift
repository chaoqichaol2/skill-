import Foundation
import Vision
import ImageIO
import CoreGraphics

guard CommandLine.arguments.count >= 2 else { exit(2) }
let sourceURL = URL(fileURLWithPath: CommandLine.arguments[1]) as CFURL
guard let imageSource = CGImageSourceCreateWithURL(sourceURL, nil),
      let image = CGImageSourceCreateImageAtIndex(imageSource, 0, nil) else { exit(3) }

let width = image.width
let height = image.height
let tileWidth = 1500
let overlap = 120
var tileX = 0
var seen = Set<String>()

while tileX < width {
    let currentWidth = min(tileWidth, width - tileX)
    let cropRect = CGRect(x: tileX, y: 0, width: currentWidth, height: height)
    guard let crop = image.cropping(to: cropRect) else { break }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["zh-Hans", "en-US"]
    request.usesLanguageCorrection = true
    request.minimumTextHeight = 0.008

    let handler = VNImageRequestHandler(cgImage: crop, orientation: .up, options: [:])
    try handler.perform([request])
    let observations = request.results ?? []

    for observation in observations {
        guard let candidate = observation.topCandidates(1).first else { continue }
        let box = observation.boundingBox
        let x = Double(tileX) + Double(box.minX) * Double(currentWidth)
        let y = (1.0 - Double(box.maxY)) * Double(height)
        let w = Double(box.width) * Double(currentWidth)
        let h = Double(box.height) * Double(height)
        let text = candidate.string.replacingOccurrences(of: "\t", with: " ").replacingOccurrences(of: "\n", with: " ")
        let key = "\(Int(x / 8))|\(Int(y / 8))|\(text)"
        if !seen.contains(key) {
            seen.insert(key)
            print("\(String(format: "%.1f", x))\t\(String(format: "%.1f", y))\t\(String(format: "%.1f", w))\t\(String(format: "%.1f", h))\t\(String(format: "%.3f", candidate.confidence))\t\(text)")
        }
    }

    if tileX + currentWidth >= width { break }
    tileX += tileWidth - overlap
}
