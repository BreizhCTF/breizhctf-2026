package com.breizhctf.vaultpass

import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.textfield.TextInputEditText

class VaultFragment : Fragment() {

    private lateinit var adapter: VaultAdapter
    private lateinit var entryCount: TextView

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_vault, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val recyclerView = view.findViewById<RecyclerView>(R.id.recyclerView)
        val searchInput = view.findViewById<TextInputEditText>(R.id.searchInput)
        val lockButton = view.findViewById<ImageView>(R.id.lockButton)
        entryCount = view.findViewById(R.id.entryCount)

        adapter = VaultAdapter(
            entries = VaultData.entries,
            onCopy = { copyPassword(it) },
            onClick = { showDetail(it) }
        )

        recyclerView.layoutManager = LinearLayoutManager(requireContext())
        recyclerView.adapter = adapter
        updateCount(VaultData.entries.size)

        searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val query = s?.toString()?.lowercase() ?: ""
                val filtered = VaultData.entries.filter {
                    it.title.lowercase().contains(query) ||
                    it.username.lowercase().contains(query) ||
                    it.category.lowercase().contains(query)
                }
                adapter.updateList(filtered)
                updateCount(filtered.size)
            }
        })

        lockButton.setOnClickListener {
            (activity as? MainActivity)?.showLock()
        }
    }

    private fun updateCount(count: Int) {
        entryCount.text = getString(R.string.entries_count, count)
    }

    private fun copyPassword(entry: VaultEntry) {
        val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("password", entry.password))
        Toast.makeText(requireContext(), R.string.password_copied, Toast.LENGTH_SHORT).show()
    }

    private fun showDetail(entry: VaultEntry) {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_entry_detail, null)

        dialogView.findViewById<TextView>(R.id.detailTitle).text = entry.title
        dialogView.findViewById<TextView>(R.id.detailUsername).text = entry.username
        dialogView.findViewById<TextView>(R.id.detailPassword).text = entry.password
        dialogView.findViewById<TextView>(R.id.detailUrl).text = entry.url
        dialogView.findViewById<TextView>(R.id.detailNotes).text = entry.notes

        val categoryView = dialogView.findViewById<TextView>(R.id.detailCategory)
        categoryView.text = entry.category
        val catColor = getCategoryColor(entry.category)
        val bg = GradientDrawable().apply {
            setColor(Color.parseColor(catColor) and 0x33FFFFFF)
            cornerRadius = 16f
        }
        categoryView.background = bg
        categoryView.setTextColor(Color.parseColor(catColor))

        dialogView.findViewById<ImageView>(R.id.detailCopyPassword).setOnClickListener {
            copyPassword(entry)
        }

        AlertDialog.Builder(requireContext(), R.style.VaultDialog)
            .setView(dialogView)
            .setPositiveButton("Close", null)
            .show()
    }
}
