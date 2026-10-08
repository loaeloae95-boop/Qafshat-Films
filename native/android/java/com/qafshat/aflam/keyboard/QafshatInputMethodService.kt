package com.qafshat.aflam.keyboard

import android.inputmethodservice.InputMethodService
import android.net.Uri
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.EditText
import android.widget.Toast
import androidx.core.view.inputmethod.EditorInfoCompat
import androidx.core.view.inputmethod.InputConnectionCompat
import androidx.core.view.inputmethod.InputContentInfoCompat
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.qafshat.aflam.R
import com.qafshat.aflam.stickers.Sticker
import com.qafshat.aflam.stickers.StickerContentProvider
import com.qafshat.aflam.stickers.StickerRepository

/**
 * لوحة مفاتيح «قفشات أفلام»: شريط بحث + شبكة مقاطع MP4،
 * والضغط على مقطع يُدرجه مباشرة في واتساب/ماسنجر عبر commitContent.
 */
class QafshatInputMethodService : InputMethodService() {

    private lateinit var adapter: StickerAdapter

    override fun onCreateInputView(): View {
        val root = layoutInflater.inflate(R.layout.keyboard_view, null)
        val search = root.findViewById<EditText>(R.id.search_input)
        val grid = root.findViewById<RecyclerView>(R.id.sticker_grid)

        adapter = StickerAdapter(StickerRepository.all(this)) { commitSticker(it) }
        grid.layoutManager = GridLayoutManager(this, 3)
        grid.adapter = adapter

        search.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {
                adapter.submit(StickerRepository.search(this@QafshatInputMethodService, s?.toString().orEmpty()))
            }
            override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) = Unit
            override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) = Unit
        })

        return root
    }

    private fun commitSticker(sticker: Sticker) {
        val editorInfo = currentInputEditorInfo ?: return
        val ic = currentInputConnection ?: return

        val supported = EditorInfoCompat.getContentMimeTypes(editorInfo)
        val accepts = supported.any { mime ->
            android.content.ClipDescription.compareMimeTypes(sticker.mimeType, mime)
        }
        if (!accepts) {
            Toast.makeText(this, "هذا التطبيق لا يقبل إدراج المقاطع مباشرة", Toast.LENGTH_SHORT).show()
            return
        }

        val uri: Uri = StickerContentProvider.assetUri(sticker.id)
        val info = InputContentInfoCompat(
            uri,
            android.content.ClipDescription(sticker.title, arrayOf(sticker.mimeType)),
            null,
        )

        var flags = 0
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N_MR1) {
            flags = InputConnectionCompat.INPUT_CONTENT_GRANT_READ_URI_PERMISSION
        }
        InputConnectionCompat.commitContent(ic, editorInfo, info, flags, null)
    }
}

class StickerAdapter(
    private var items: List<Sticker>,
    private val onPick: (Sticker) -> Unit,
) : RecyclerView.Adapter<StickerViewHolder>() {

    fun submit(next: List<Sticker>) {
        items = next
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): StickerViewHolder {
        val view = android.view.LayoutInflater.from(parent.context)
            .inflate(R.layout.item_sticker, parent, false)
        return StickerViewHolder(view)
    }

    override fun onBindViewHolder(holder: StickerViewHolder, position: Int) {
        val sticker = items[position]
        holder.bind(sticker)
        holder.itemView.setOnClickListener { onPick(sticker) }
    }

    override fun getItemCount(): Int = items.size
}

class StickerViewHolder(view: View) : RecyclerView.ViewHolder(view) {
    private val title: android.widget.TextView = view.findViewById(R.id.sticker_title)
    private val thumb: android.widget.ImageView = view.findViewById(R.id.sticker_thumb)

    fun bind(sticker: Sticker) {
        title.text = sticker.title
        thumb.setImageURI(StickerContentProvider.assetUri(sticker.id))
    }
}
