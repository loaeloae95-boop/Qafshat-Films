import Foundation

struct Sticker: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let file: String       // اسم ملف MP4 داخل مجلد App Group
    let thumb: String?     // صورة مصغّرة (jpg/webp)
    let tags: [String]

    var fileURL: URL { AppGroup.stickersURL.appendingPathComponent(file) }
    var thumbURL: URL? { thumb.map { AppGroup.stickersURL.appendingPathComponent($0) } }
}

final class StickerStore {

    private(set) var all: [Sticker] = []

    init() { reload() }

    func reload() {
        guard let data = try? Data(contentsOf: AppGroup.indexURL),
              let items = try? JSONDecoder().decode([Sticker].self, from: data)
        else {
            all = []
            return
        }
        all = items
    }

    /// يغذّي شريط البحث داخل لوحة المفاتيح.
    func search(_ query: String) -> [Sticker] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return all }
        return all.filter { s in
            s.title.localizedCaseInsensitiveContains(q)
                || s.tags.contains { $0.localizedCaseInsensitiveContains(q) }
        }
    }
}
