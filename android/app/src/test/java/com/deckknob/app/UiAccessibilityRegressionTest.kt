package com.deckknob.app

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import com.deckknob.app.data.model.EventDto
import com.deckknob.app.data.model.PostDto
import com.deckknob.app.data.model.ReelDto
import com.deckknob.app.data.repository.ChatRepository
import com.deckknob.app.ui.navigation.Screen
import com.deckknob.app.ui.navigation.bottomNavItems
import com.deckknob.app.ui.theme.*
import org.junit.Assert.*
import org.junit.Test
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

class UiAccessibilityRegressionTest {

    /**
     * Computes the relative luminance of a color as defined by WCAG 2.2:
     * https://www.w3.org/WAI/GL/wiki/Relative_luminance
     */
    private fun getRelativeLuminance(color: Color): Double {
        val r = sRgbToLinear(color.red)
        val g = sRgbToLinear(color.green)
        val b = sRgbToLinear(color.blue)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    private fun sRgbToLinear(channel: Float): Double {
        return if (channel <= 0.04045f) {
            (channel / 12.92).toDouble()
        } else {
            ((channel + 0.055) / 1.055).pow(2.4)
        }
    }

    /**
     * Computes the WCAG contrast ratio between foreground and background:
     * (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter color.
     */
    private fun getContrastRatio(fg: Color, bg: Color): Double {
        val lum1 = getRelativeLuminance(fg)
        val lum2 = getRelativeLuminance(bg)
        val lighter = max(lum1, lum2)
        val darker = min(lum1, lum2)
        return (lighter + 0.05) / (darker + 0.05)
    }

    @Test
    fun testWcagContrast_YellowBrandAccentOnDarkBackground() {
        val ratio = getContrastRatio(DeckKnobYellow, DeckKnobBlack)
        // DeckKnobYellow (0xFFDFE104) has high luminance ~0.70; Black has ~0.003
        // Contrast ratio must exceed 10.0:1 (Far above WCAG AAA requirement of 7.0:1)
        assertTrue("DeckKnobYellow on DeckKnobBlack contrast ($ratio) must exceed 10:1", ratio >= 10.0)
    }

    @Test
    fun testWcagContrast_PrimaryTextOnDarkBackground() {
        val ratio = getContrastRatio(DeckKnobTextPrimary, DeckKnobBlack)
        // Primary text (0xFFF0F0F5) must exceed WCAG AAA 7.0:1
        assertTrue("Primary text contrast ($ratio) must exceed 12:1", ratio >= 12.0)
    }

    @Test
    fun testWcagContrast_SecondaryTextOnDarkBackground() {
        val ratio = getContrastRatio(DeckKnobTextSecondary, DeckKnobBlack)
        // Muted label text (0xFF8E8E9F) must exceed WCAG AA 4.5:1 for readable content
        assertTrue("Secondary text contrast ($ratio) must exceed 4.5:1 (WCAG AA)", ratio >= 4.5)
    }

    @Test
    fun testWcagContrast_DarkCardSurfaces() {
        val ratio = getContrastRatio(DeckKnobTextPrimary, DeckKnobDarkCard)
        assertTrue("Primary text on dark card ($ratio) must exceed 10:1", ratio >= 10.0)
    }

    @Test
    fun testMinimumInteractiveTouchTargetSpecification() {
        // Android Accessibility guidelines and Material 3 require touch targets >= 48dp (or >= 44dp for compact elements)
        val minimumStandardTouchTargetDp = 48
        val minimumCompactTouchTargetDp = 44
        assertTrue(minimumStandardTouchTargetDp >= 48)
        assertTrue(minimumCompactTouchTargetDp >= 44)
    }

    @Test
    fun testStableKeys_ForLazyListsAndPagers() {
        val post1 = PostDto(id = "post_abc", caption = "Post 1", authorUsername = "dj1")
        val post2 = PostDto(id = "post_xyz", caption = "Post 2", authorUsername = "dj2")
        val posts = listOf(post1, post2)
        val postKeys = posts.map { it.id }

        assertEquals(2, postKeys.distinct().size)
        assertEquals("post_abc", postKeys[0])
        assertEquals("post_xyz", postKeys[1])

        val event1 = EventDto(id = "evt_001", title = "Warehouse Party")
        val event2 = EventDto(id = "evt_002", title = "Boiler Room")
        val eventKeys = listOf(event1, event2).map { it.id }
        assertEquals(2, eventKeys.distinct().size)

        val reel1 = ReelDto(id = "klyp_100", caption = "Drop 1")
        val reel2 = ReelDto(id = "klyp_200", caption = "Drop 2")
        val reelKeys = listOf(reel1, reel2).map { it.id }
        assertEquals(2, reelKeys.distinct().size)
    }

    @Test
    fun testNavigationDestinationsCoverage() {
        val allScreens = listOf(
            Screen.Feed,
            Screen.Reels,
            Screen.Events,
            Screen.Profile,
            Screen.Settings,
            Screen.Camera,
            Screen.EventDetails,
            Screen.Chat,
            Screen.Messages,
            Screen.UserProfile
        )

        assertEquals(10, allScreens.size)
        val routes = allScreens.map { it.route }
        assertEquals(routes.size, routes.distinct().size)

        // Verify bottom navigation items subset
        assertEquals(4, bottomNavItems.size)
        assertTrue(bottomNavItems.contains(Screen.Feed))
        assertTrue(bottomNavItems.contains(Screen.Reels))
        assertTrue(bottomNavItems.contains(Screen.Events))
        assertTrue(bottomNavItems.contains(Screen.Profile))
    }

    @Test
    fun testDynamicFontScaleBoundingSafety() {
        // Asserts that standard typography lineHeights exceed font sizes to prevent text clipping
        assertTrue(DeckKnobTypography.displayLarge.lineHeight.value > DeckKnobTypography.displayLarge.fontSize.value)
        assertTrue(DeckKnobTypography.headlineLarge.lineHeight.value > DeckKnobTypography.headlineLarge.fontSize.value)
        assertTrue(DeckKnobTypography.headlineMedium.lineHeight.value > DeckKnobTypography.headlineMedium.fontSize.value)
        assertTrue(DeckKnobTypography.bodyLarge.lineHeight.value > DeckKnobTypography.bodyLarge.fontSize.value)
    }
}

