package com.breizhctf.iswearitsafeature.api

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

object ApiClient {
    private val client = OkHttpClient.Builder()
        .connectTimeout(ApiConfig.TIMEOUT_MS, java.util.concurrent.TimeUnit.MILLISECONDS)
        .readTimeout(ApiConfig.TIMEOUT_MS, java.util.concurrent.TimeUnit.MILLISECONDS)
        .build()

    private val BASE = ApiConfig.BASE_URL

    fun login(username: String, password: String): LoginResult {
        val json = JSONObject().apply {
            put("username", username)
            put("password", password)
        }
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder().url("$BASE/api/auth/login").post(body).build()

        return try {
            val response = client.newCall(request).execute()
            val responseJson = JSONObject(response.body?.string() ?: "")
            if (response.isSuccessful) {
                val user = responseJson.getJSONObject("user")
                LoginResult(
                    success = true,
                    token = responseJson.getString("token"),
                    username = user.getString("username"),
                    avatar = user.getString("avatar"),
                    color = user.getString("color"),
                )
            } else {
                LoginResult(success = false, error = responseJson.optString("error", "Login failed"))
            }
        } catch (e: IOException) {
            LoginResult(success = false, error = "Connection error: ${e.message}")
        }
    }

    fun getChannels(token: String): List<Channel> {
        val request = Request.Builder()
            .url("$BASE/api/channels")
            .header("Authorization", "Bearer $token")
            .build()

        return try {
            val response = client.newCall(request).execute()
            val json = JSONObject(response.body?.string() ?: "")
            val arr = json.optJSONArray("channels") ?: return emptyList()
            (0 until arr.length()).map { i ->
                val obj = arr.getJSONObject(i)
                Channel(
                    id = obj.getString("id"),
                    name = obj.getString("name"),
                    topic = obj.optString("topic", ""),
                )
            }
        } catch (e: Exception) { emptyList() }
    }

    fun getMessages(token: String, channelId: String): List<Message> {
        val request = Request.Builder()
            .url("$BASE/api/channels/$channelId/messages")
            .header("Authorization", "Bearer $token")
            .build()

        return try {
            val response = client.newCall(request).execute()
            val json = JSONObject(response.body?.string() ?: "")
            val arr = json.optJSONArray("messages") ?: return emptyList()
            (0 until arr.length()).map { i ->
                val obj = arr.getJSONObject(i)
                Message(
                    id = obj.getString("id"),
                    username = obj.getString("username"),
                    content = obj.getString("content"),
                    createdAt = obj.getDouble("created_at"),
                    attachmentUrl = obj.optJSONObject("attachment")?.optString("url"),
                    attachmentName = obj.optJSONObject("attachment")?.optString("name"),
                )
            }
        } catch (e: Exception) { emptyList() }
    }

    fun sendMessage(token: String, channelId: String, content: String,
                    attachmentHash: String? = null, attachmentName: String? = null): Boolean {
        val json = JSONObject().apply {
            put("content", content)
            if (attachmentHash != null) put("attachment_hash", attachmentHash)
            if (attachmentName != null) put("attachment_name", attachmentName)
        }
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$BASE/api/channels/$channelId/messages")
            .header("Authorization", "Bearer $token")
            .post(body)
            .build()

        return try {
            client.newCall(request).execute().isSuccessful
        } catch (e: Exception) { false }
    }

    fun uploadImage(token: String, fileName: String, fileBytes: ByteArray, mimeType: String): UploadResult {
        val fileBody = fileBytes.toRequestBody(mimeType.toMediaType())
        val multipart = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("file", fileName, fileBody)
            .build()
        val request = Request.Builder()
            .url("$BASE/api/upload")
            .header("Authorization", "Bearer $token")
            .post(multipart)
            .build()

        return try {
            val response = client.newCall(request).execute()
            val json = JSONObject(response.body?.string() ?: "")
            if (response.isSuccessful) {
                UploadResult(success = true, hash = json.getString("hash"), originalName = json.getString("original_name"))
            } else {
                UploadResult(success = false, error = json.optString("error", "Upload failed"))
            }
        } catch (e: Exception) {
            UploadResult(success = false, error = "Upload error: ${e.message}")
        }
    }

    fun getMessageViewUrl(token: String, channelId: String): String {
        return "$BASE/view/channel/$channelId?token=$token"
    }
}

data class LoginResult(
    val success: Boolean,
    val token: String = "",
    val username: String = "",
    val avatar: String = "",
    val color: String = "",
    val error: String = "",
)

data class Channel(
    val id: String,
    val name: String,
    val topic: String,
)

data class Message(
    val id: String,
    val username: String,
    val content: String,
    val createdAt: Double,
    val attachmentUrl: String? = null,
    val attachmentName: String? = null,
)

data class UploadResult(
    val success: Boolean,
    val hash: String = "",
    val originalName: String = "",
    val error: String = "",
)
