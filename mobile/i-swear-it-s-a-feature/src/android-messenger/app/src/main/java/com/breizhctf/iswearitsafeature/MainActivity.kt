package com.breizhctf.iswearitsafeature

import android.annotation.SuppressLint
import android.os.Bundle
import android.provider.OpenableColumns
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.breizhctf.iswearitsafeature.api.*
import com.breizhctf.iswearitsafeature.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            BzhMessengerTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = DiscordBackground) {
                    AppNavigation()
                }
            }
        }
    }
}

@Composable
fun AppNavigation() {
    var currentScreen by remember { mutableStateOf("login") }
    var token by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }

    when (currentScreen) {
        "login" -> LoginScreen(onLoginSuccess = { t, u ->
            token = t; username = u; currentScreen = "main"
        })
        "main" -> MainScreen(token = token, username = username, onLogout = {
            token = ""; currentScreen = "login"
        })
    }
}

// ==================== LOGIN (Discord-like) ====================

@Composable
fun LoginScreen(onLoginSuccess: (String, String) -> Unit) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier.fillMaxSize().background(DiscordDarker),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(32.dp),
            colors = CardDefaults.cardColors(containerColor = DiscordBackground),
            shape = RoundedCornerShape(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Logo
                Surface(
                    modifier = Modifier.size(72.dp),
                    shape = CircleShape,
                    color = DiscordBlurple
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text("B", fontSize = 32.sp, fontWeight = FontWeight.Black, color = DiscordWhite)
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text("Welcome back!", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = DiscordWhite, textAlign = TextAlign.Center)
                Text("We're so excited to see you again!", fontSize = 14.sp, color = DiscordMuted, textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(24.dp))

                // Username
                Text("USERNAME", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = DiscordMuted, letterSpacing = 0.5.sp, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = username, onValueChange = { username = it }, singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = DiscordBlurple, unfocusedBorderColor = DiscordDarker,
                        focusedContainerColor = DiscordDarker, unfocusedContainerColor = DiscordDarker,
                        cursorColor = DiscordWhite, focusedTextColor = DiscordWhite, unfocusedTextColor = DiscordWhite,
                    ),
                    shape = RoundedCornerShape(4.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))

                // Password
                Text("PASSWORD", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = DiscordMuted, letterSpacing = 0.5.sp, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = password, onValueChange = { password = it }, singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = DiscordBlurple, unfocusedBorderColor = DiscordDarker,
                        focusedContainerColor = DiscordDarker, unfocusedContainerColor = DiscordDarker,
                        cursorColor = DiscordWhite, focusedTextColor = DiscordWhite, unfocusedTextColor = DiscordWhite,
                    ),
                    shape = RoundedCornerShape(4.dp)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text("Forgot your password?", fontSize = 13.sp, color = DiscordLink, modifier = Modifier.align(Alignment.Start))

                if (error.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(error, fontSize = 13.sp, color = DiscordRed)
                }

                Spacer(modifier = Modifier.height(20.dp))
                Button(
                    onClick = {
                        if (username.isBlank() || password.isBlank()) { error = "Please fill in all fields"; return@Button }
                        isLoading = true; error = ""
                        scope.launch {
                            val result = withContext(Dispatchers.IO) { ApiClient.login(username, password) }
                            isLoading = false
                            if (result.success) onLoginSuccess(result.token, result.username)
                            else error = result.error
                        }
                    },
                    enabled = !isLoading,
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DiscordBlurple),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    if (isLoading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = DiscordWhite, strokeWidth = 2.dp)
                    else Text("Log In", fontSize = 15.sp, fontWeight = FontWeight.Medium)
                }
                Spacer(modifier = Modifier.height(12.dp))
                Row {
                    Text("Need an account? ", fontSize = 13.sp, color = DiscordMuted)
                    Text("Register", fontSize = 13.sp, color = DiscordLink)
                }
            }
        }
    }
}

// ==================== MAIN SCREEN (Discord layout) ====================

