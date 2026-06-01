package com.breizhctf.vaultpass

data class VaultEntry(
    val id: Int,
    val title: String,
    val username: String,
    val password: String,
    val url: String,
    val notes: String,
    val category: String
)
