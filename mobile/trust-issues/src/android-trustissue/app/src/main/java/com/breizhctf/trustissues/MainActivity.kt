package com.breizhctf.trustissues

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.breizhctf.trustissues.api.*
import com.breizhctf.trustissues.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TrustIssuesTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                }
            }
        }
    }
}

@Composable
fun AppNavigation() {
    var currentScreen by remember { mutableStateOf("login") }
    var authToken by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }

    when (currentScreen) {
        "login" -> LoginScreen(
            onLoginSuccess = { token, user ->
                authToken = token
                username = user
                currentScreen = "dashboard"
            }
        )
        "dashboard" -> DashboardScreen(
            token = authToken,
            username = username,
            onLogout = {
                authToken = ""
                PinManager.reset()
                currentScreen = "login"
            }
        )
    }
}

// ==================== LOGIN SCREEN ====================

@Composable
fun LoginScreen(onLoginSuccess: (String, String) -> Unit) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(BzhDarker, BzhBlack, BzhBlack)))
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
                .background(Brush.radialGradient(listOf(BzhPurpleGlow, Color.Transparent), radius = 600f))
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Image(
                painter = painterResource(id = R.drawable.breizhctf_logo),
                contentDescription = "BreizhCTF Logo",
                modifier = Modifier.width(260.dp).padding(bottom = 20.dp)
            )
            Text("FLAG MANAGER", fontSize = 22.sp, fontWeight = FontWeight.Black, color = BzhYellow, letterSpacing = 4.sp)
            Text("trust issues edition", fontSize = 12.sp, color = BzhLightGray, letterSpacing = 2.sp, fontFamily = FontFamily.Monospace, modifier = Modifier.padding(bottom = 40.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = BzhCard),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, BzhCardBorder)
            ) {
                Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    OutlinedTextField(
                        value = username, onValueChange = { username = it },
                        label = { Text("Username", color = BzhLightGray) }, singleLine = true,
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BzhPurple, unfocusedBorderColor = BzhGray, focusedLabelColor = BzhPurple, cursorColor = BzhPurple, focusedTextColor = BzhWhite, unfocusedTextColor = BzhWhite),
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = password, onValueChange = { password = it },
                        label = { Text("Password", color = BzhLightGray) }, singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 20.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BzhPurple, unfocusedBorderColor = BzhGray, focusedLabelColor = BzhPurple, cursorColor = BzhPurple, focusedTextColor = BzhWhite, unfocusedTextColor = BzhWhite),
                        shape = RoundedCornerShape(12.dp)
                    )
                    AnimatedVisibility(visible = errorMessage.isNotEmpty()) {
                        Surface(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp), color = BzhError.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)) {
                            Text(errorMessage, color = BzhError, fontSize = 13.sp, modifier = Modifier.padding(12.dp), textAlign = TextAlign.Center)
                        }
                    }
                    Button(
                        onClick = {
                            if (username.isBlank() || password.isBlank()) { errorMessage = "Please fill in all fields"; return@Button }
                            isLoading = true; errorMessage = ""
                            scope.launch {
                                val result = withContext(Dispatchers.IO) { ApiClient.login(username, password) }
                                isLoading = false
                                if (result.success) onLoginSuccess(result.token, username) else errorMessage = result.message
                            }
                        },
                        enabled = !isLoading, modifier = Modifier.fillMaxWidth().height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = BzhPurple, contentColor = BzhWhite),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (isLoading) CircularProgressIndicator(modifier = Modifier.size(22.dp), color = BzhWhite, strokeWidth = 2.dp)
                        else Text("SIGN IN", fontSize = 15.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    }
                }
            }
        }
    }
}

// ==================== DASHBOARD SCREEN ====================

