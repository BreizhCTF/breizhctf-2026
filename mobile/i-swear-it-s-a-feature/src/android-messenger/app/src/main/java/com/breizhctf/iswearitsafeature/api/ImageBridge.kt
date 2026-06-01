package com.breizhctf.iswearitsafeature.api

import android.content.Context
import android.webkit.JavascriptInterface
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File

class ImageBridge(private val context: Context) {
    private var initialized = false
    private val client = OkHttpClient()

    @JavascriptInterface
    fun setup() {
        copyAssetsOnce()
        nativeInit(context.filesDir.absolutePath)
        initialized = true
    }

    @JavascriptInterface
    fun processImage(path: String): String {
        if (!initialized) {
            return "Error: Bridge not initialized. Call setup() first."
        }

        val localPath = try {
            val url = if (path.startsWith("http")) path else "${ApiConfig.BASE_URL}$path"
            val request = Request.Builder().url(url).build()
            val response = client.newCall(request).execute()
            val bytes = response.body?.bytes() ?: return "Error: empty response"
            val cacheFile = File(context.cacheDir, "img_${path.hashCode()}")
            cacheFile.writeBytes(bytes)
            cacheFile.absolutePath
        } catch (e: Exception) {
            path
        }

        return nativeProcessImage(localPath)
    }

    private fun copyAssetsOnce() {
        val marker = File(context.filesDir, ".magick_assets_copied")
        if (marker.exists()) return

        copyAssetDir("usr", context.filesDir)
        marker.createNewFile()
    }

    private fun copyAssetDir(assetPath: String, destDir: File) {
        val assets = context.assets.list(assetPath) ?: return
        if (assets.isEmpty()) {
            context.assets.open(assetPath).use { input ->
                File(destDir, assetPath).apply {
                    parentFile?.mkdirs()
                    outputStream().use { input.copyTo(it) }
                }
            }
        } else {
            File(destDir, assetPath).mkdirs()
            for (child in assets) {
                copyAssetDir("$assetPath/$child", destDir)
            }
        }
    }

    private external fun nativeInit(basePath: String)
    private external fun nativeProcessImage(path: String): String

    companion object {
        init {
            System.loadLibrary("imageproc")
        }
    }
}
