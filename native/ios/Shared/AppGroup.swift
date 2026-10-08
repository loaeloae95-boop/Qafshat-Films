import Foundation

/// مساحة مشتركة بين التطبيق ولوحة المفاتيح.
/// يجب تفعيل App Groups بنفس المعرّف على الهدفين.
enum AppGroup {
    static let identifier = "group.com.qafshat.aflam"

    static var containerURL: URL {
        FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: identifier)!
    }

    /// مجلد مقاطع MP4 التي يحفظها التطبيق الرئيسي لتقرأها لوحة المفاتيح.
    static var stickersURL: URL {
        let url = containerURL.appendingPathComponent("stickers", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    static var indexURL: URL { stickersURL.appendingPathComponent("index.json") }
}