@Composable
fun DashboardScreen(token: String, username: String, onLogout: () -> Unit) {
    var challenges by remember { mutableStateOf<List<Challenge>>(emptyList()) }
    var showPinDialog by remember { mutableStateOf(false) }
    var flagResult by remember { mutableStateOf("") }
    var isLoadingFlag by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(token) {
        challenges = withContext(Dispatchers.IO) { ApiClient.getChallenges(token) }
    }

    val solvedCount = challenges.count { it.solved }
    val totalPoints = challenges.filter { it.solved }.sumOf { it.points }

    Box(modifier = Modifier.fillMaxSize().background(BzhBlack)) {
        LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
            // Header
            item {
                Box(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.fillMaxWidth().height(200.dp).background(Brush.verticalGradient(listOf(BzhPurple.copy(alpha = 0.25f), BzhPurpleDark.copy(alpha = 0.08f), Color.Transparent))))
                    Column(modifier = Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 20.dp).padding(top = 12.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Image(painter = painterResource(id = R.drawable.breizhctf_logo), contentDescription = "BreizhCTF", modifier = Modifier.width(110.dp))
                            TextButton(onClick = onLogout) { Text("Logout", color = BzhLightGray, fontSize = 12.sp) }
                        }
                        Spacer(modifier = Modifier.height(20.dp))
                        Text("Welcome back,", fontSize = 14.sp, color = BzhLightGray)
                        Text(username, fontSize = 26.sp, fontWeight = FontWeight.Black, color = BzhWhite)
                        Spacer(modifier = Modifier.height(20.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            StatCard("RANK", "#42", BzhYellow, Modifier.weight(1f))
                            StatCard("SOLVED", "$solvedCount/${challenges.size}", BzhGreen, Modifier.weight(1f))
                            StatCard("POINTS", "$totalPoints", BzhPurpleLight, Modifier.weight(1f))
                        }

                        if (challenges.isNotEmpty()) {
                            Column(modifier = Modifier.padding(top = 12.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Progress", fontSize = 11.sp, color = BzhLightGray)
                                    Text("${(solvedCount * 100 / challenges.size)}%", fontSize = 11.sp, color = BzhPurpleLight, fontWeight = FontWeight.Bold)
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                LinearProgressIndicator(
                                    progress = { solvedCount.toFloat() / challenges.size },
                                    modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                                    color = BzhPurple, trackColor = BzhCard
                                )
                            }
                        }
                    }
                }
            }

            // Challenges
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text("CHALLENGES", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BzhLightGray, letterSpacing = 2.sp, modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp))
            }

            items(challenges) { challenge -> ChallengeCard(challenge, Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) }

            // Admin section
            item {
                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = BzhPurple.copy(alpha = 0.2f), thickness = 1.dp, modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(modifier = Modifier.height(16.dp))
                Text("ADMIN", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BzhYellow, letterSpacing = 2.sp, modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp))
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    colors = CardDefaults.cardColors(containerColor = BzhCard),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, BzhPurple.copy(alpha = 0.3f))
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("\uD83D\uDD12", fontSize = 18.sp)
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text("Flag Management", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = BzhWhite)
                                Text("Restricted area — PIN required", fontSize = 11.sp, color = BzhLightGray, fontFamily = FontFamily.Monospace)
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))

                        if (!PinManager.isVerified()) {
                            Button(
                                onClick = { showPinDialog = true },
                                modifier = Modifier.fillMaxWidth().height(46.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BzhPurple),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("ENTER PIN", fontWeight = FontWeight.Bold, letterSpacing = 1.sp, fontSize = 13.sp, color = BzhWhite)
                            }
                        } else {
                            // PIN verified — show flag section
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 12.dp)) {
                                Surface(modifier = Modifier.size(8.dp), shape = CircleShape, color = BzhGreen) {}
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("PIN verified — access granted", fontSize = 12.sp, color = BzhGreen, fontFamily = FontFamily.Monospace)
                            }
                            Button(
                                onClick = {
                                    isLoadingFlag = true; flagResult = ""
                                    scope.launch {
                                        flagResult = withContext(Dispatchers.IO) { ApiClient.getFlag(token) }
                                        isLoadingFlag = false
                                    }
                                },
                                enabled = !isLoadingFlag,
                                modifier = Modifier.fillMaxWidth().height(46.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BzhYellow, contentColor = BzhBlack),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                if (isLoadingFlag) CircularProgressIndicator(modifier = Modifier.size(18.dp), color = BzhBlack, strokeWidth = 2.dp)
                                else Text("GET FLAG", fontWeight = FontWeight.Black, letterSpacing = 1.sp, fontSize = 13.sp)
                            }
                            AnimatedVisibility(visible = flagResult.isNotEmpty(), enter = fadeIn(), exit = fadeOut()) {
                                Surface(
                                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                                    color = BzhBlack, shape = RoundedCornerShape(8.dp),
                                    border = BorderStroke(1.dp, BzhYellow.copy(alpha = 0.3f))
                                ) {
                                    Text(flagResult, modifier = Modifier.padding(16.dp), color = BzhYellow, fontSize = 13.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, textAlign = TextAlign.Center)
                                }
                            }
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        }

        // PIN Dialog
        if (showPinDialog) {
            PinDialog(
                token = token,
                onDismiss = { showPinDialog = false },
                onSuccess = { showPinDialog = false }
            )
        }
    }
}

// ==================== PIN DIALOG ====================

