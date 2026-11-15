package com.deckknob.app.util

import android.util.Log
import com.deckknob.app.BuildConfig
import java.util.regex.Pattern

/**
 * Production-grade centralized logging utility for DECKKNOB Android.
 * Enforces standardized tags, log level gating, and PII/credential sanitization.
 */
object DeckKnobLogger {

    enum class Tag(val rawTag: String) {
        AUTH("DECKKNOB_AUTH"),
        FIRESTORE("DECKKNOB_FIRESTORE"),
        NAV("DECKKNOB_NAV"),
        UI("DECKKNOB_UI"),
        MEDIA("DECKKNOB_MEDIA"),
        PUSH("DECKKNOB_PUSH"),
        NETWORK("DECKKNOB_NETWORK"),
        LIFECYCLE("DECKKNOB_LIFECYCLE"),
        CRASH("DECKKNOB_CRASH"),
        GENERAL("DECKKNOB_APP")
    }

    // Regex patterns for sensitive credential and PII redaction
    private val JWT_PATTERN = Pattern.compile("ey[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}")
    private val OAUTH_TOKEN_PATTERN = Pattern.compile("ya29\\.[0-9A-Za-z_\\-]+")
    private val API_KEY_PATTERN = Pattern.compile("AIza[0-9A-Za-z_\\-]{30,40}")
    private val BEARER_PATTERN = Pattern.compile("(?i)Bearer\\s+[A-Za-z0-9_\\-\\.]+")
    private val PASSWORD_PATTERN = Pattern.compile("(?i)(password|passwd|pwd|secret|credential)\\s*[:=]\\s*[\"']?([^\"',\\s}]+)[\"']?")
    private val EMAIL_PATTERN = Pattern.compile("(?i)[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+")
    private val PRIVATE_KEY_PATTERN = Pattern.compile("-----BEGIN [A-Z ]+KEY-----[\\s\\S]*?-----END [A-Z ]+KEY-----")

    // Visible for testing / configuration
    var isDebugOverride: Boolean? = null

    val isDebugEnabled: Boolean
        get() = isDebugOverride ?: BuildConfig.DEBUG

    /**
     * Sanitize sensitive data such as tokens, passwords, and email addresses.
     * Replaces personal identifiable information with non-reversible redaction markers.
     */
    fun sanitize(message: String?): String {
        if (message == null) return ""
        var sanitized = message

        // Redact Private Keys
        sanitized = PRIVATE_KEY_PATTERN.matcher(sanitized).replaceAll("[REDACTED_PRIVATE_KEY]")

        // Redact JWT tokens
        sanitized = JWT_PATTERN.matcher(sanitized).replaceAll("[REDACTED_JWT]")

        // Redact OAuth access tokens
        sanitized = OAUTH_TOKEN_PATTERN.matcher(sanitized).replaceAll("[REDACTED_OAUTH_TOKEN]")

        // Redact Google API keys
        sanitized = API_KEY_PATTERN.matcher(sanitized).replaceAll("[REDACTED_API_KEY]")

        // Redact Bearer authorization headers
        sanitized = BEARER_PATTERN.matcher(sanitized).replaceAll("Bearer [REDACTED_TOKEN]")

        // Redact password and secret parameters
        sanitized = PASSWORD_PATTERN.matcher(sanitized).replaceAll("$1=[REDACTED_PASSWORD]")

        // Redact email addresses completely (no partial prefix/domain leakage)
        sanitized = EMAIL_PATTERN.matcher(sanitized).replaceAll("[REDACTED_EMAIL]")

        return sanitized
    }

    /**
     * Debug level logging. Only emitted in debug builds.
     */
    fun d(tag: Tag, message: String, throwable: Throwable? = null) {
        d(tag.rawTag, message, throwable)
    }

    fun d(tag: String, message: String, throwable: Throwable? = null) {
        if (!isDebugEnabled) return
        val sanitized = sanitize(message)
        if (throwable != null) {
            Log.d(tag, sanitized, throwable)
        } else {
            Log.d(tag, sanitized)
        }
    }

    /**
     * Info level logging. Significant lifecycle events and milestones.
     */
    fun i(tag: Tag, message: String, throwable: Throwable? = null) {
        i(tag.rawTag, message, throwable)
    }

    fun i(tag: String, message: String, throwable: Throwable? = null) {
        val sanitized = sanitize(message)
        if (throwable != null) {
            Log.i(tag, sanitized, throwable)
        } else {
            Log.i(tag, sanitized)
        }
    }

    /**
     * Warn level logging. Recoverable warnings and fallbacks.
     */
    fun w(tag: Tag, message: String, throwable: Throwable? = null) {
        w(tag.rawTag, message, throwable)
    }

    fun w(tag: String, message: String, throwable: Throwable? = null) {
        val sanitized = sanitize(message)
        if (throwable != null) {
            Log.w(tag, sanitized, throwable)
        } else {
            Log.w(tag, sanitized)
        }
    }

    /**
     * Error level logging. Failures and unexpected exceptions.
     */
    fun e(tag: Tag, message: String, throwable: Throwable? = null) {
        e(tag.rawTag, message, throwable)
    }

    fun e(tag: String, message: String, throwable: Throwable? = null) {
        val sanitized = sanitize(message)
        if (throwable != null) {
            Log.e(tag, sanitized, throwable)
        } else {
            Log.e(tag, sanitized)
        }
    }

    /**
     * Installs a global uncaught exception handler to record crashes under DECKKNOB_CRASH.
     */
    fun installGlobalCrashHandler() {
        val previousHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            val className = throwable?.javaClass?.simpleName ?: "Throwable"
            val message = throwable?.localizedMessage ?: className
            e(
                Tag.CRASH,
                "FATAL UNCAUGHT EXCEPTION on thread '${thread.name}' (id=${thread.id}): $message",
                throwable
            )
            previousHandler?.uncaughtException(thread, throwable)
        }
    }
}

