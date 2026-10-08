package com.qafshat.aflam.stickers

import android.content.ContentProvider
import android.content.ContentValues
import android.content.UriMatcher
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import java.io.File
import java.io.FileOutputStream

/**
 * مزوّد المحتوى الذي يقرأ منه Gboard قائمة الملصقات/المقاطع.
 * Authority: com.qafshat.aflam.stickers
 *
 *   content://com.qafshat.aflam.stickers/stickers            → كل القفشات
 *   content://com.qafshat.aflam.stickers/stickers/search/<q>  → بحث
 *   content://com.qafshat.aflam.stickers/asset/<id>           → الملف نفسه (MP4)
 */
class StickerContentProvider : ContentProvider() {

    companion object {
        const val AUTHORITY = "com.qafshat.aflam.stickers"
        private const val CODE_LIST = 1
        private const val CODE_SEARCH = 2
        private const val CODE_ASSET = 3

        val COLUMNS = arrayOf(
            "sticker_id",
            "sticker_name",
            "sticker_uri",
            "sticker_thumb_uri",
            "sticker_mime",
            "sticker_tags",
        )

        fun assetUri(id: String): Uri = Uri.parse("content://$AUTHORITY/asset/$id")
    }

    private val matcher = UriMatcher(UriMatcher.NO_MATCH).apply {
        addURI(AUTHORITY, "stickers", CODE_LIST)
        addURI(AUTHORITY, "stickers/search/*", CODE_SEARCH)
        addURI(AUTHORITY, "asset/*", CODE_ASSET)
    }

    override fun onCreate(): Boolean = true

    override fun query(
        uri: Uri,
        projection: Array<out String>?,
        selection: String?,
        selectionArgs: Array<out String>?,
        sortOrder: String?,
    ): Cursor {
        val ctx = requireNotNull(context)
        val items = when (matcher.match(uri)) {
            CODE_LIST -> StickerRepository.all(ctx)
            CODE_SEARCH -> StickerRepository.search(ctx, uri.lastPathSegment.orEmpty())
            else -> throw IllegalArgumentException("Unsupported uri: $uri")
        }

        val cursor = MatrixCursor(projection ?: COLUMNS)
        items.forEach { s ->
            cursor.addRow(
                arrayOf(
                    s.id,
                    s.title,
                    assetUri(s.id).toString(),
                    assetUri(s.id).toString(),
                    s.mimeType,
                    s.tags.joinToString(","),
                )
            )
        }
        cursor.setNotificationUri(ctx.contentResolver, uri)
        return cursor
    }

    override fun getType(uri: Uri): String = when (matcher.match(uri)) {
        CODE_ASSET -> {
            val id = uri.lastPathSegment.orEmpty()
            context?.let { StickerRepository.byId(it, id)?.mimeType } ?: "video/mp4"
        }
        else -> "vnd.android.cursor.dir/vnd.$AUTHORITY.sticker"
    }

    /** Gboard يفتح الملف من هنا ثم يمرّره لواتساب/ماسنجر عبر commitContent. */
    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor {
        val ctx = requireNotNull(context)
        require(matcher.match(uri) == CODE_ASSET) { "Unsupported uri: $uri" }
        val id = uri.lastPathSegment.orEmpty()
        val sticker = StickerRepository.byId(ctx, id)
            ?: throw IllegalArgumentException("Unknown sticker: $id")

        // ننسخ من assets إلى الكاش مرة واحدة لأن assets غير قابلة للفتح كـ FD مباشر
        val outDir = File(ctx.cacheDir, "stickers").apply { mkdirs() }
        val outFile = File(outDir, sticker.file)
        if (!outFile.exists() || outFile.length() == 0L) {
            ctx.assets.open("stickers/${sticker.file}").use { input ->
                FileOutputStream(outFile).use { output -> input.copyTo(output) }
            }
        }
        return ParcelFileDescriptor.open(outFile, ParcelFileDescriptor.MODE_READ_ONLY)
    }

    override fun insert(uri: Uri, values: ContentValues?): Uri? = null
    override fun update(u: Uri, v: ContentValues?, s: String?, a: Array<out String>?) = 0
    override fun delete(uri: Uri, s: String?, a: Array<out String>?) = 0
}