@Composable
fun MainScreen(token: String, username: String, onLogout: () -> Unit) {
    var channels by remember { mutableStateOf<List<Channel>>(emptyList()) }
    var selectedChannel by remember { mutableStateOf("general") }
    var showSidebar by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(token) {
        channels = withContext(Dispatchers.IO) { ApiClient.getChannels(token) }
    }

    Box(modifier = Modifier.fillMaxSize().statusBarsPadding()) {
        // Main content (messages) — always visible, full width
        Column(modifier = Modifier.fillMaxSize().background(DiscordBackground)) {
            // Channel header
            val currentChannel = channels.find { it.id == selectedChannel }
            Row(
                modifier = Modifier.fillMaxWidth().height(48.dp).padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Hamburger menu to open sidebar
                Text(
                    "\u2630", fontSize = 22.sp, color = DiscordMuted,
                    modifier = Modifier.clickable { showSidebar = true }.padding(end = 10.dp)
                )
                Text("#", fontSize = 20.sp, color = DiscordMuted)
                Spacer(modifier = Modifier.width(4.dp))
                Text(currentChannel?.name ?: selectedChannel, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = DiscordWhite)
                if (currentChannel?.topic?.isNotEmpty() == true) {
                    Spacer(modifier = Modifier.width(12.dp))
                    Box(modifier = Modifier.width(1.dp).height(24.dp).background(DiscordDivider))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(currentChannel.topic, fontSize = 13.sp, color = DiscordMuted, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                }
            }
            HorizontalDivider(color = DiscordDarker, thickness = 1.dp)

            // WebView for messages
            MessageWebView(
                token = token,
                channelId = selectedChannel,
                modifier = Modifier.weight(1f).fillMaxWidth()
            )

            // Message input
            MessageInput(token = token, channelId = selectedChannel)
        }

        // Sidebar overlay — shown on top when showSidebar is true
        if (showSidebar) {
            Row(modifier = Modifier.fillMaxSize()) {
            // Sidebar panel
            Row(modifier = Modifier.fillMaxHeight().weight(3f).background(DiscordSidebar)) {
                // Server sidebar (narrow icon bar)
                Column(
                    modifier = Modifier.width(52.dp).fillMaxHeight().background(DiscordDarker).padding(vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Server icon
                    Surface(modifier = Modifier.size(40.dp), shape = RoundedCornerShape(16.dp), color = DiscordBlurple) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("B", fontSize = 20.sp, fontWeight = FontWeight.Black, color = DiscordWhite)
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    HorizontalDivider(modifier = Modifier.width(32.dp), color = DiscordDivider, thickness = 2.dp)
                    Spacer(modifier = Modifier.height(8.dp))
                    // DM icon
                    Surface(modifier = Modifier.size(40.dp), shape = CircleShape, color = DiscordBackground) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("\uD83D\uDCAC", fontSize = 18.sp)
                        }
                    }
                }

                // Channel sidebar
                Column(modifier = Modifier.weight(1f).fillMaxHeight().background(DiscordSidebar)) {
                    // Server header
                    Box(
                        modifier = Modifier.fillMaxWidth().height(48.dp).padding(horizontal = 16.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        Text("BzhMessenger", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = DiscordWhite)
                    }
                    HorizontalDivider(color = DiscordDarker, thickness = 1.dp)

                    // Channel list
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "TEXT CHANNELS",
                        fontSize = 11.sp, fontWeight = FontWeight.Bold, color = DiscordMuted,
                        letterSpacing = 0.5.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                    channels.forEach { channel ->
                        val isSelected = channel.id == selectedChannel
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 6.dp, vertical = 1.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(if (isSelected) DiscordHover else Color.Transparent)
                                .clickable { selectedChannel = channel.id; showSidebar = false }
                                .padding(horizontal = 8.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("#", fontSize = 18.sp, color = if (isSelected) DiscordChannelActive else DiscordChannelText, fontWeight = FontWeight.Normal)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                channel.name, fontSize = 14.sp,
                                color = if (isSelected) DiscordChannelActive else DiscordChannelText,
                                fontWeight = if (isSelected) FontWeight.Medium else FontWeight.Normal,
                                maxLines = 1, overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    // User bar
                    Row(
                        modifier = Modifier.fillMaxWidth().background(DiscordDarker.copy(alpha = 0.6f)).padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(modifier = Modifier.size(28.dp), shape = CircleShape, color = ColorPlayer) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(username.take(1).uppercase(), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = DiscordWhite)
                            }
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(username, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = DiscordWhite, maxLines = 1)
                            Text("Online", fontSize = 11.sp, color = DiscordGreen)
                        }
                        Text(
                            "\uD83D\uDEAA", fontSize = 16.sp,
                            modifier = Modifier.clickable { onLogout() }
                        )
                    }
                }
            }

            // Dim area to the right — tap to close sidebar
            Box(
                modifier = Modifier.fillMaxHeight().weight(1f)
                    .background(Color.Black.copy(alpha = 0.5f))
                    .clickable { showSidebar = false }
            )
            } // end outer Row
        }
    }
}

// ==================== WEBVIEW ====================

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MessageWebView(token: String, channelId: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var webView by remember { mutableStateOf<WebView?>(null) }

    // Reload when channel changes
    LaunchedEffect(channelId) {
        webView?.loadUrl(ApiClient.getMessageViewUrl(token, channelId))
    }

AndroidView(
        factory = {
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.allowFileAccess = false
                settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                webViewClient = WebViewClient()
                webChromeClient = WebChromeClient()

                // Register the JS Bridge
                addJavascriptInterface(ImageBridge(context), "NativeBridge")

                setBackgroundColor(0xFF313338.toInt())
                loadUrl(ApiClient.getMessageViewUrl(token, channelId))
                webView = this
            }
        },
        update = { view -> webView = view },
        modifier = modifier
    )
}

