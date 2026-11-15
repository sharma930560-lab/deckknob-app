package com.deckknob.app.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast

object UrlLauncher {

    object Platform {
        const val GENERIC = "generic"
        const val INSTAGRAM = "instagram"
        const val SOUNDCLOUD = "soundcloud"
        const val SPOTIFY = "spotify"
        const val YOUTUBE = "youtube"
        const val TWITTER = "twitter"
    }

    private val ALLOWED_SCHEMES = setOf("http", "https")
    private val REJECTED_SCHEMES = setOf("javascript", "file", "data", "content", "intent", "about")

    /**
     * Normalizes a raw URL or handle into a safe, valid HTTPS/HTTP URL.
     * Supports:
     * - "https://example.com"
     * - "http://example.com"
     * - "www.example.com" -> "https://www.example.com"
     * - "example.com/artist" -> "https://example.com/artist"
     * - "@handle" (with platform context) -> "https://instagram.com/handle"
     */
    fun normalizeUrl(rawInput: String, platformContext: String? = null): String? {
        val trimmed = rawInput.trim()
        if (trimmed.isEmpty()) return null

        val lower = trimmed.lowercase()

        // Check for rejected dangerous schemes
        for (scheme in REJECTED_SCHEMES) {
            if (lower.startsWith("$scheme:")) return null
        }

        // Handle platform handles e.g. "@username" or "username"
        if (platformContext != null && (!trimmed.contains("://") && !trimmed.contains("."))) {
            val handle = trimmed.removePrefix("@").trim()
            if (handle.isEmpty()) return null
            return when (platformContext.lowercase()) {
                "instagram" -> "https://instagram.com/$handle"
                "soundcloud" -> "https://soundcloud.com/$handle"
                "spotify" -> "https://open.spotify.com/artist/$handle"
                "youtube" -> "https://youtube.com/@$handle"
                "twitter", "x" -> "https://x.com/$handle"
                else -> "https://$handle"
            }
        }

        // Standardize protocol
        val withScheme = if (!trimmed.startsWith("http://", ignoreCase = true) &&
            !trimmed.startsWith("https://", ignoreCase = true)
        ) {
            "https://$trimmed"
        } else {
            trimmed
        }

        return try {
            val javaUri = java.net.URI(withScheme)
            val scheme = javaUri.scheme?.lowercase()
            if (scheme in ALLOWED_SCHEMES && !javaUri.host.isNullOrBlank()) {
                withScheme
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Safely opens a normalized URL using Android Intent.
     * Tries app-specific intent if possible, falling back to external browser.
     */
    fun openUrl(context: Context, rawUrl: String, platformContext: String? = null): Boolean {
        val safeUrl = normalizeUrl(rawUrl, platformContext)
        if (safeUrl == null) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.UI, "Blocked opening invalid or unsafe URL: $rawUrl")
            Toast.makeText(context, "Invalid or unsafe link.", Toast.LENGTH_SHORT).show()
            return false
        }

        return try {
            val uri = Uri.parse(safeUrl)
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            DeckKnobLogger.i(DeckKnobLogger.Tag.UI, "Successfully dispatched external URL intent: $safeUrl")
            true
        } catch (e: android.content.ActivityNotFoundException) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.UI, "No browser or app found to open URL: $safeUrl")
            Toast.makeText(context, "No application available to open link.", Toast.LENGTH_SHORT).show()
            false
        } catch (e: Exception) {
            DeckKnobLogger.e(DeckKnobLogger.Tag.UI, "Unexpected error launching URL: ${e.message}", e)
            Toast.makeText(context, "Unable to open link.", Toast.LENGTH_SHORT).show()
            false
        }
    }
}
