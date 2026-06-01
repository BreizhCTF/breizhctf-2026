package com.breizhctf.vaultpass

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

fun getCategoryColor(category: String): String = when (category) {
    "Email" -> "#42A5F5"
    "Dev" -> "#7E57C2"
    "Cloud" -> "#FF7043"
    "Network" -> "#26C6DA"
    "Media" -> "#EC407A"
    "Server" -> "#78909C"
    "CTF" -> "#FFCA28"
    else -> "#4CAF50"
}

private fun getCategoryInitial(category: String): String = when (category) {
    "Email" -> "E"
    "Dev" -> "D"
    "Cloud" -> "C"
    "Network" -> "N"
    "Media" -> "M"
    "Server" -> "S"
    "CTF" -> "F"
    else -> "?"
}

class VaultAdapter(
    private var entries: List<VaultEntry>,
    private val onCopy: (VaultEntry) -> Unit,
    private val onClick: (VaultEntry) -> Unit
) : RecyclerView.Adapter<VaultAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val categoryIcon: TextView = view.findViewById(R.id.categoryIcon)
        val title: TextView = view.findViewById(R.id.entryTitle)
        val username: TextView = view.findViewById(R.id.entryUsername)
        val category: TextView = view.findViewById(R.id.entryCategory)
        val copyButton: ImageView = view.findViewById(R.id.copyButton)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_vault_entry, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val entry = entries[position]
        val color = Color.parseColor(getCategoryColor(entry.category))

        holder.title.text = entry.title
        holder.username.text = entry.username
        holder.category.text = entry.category

        val iconBg = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(color and 0x33FFFFFF)
        }
        holder.categoryIcon.background = iconBg
        holder.categoryIcon.text = getCategoryInitial(entry.category)
        holder.categoryIcon.setTextColor(color)

        val catBg = GradientDrawable().apply {
            setColor(color and 0x22FFFFFF)
            cornerRadius = 12f
        }
        holder.category.background = catBg
        holder.category.setTextColor(color)

        holder.copyButton.setOnClickListener { onCopy(entry) }
        holder.itemView.setOnClickListener { onClick(entry) }
    }

    override fun getItemCount() = entries.size

    fun updateList(newEntries: List<VaultEntry>) {
        entries = newEntries
        notifyDataSetChanged()
    }
}
