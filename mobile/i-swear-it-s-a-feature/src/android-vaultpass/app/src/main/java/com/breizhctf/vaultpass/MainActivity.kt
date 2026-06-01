package com.breizhctf.vaultpass

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    var isUnlocked = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        writeSecretFlag()

        if (savedInstanceState == null) {
            showLock()
        }
    }

    private fun writeSecretFlag() {
        val f = java.io.File(filesDir, "secret.key")
        if (!f.exists()) {
            f.writeText("BZHCTF{fake_flag}")
        }
    }

    fun showLock() {
        isUnlocked = false
        supportFragmentManager.beginTransaction()
            .replace(R.id.container, LockFragment())
            .commit()
    }

    fun showVault() {
        isUnlocked = true
        supportFragmentManager.beginTransaction()
            .replace(R.id.container, VaultFragment())
            .commit()
    }
}
