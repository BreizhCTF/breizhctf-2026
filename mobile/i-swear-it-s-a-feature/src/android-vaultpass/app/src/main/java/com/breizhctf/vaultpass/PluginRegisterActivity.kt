package com.breizhctf.vaultpass

import android.app.Activity
import android.os.Bundle
import android.os.Binder
import android.os.Process
import android.util.Log
import dalvik.system.BaseDexClassLoader

class PluginRegisterActivity : Activity() {
    companion object {
        private const val PLUGIN_DIR = "/data/data/com.breizhctf.vaultpass/"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val dexPath = intent?.getStringExtra("dexPath")
        if (dexPath == null) { finish(); return }

        if (Binder.getCallingUid() != Process.myUid()) {
            Log.w("PluginRegister", "Unauthorized caller")
            finish(); return
        }

        if (!dexPath.startsWith(PLUGIN_DIR)) {
            Log.w("PluginRegister", "Path outside plugin dir: $dexPath")
            finish(); return
        }

        try {
            val cl = classLoader as BaseDexClassLoader
            val m = BaseDexClassLoader::class.java
                .getDeclaredMethod("addDexPath", String::class.java)
            m.isAccessible = true
            m.invoke(cl, dexPath)
            Log.i("PluginRegister", "Extended dexpath with $dexPath")
        } catch (t: Throwable) {
            Log.e("PluginRegister", "Failed to extend dexpath", t)
        }

        finish()
    }
}
