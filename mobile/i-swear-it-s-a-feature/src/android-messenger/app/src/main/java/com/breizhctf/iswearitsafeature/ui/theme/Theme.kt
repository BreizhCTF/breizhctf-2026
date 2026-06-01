package com.breizhctf.iswearitsafeature.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DiscordColorScheme = darkColorScheme(
    primary = DiscordBlurple,
    secondary = DiscordGreen,
    background = DiscordBackground,
    surface = DiscordSidebar,
    onPrimary = DiscordWhite,
    onSecondary = DiscordWhite,
    onBackground = DiscordText,
    onSurface = DiscordText,
    error = DiscordRed,
)

@Composable
fun BzhMessengerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DiscordColorScheme,
        content = content
    )
}
