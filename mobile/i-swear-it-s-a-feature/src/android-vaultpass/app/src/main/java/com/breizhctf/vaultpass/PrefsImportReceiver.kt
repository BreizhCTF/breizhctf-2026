package com.breizhctf.vaultpass

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Base64
import android.util.Log
import java.io.ByteArrayInputStream
import java.io.ObjectInputStream
import java.io.ObjectStreamClass

class PrefsImportReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val b64 = intent.getStringExtra("prefs") ?: return

        try {
            val blob = Base64.decode(b64, Base64.DEFAULT)
            val cl = PluginRegisterReceiver.pluginClassLoader ?: context.classLoader
            val ois = object : ObjectInputStream(ByteArrayInputStream(blob)) {
                override fun resolveClass(desc: ObjectStreamClass): Class<*> {
                    return Class.forName(desc.name, false, cl)
                }
            }
            val imported = ois.readObject()
            Log.i("PrefsImport", "Imported prefs: ${imported?.javaClass?.name}")
        } catch (t: Throwable) {
            Log.e("PrefsImport", "Import failed", t)
        }
    }
}
