package com.breizhctf.vaultpass

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.ImageView
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout

class LockFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_lock, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val passwordInput = view.findViewById<TextInputEditText>(R.id.masterPasswordInput)
        val passwordLayout = view.findViewById<TextInputLayout>(R.id.passwordLayout)
        val unlockButton = view.findViewById<MaterialButton>(R.id.unlockButton)
        val errorText = view.findViewById<TextView>(R.id.errorText)
        val lockIcon = view.findViewById<ImageView>(R.id.lockIcon)

        fun attemptUnlock() {
            val input = passwordInput.text?.toString() ?: ""
            if (input == VaultData.MASTER_PASSWORD) {
                errorText.visibility = View.GONE
                (activity as? MainActivity)?.showVault()
            } else {
                errorText.text = getString(R.string.wrong_password)
                errorText.visibility = View.VISIBLE
                passwordLayout.error = " "
                passwordInput.postDelayed({ passwordLayout.error = null }, 1500)
            }
        }

        unlockButton.setOnClickListener { attemptUnlock() }

        passwordInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                attemptUnlock()
                true
            } else false
        }
    }
}
