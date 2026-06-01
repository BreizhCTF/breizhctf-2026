package com.breizhctf.trustissues.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val BreizhColorScheme = darkColorScheme(
    primary = BzhPurple,
    onPrimary = BzhWhite,
    secondary = BzhYellow,
    onSecondary = BzhBlack,
    background = BzhBlack,
    onBackground = BzhWhite,
    surface = BzhDarker,
    onSurface = BzhWhite,
    surfaceVariant = BzhCard,
    onSurfaceVariant = BzhLightGray,
    error = BzhError,
    onError = BzhWhite,
    outline = BzhCardBorder,
)

@Composable
fun TrustIssuesTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = BreizhColorScheme,
        typography = Typography,
        content = content
    )
}