@Composable
fun PinDialog(token: String, onDismiss: () -> Unit, onSuccess: () -> Unit) {
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = BzhDark,
        shape = RoundedCornerShape(20.dp),
        title = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text("\uD83D\uDD10", fontSize = 32.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Admin PIN", fontWeight = FontWeight.Bold, color = BzhWhite, fontSize = 18.sp)
                Text("Enter the admin PIN to continue", color = BzhLightGray, fontSize = 12.sp)
            }
        },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                // PIN dots display
                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), contentAlignment = Alignment.Center) {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        repeat(8) { i ->
                            Surface(
                                modifier = Modifier.size(16.dp), shape = CircleShape,
                                color = if (i < pin.length) BzhPurple else BzhGray.copy(alpha = 0.3f),
                                border = BorderStroke(1.dp, if (i < pin.length) BzhPurple else BzhCardBorder)
                            ) {}
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))

                // Number pad
                val keys = listOf(listOf("1","2","3"), listOf("4","5","6"), listOf("7","8","9"), listOf("","0","⌫"))
                Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                keys.forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(vertical = 4.dp)) {
                        row.forEach { key ->
                            if (key.isEmpty()) {
                                Spacer(modifier = Modifier.size(60.dp))
                            } else {
                                Surface(
                                    modifier = Modifier.size(60.dp).clip(CircleShape).clickable {
                                        if (key == "⌫") { if (pin.isNotEmpty()) pin = pin.dropLast(1) }
                                        else if (pin.length < 8) pin += key
                                    },
                                    shape = CircleShape,
                                    color = BzhCard,
                                    border = BorderStroke(1.dp, BzhCardBorder)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(key, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = BzhWhite)
                                    }
                                }
                            }
                        }
                    }
                }
                }

                AnimatedVisibility(visible = error.isNotEmpty()) {
                    Text(error, color = BzhError, fontSize = 12.sp, modifier = Modifier.padding(top = 12.dp), textAlign = TextAlign.Center)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (pin.length < 8) { error = "PIN too short"; return@Button }
                    isLoading = true; error = ""
                    scope.launch {
                        val result = withContext(Dispatchers.IO) { ApiClient.verifyPin(token, pin) }
                        isLoading = false
                        if (result.success) {
                            PinManager.setVerified(true)
                            onSuccess()
                        } else {
                            error = result.error
                            pin = ""
                        }
                    }
                },
                enabled = !isLoading && pin.length >= 8,
                colors = ButtonDefaults.buttonColors(containerColor = BzhPurple),
                shape = RoundedCornerShape(10.dp)
            ) {
                if (isLoading) CircularProgressIndicator(modifier = Modifier.size(18.dp), color = BzhWhite, strokeWidth = 2.dp)
                else Text("VERIFY", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", color = BzhLightGray) }
        }
    )
}

// ==================== COMPONENTS ====================

@Composable
fun StatCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = BzhCard), shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, BzhCardBorder)) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, fontSize = 22.sp, fontWeight = FontWeight.Black, color = color)
            Spacer(modifier = Modifier.height(2.dp))
            Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BzhLightGray, letterSpacing = 1.sp)
        }
    }
}

@Composable
fun ChallengeCard(challenge: Challenge, modifier: Modifier = Modifier) {
    Card(modifier = modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = BzhCard), shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, if (challenge.solved) BzhGreen.copy(alpha = 0.2f) else BzhCardBorder)) {
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                Surface(modifier = Modifier.size(36.dp), shape = RoundedCornerShape(10.dp), color = when (challenge.category) { "Mobile" -> BzhPurple.copy(alpha = 0.15f); "Web" -> BzhYellow.copy(alpha = 0.12f); "Crypto" -> BzhGreen.copy(alpha = 0.12f); "Pwn" -> BzhError.copy(alpha = 0.12f); else -> BzhGray.copy(alpha = 0.3f) }) {
                    Box(contentAlignment = Alignment.Center) { Text(when (challenge.category) { "Mobile" -> "\uD83D\uDCF1"; "Web" -> "\uD83C\uDF10"; "Crypto" -> "\uD83D\uDD10"; "Pwn" -> "\uD83D\uDCA5"; else -> "\uD83C\uDFF4" }, fontSize = 16.sp) }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(challenge.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BzhWhite)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(challenge.category.uppercase(), fontSize = 10.sp, color = BzhLightGray, fontFamily = FontFamily.Monospace, letterSpacing = 1.sp)
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("${challenge.points}", fontSize = 18.sp, fontWeight = FontWeight.Black, color = BzhYellow)
                Text("pts", fontSize = 10.sp, color = BzhYellowDark, fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.width(10.dp))
            Surface(color = if (challenge.solved) BzhGreen.copy(alpha = 0.15f) else Color.Transparent, shape = RoundedCornerShape(6.dp), border = BorderStroke(1.dp, if (challenge.solved) BzhGreen.copy(alpha = 0.4f) else BzhGray.copy(alpha = 0.3f))) {
                Text(if (challenge.solved) "Solved" else "Open", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (challenge.solved) BzhGreen else BzhLightGray)
            }
        }
    }
}
