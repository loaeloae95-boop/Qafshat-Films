package com.qafshat.aflam.stickers

import android.content.Context
import org.json.JSONArray

/**
 * قائمة القفشات المحلية. المصدر: assets/stickers/index.json
 *
 * صيغة index.json:
 * [
 *   { "id": "1", "title": "ضحكة الحي", "file": "dahkat-alhay.mp4",
 *     "thumb": "dahkat-alhay.webp", "tags": ["كوميدي","ضحك"] }
 * ]
 */
data class Sticker(
    val id: String,
    val title: String,
    val file: String,
    val thumb: String,
    val tags: List<String>,
) {
    val mimeType: String get() = if (file.endsWith(".mp4")) "video/mp4" else "image/webp"
}

object StickerRepository {

    private var cache: List<Sticker>? = null

    fun all(context: Context): List<Sticker> {
        cache?.let { return it }
        val json = context.assets.open("stickers/index.json")
            .bufferedReader().use { it.readText() }
        val arr = JSONArray(json)
        val list = (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            val tagsArr = o.optJSONArray("tags")
            Sticker(
                id = o.getString("id"),
                title = o.getString("title"),
                file = o.getString("file"),
                thumb = o.optString("thumb", o.getString("file")),
                tags = (0 until (tagsArr?.length() ?: 0)).map { tagsArr!!.getString(it) },
            )
        }
        cache = list
        return list
    }

    /** بحث بالعنوان أو الوسوم — يغذي شريط البحث داخل لوحة المفاتيح. */
    fun search(context: Context, query: String): List<Sticker> {
        val q = query.trim()
        if (q.isEmpty()) return all(context)
        return all(context).filter { s ->
            s.title.contains(q, ignoreCase = true) ||
                s.tags.any { it.contains(q, ignoreCase = true) }
        }
    }

    fun byId(context: Context, id: String): Sticker? = all(context).firstOrNull { it.id == id }
}
