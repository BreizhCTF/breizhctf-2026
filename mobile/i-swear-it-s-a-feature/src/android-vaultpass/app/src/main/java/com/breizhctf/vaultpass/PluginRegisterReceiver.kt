package com.breizhctf.vaultpass

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import dalvik.system.DexClassLoader
import java.io.File

class PluginRegisterReceiver : BroadcastReceiver() {
    companion object {
        private const val PLUGIN_DIR = "/data/data/com.breizhctf.vaultpass/"
        var pluginClassLoader: ClassLoader? = null
    }

    override fun onReceive(context: Context, intent: Intent) {
        val dexPath = intent.getStringExtra("dexPath") ?: return

        if (!dexPath.startsWith(PLUGIN_DIR)) {
            Log.w("PluginRegister", "Path outside plugin dir: $dexPath")
            return
        }

        try {
            val src = File(dexPath)
            val dst = File(context.cacheDir, "plugin_${System.currentTimeMillis()}.jar")
            src.inputStream().use { inp -> dst.outputStream().use { inp.copyTo(it) } }
            dst.setReadOnly()

            pluginClassLoader = DexClassLoader(
                dst.absolutePath,
                context.codeCacheDir.absolutePath,
                null,
                context.classLoader
            )
            Log.i("PluginRegister", "Loaded plugin from $dexPath")
        } catch (t: Throwable) {
            Log.e("PluginRegister", "Failed to load plugin", t)
        }
    }
}
