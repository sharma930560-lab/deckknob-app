package com.deckknob.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DeckKnobDarkColorScheme = darkColorScheme(
    primary = DeckKnobYellow,
    onPrimary = DeckKnobBlack,
    primaryContainer = DeckKnobDarkCard,
    onPrimaryContainer = DeckKnobYellow,
    secondary = DeckKnobNeonCyan,
    onSecondary = DeckKnobBlack,
    tertiary = DeckKnobNeonPink,
    onTertiary = DeckKnobBlack,
    background = DeckKnobBlack,
    onBackground = DeckKnobTextPrimary,
    surface = DeckKnobDarkCard,
    onSurface = DeckKnobTextPrimary,
    surfaceVariant = DeckKnobSurfaceVariant,
    onSurfaceVariant = DeckKnobTextSecondary,
    outline = DeckKnobDarkCardBorder,
    error = DeckKnobError,
    onError = DeckKnobBlack
)

@Composable
fun DeckKnobTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DeckKnobDarkColorScheme,
        typography = DeckKnobTypography,
        content = content
    )
}
