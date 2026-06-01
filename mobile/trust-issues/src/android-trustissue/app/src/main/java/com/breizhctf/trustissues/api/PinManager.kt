package com.breizhctf.trustissues.api

/**
 * Manages the admin PIN verification state.
 * The PIN is verified server-side, and this manager tracks
 * whether the current session has been authenticated.
 */
object PinManager {
    private var verified = false

    fun isVerified(): Boolean {
        return verified
    }

    fun setVerified(value: Boolean) {
        verified = value
    }

    fun reset() {
        verified = false
    }
}
