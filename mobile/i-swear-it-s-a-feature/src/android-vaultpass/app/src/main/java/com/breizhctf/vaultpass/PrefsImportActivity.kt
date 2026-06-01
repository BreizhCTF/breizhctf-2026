package com.breizhctf.vaultpass

import android.app.Activity
import android.os.Bundle
import android.util.Base64
import android.util.Log
import java.io.ByteArrayInputStream
import java.io.ObjectInputStream

class PrefsImportActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val b64 = intent?.getStringExtra("prefs")
        if (b64 == null) { finish(); return }

        try {
            val blob = Base64.decode(b64, Base64.DEFAULT)
            val ois = ObjectInputStream(ByteArrayInputStream(blob))
            val imported = ois.readObject()
            Log.i("PrefsImport", "Imported prefs: ${imported?.javaClass?.name}")
        } catch (t: Throwable) {
            Log.e("PrefsImport", "Import failed", t)
        } finally {
            finish()
        }
    }
}
