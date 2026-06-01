package com.breizhctf.trustissues.api

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object ApiClient {
    private val _k0 = byteArrayOf(0x8d.toByte(), 0xde.toByte(), 0x6b.toByte(), 0xbc.toByte(), 0x2c.toByte(), 0x5b.toByte(), 0x23.toByte(), 0x2a.toByte())
    private val _k1 = byteArrayOf(0xe6.toByte(), 0xcf.toByte(), 0xb4.toByte(), 0xf1.toByte(), 0x12.toByte(), 0x78.toByte(), 0xab.toByte(), 0x64.toByte())
    private val _k2 = byteArrayOf(0xe3.toByte(), 0x21.toByte(), 0xfd.toByte(), 0x36.toByte(), 0x6f.toByte(), 0xff.toByte(), 0x37.toByte(), 0xab.toByte())
    private val _k3 = byteArrayOf(0xc8.toByte(), 0x77.toByte(), 0xb2.toByte(), 0xd4.toByte(), 0x8c.toByte(), 0x6e.toByte(), 0xde.toByte(), 0x1d.toByte())

    private val client = OkHttpClient.Builder()
        .connectTimeout(ApiConfig.TIMEOUT_MS, java.util.concurrent.TimeUnit.MILLISECONDS)
        .readTimeout(ApiConfig.TIMEOUT_MS, java.util.concurrent.TimeUnit.MILLISECONDS)
        .build()

    private fun getVerifyKey(): ByteArray = _k0 + _k1 + _k2 + _k3

    private fun computeVerifyToken(token: String, endpoint: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(getVerifyKey(), "HmacSHA256"))
        val data = "$token:$endpoint"
        return mac.doFinal(data.toByteArray()).joinToString("") { "%02x".format(it) }
    }

    private val BASE_URL = ApiConfig.BASE_URL

    fun login(username: String, password: String): LoginResult {
        val json = JSONObject().apply {
            put("username", username)
            put("password", password)
        }
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$BASE_URL/login")
            .post(body)
            .build()

        return try {
            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""
            val responseJson = JSONObject(responseBody)
            if (response.isSuccessful) {
                LoginResult(
                    success = true,
                    token = responseJson.optString("token", ""),
                    message = responseJson.optString("message", "")
                )
            } else {
                LoginResult(success = false, message = responseJson.optString("error", "Login failed"))
            }
        } catch (e: IOException) {
            LoginResult(success = false, message = "Connection error: ${e.message}")
        }
    }

    fun verifyPin(token: String, pin: String): PinResult {
        val json = JSONObject().apply {
            put("pin", pin)
        }
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$BASE_URL/admin/verify-pin")
            .header("Authorization", "Bearer $token")
            .post(body)
            .build()

        return try {
            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""
            val responseJson = JSONObject(responseBody)
            PinResult(
                success = responseJson.optBoolean("success", false),
                error = responseJson.optString("error", "")
            )
        } catch (e: IOException) {
            PinResult(success = false, error = "Connection error: ${e.message}")
        }
    }

    fun getFlag(token: String): String {
        // Only called when PinManager.isVerified() is true
        if (!PinManager.isVerified()) {
            return "PIN verification required"
        }

        val endpoint = "/admin/flag"
        val verifyToken = computeVerifyToken(token, endpoint)

        val request = Request.Builder()
            .url("$BASE_URL$endpoint")
            .header("Authorization", "Bearer $token")
            .header("X-Verify-Token", verifyToken)
            .build()

        return try {
            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""
            val responseJson = JSONObject(responseBody)
            if (response.isSuccessful) {
                responseJson.optString("flag", "No flag returned")
            } else {
                responseJson.optString("error", "Access denied")
            }
        } catch (e: IOException) {
            "Connection error: ${e.message}"
        }
    }

    fun getChallenges(token: String): List<Challenge> {
        val request = Request.Builder()
            .url("$BASE_URL/challenges")
            .header("Authorization", "Bearer $token")
            .build()

        return try {
            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""
            val responseJson = JSONObject(responseBody)
            val arr = responseJson.optJSONArray("challenges") ?: return emptyList()
            (0 until arr.length()).map { i ->
                val obj = arr.getJSONObject(i)
                Challenge(
                    name = obj.getString("name"),
                    category = obj.getString("category"),
                    points = obj.getInt("points"),
                    solved = obj.getBoolean("solved")
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }
}

data class LoginResult(
    val success: Boolean,
    val token: String = "",
    val message: String = ""
)

data class PinResult(
    val success: Boolean,
    val error: String = ""
)

data class Challenge(
    val name: String,
    val category: String,
    val points: Int,
    val solved: Boolean
)