// ==================== MESSAGE INPUT ====================

@Composable
fun MessageInput(token: String, channelId: String) {
    var message by remember { mutableStateOf("") }
    var attachmentHash by remember { mutableStateOf<String?>(null) }
    var attachmentName by remember { mutableStateOf<String?>(null) }
    var isUploading by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            isUploading = true
            scope.launch {
                val result = withContext(Dispatchers.IO) {
                    val bytes = context.contentResolver.openInputStream(uri)?.readBytes() ?: return@withContext UploadResult(false, error = "Cannot read file")
                    val mimeType = context.contentResolver.getType(uri) ?: "image/*"
                    var fileName = "image.jpg"
                    context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                        if (cursor.moveToFirst()) {
                            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                            if (idx >= 0) fileName = cursor.getString(idx)
                        }
                    }
                    ApiClient.uploadImage(token, fileName, bytes, mimeType)
                }
                isUploading = false
                if (result.success) {
                    attachmentHash = result.hash
                    attachmentName = result.originalName
                }
            }
        }
    }

    Column(modifier = Modifier.fillMaxWidth().navigationBarsPadding()) {
        // Attachment preview
        if (attachmentHash != null) {
            Row(
                modifier = Modifier.fillMaxWidth().background(DiscordDarker).padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("\uD83D\uDCCE", fontSize = 14.sp)
                Spacer(modifier = Modifier.width(6.dp))
                Text(attachmentName ?: "file", fontSize = 12.sp, color = DiscordLink, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("\u2715", fontSize = 14.sp, color = DiscordMuted, modifier = Modifier.clickable { attachmentHash = null; attachmentName = null }.padding(4.dp))
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Attachment button
            Surface(
                modifier = Modifier.size(36.dp).clip(CircleShape).clickable { imagePickerLauncher.launch("image/*") },
                shape = CircleShape, color = Color.Transparent
            ) {
                Box(contentAlignment = Alignment.Center) {
                    if (isUploading) CircularProgressIndicator(modifier = Modifier.size(18.dp), color = DiscordBlurple, strokeWidth = 2.dp)
                    else Text("\u2795", fontSize = 16.sp)
                }
            }
            Spacer(modifier = Modifier.width(6.dp))

            // Text input
            OutlinedTextField(
                value = message, onValueChange = { message = it },
                placeholder = { Text("Message #$channelId", color = DiscordMuted, fontSize = 14.sp) },
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color.Transparent, unfocusedBorderColor = Color.Transparent,
                    focusedContainerColor = DiscordInput, unfocusedContainerColor = DiscordInput,
                    cursorColor = DiscordWhite, focusedTextColor = DiscordWhite, unfocusedTextColor = DiscordWhite,
                ),
                shape = RoundedCornerShape(8.dp),
                singleLine = true,
                textStyle = androidx.compose.ui.text.TextStyle(fontSize = 14.sp)
            )
            Spacer(modifier = Modifier.width(6.dp))

            // Send button
            val canSend = message.isNotBlank() || attachmentHash != null
            Surface(
                modifier = Modifier.size(36.dp).clip(CircleShape).clickable {
                    if (canSend) {
                        val msg = message; val hash = attachmentHash; val name = attachmentName
                        message = ""; attachmentHash = null; attachmentName = null
                        scope.launch {
                            withContext(Dispatchers.IO) { ApiClient.sendMessage(token, channelId, msg, hash, name) }
                        }
                    }
                },
                shape = CircleShape, color = if (canSend) DiscordBlurple else Color.Transparent
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text("\u27A4", fontSize = 16.sp, color = if (canSend) DiscordWhite else DiscordMuted)
                }
            }
        }
    }
}
