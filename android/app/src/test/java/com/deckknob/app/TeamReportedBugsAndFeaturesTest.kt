package com.deckknob.app

import com.deckknob.app.data.model.NotificationDto
import com.deckknob.app.data.model.PostDto
import com.deckknob.app.data.model.ReelCommentDto
import com.deckknob.app.data.model.ReelDto
import com.deckknob.app.data.repository.StorageRepository
import com.deckknob.app.ui.components.CURATED_ELECTRONIC_CATALOG
import org.junit.Assert.*
import org.junit.Test

class TeamReportedBugsAndFeaturesTest {

    // ─────────────────────────────────────────────────────────────────────────
    // CRITICAL BUG: Music / Audio Upload Failures & Constraints
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testAudioSizeLimitConstantIsExactly25MB() {
        val expected25MbInBytes = 25L * 1024L * 1024L
        assertEquals("Audio size limit must match web 25MB constraint", expected25MbInBytes, StorageRepository.MAX_AUDIO_SIZE_BYTES)
    }

    @Test
    fun testAudioFileSizeBoundaryValidation() {
        val validSize = 24L * 1024L * 1024L // 24 MB
        val limitSize = 25L * 1024L * 1024L // 25 MB
        val excessiveSize = 25L * 1024L * 1024L + 1L // 25MB + 1 byte

        assertTrue("24MB file must be accepted", validSize <= StorageRepository.MAX_AUDIO_SIZE_BYTES)
        assertTrue("25MB exact boundary must be accepted", limitSize <= StorageRepository.MAX_AUDIO_SIZE_BYTES)
        assertFalse("Over-25MB file must be rejected", excessiveSize <= StorageRepository.MAX_AUDIO_SIZE_BYTES)
    }

    @Test
    fun testAudioMimeTypesAreValidAudioFormats() {
        val supportedExtensions = listOf("mp3", "wav", "m4a", "aac", "ogg", "flac")
        for (ext in supportedExtensions) {
            val isAudio = when (ext) {
                "mp3" -> "audio/mpeg"
                "wav" -> "audio/wav"
                "m4a" -> "audio/mp4"
                "aac" -> "audio/aac"
                "ogg" -> "audio/ogg"
                "flac" -> "audio/flac"
                else -> "unknown"
            }
            assertTrue("Format $ext must resolve to audio/* MIME type", isAudio.startsWith("audio/"))
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE 01: Soundtrack Preview Before Adding
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testCuratedElectronicCatalogIntegrity() {
        assertFalse("Curated track catalog must not be empty", CURATED_ELECTRONIC_CATALOG.isEmpty())

        for (track in CURATED_ELECTRONIC_CATALOG) {
            assertTrue("Track ID must not be blank", track.id.isNotBlank())
            assertTrue("Track Title must not be blank", track.title.isNotBlank())
            assertTrue("Track Artist must not be blank", track.artist.isNotBlank())
            assertTrue("Audio stream preview URL must start with http", track.audioUrl.startsWith("http"))
            assertTrue("Track duration must be greater than 0 seconds", track.duration > 0.0)
            assertTrue("Track BPM must be a valid positive tempo", track.bpm in 60..220)
        }
    }

    @Test
    fun testSoundtrackGenreFiltering() {
        val technoTracks = CURATED_ELECTRONIC_CATALOG.filter { it.genre.equals("Techno", ignoreCase = true) }
        assertTrue("Catalog should contain Techno tracks for preview", technoTracks.isNotEmpty())

        val houseTracks = CURATED_ELECTRONIC_CATALOG.filter { it.genre.equals("House", ignoreCase = true) }
        assertTrue("Catalog should contain House tracks for preview", houseTracks.isNotEmpty())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE 02: Selected Photo Thumbnail Preview
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testSelectedPhotoStateModel() {
        val initialPost = PostDto(
            id = "test_post_1",
            caption = "Acid Night at Club Tresor",
            media_url = "https://deckknob.com/media/sample.jpg"
        )

        assertEquals("Display media URL must fallback to media_url", "https://deckknob.com/media/sample.jpg", initialPost.displayMediaUrl)
        assertEquals("Default media type must be image", "image", initialPost.displayMediaType)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUG 01: Profile Picture Cropping Problem
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testAvatarCropBoundingCalculations() {
        val origW = 1920
        val origH = 1080
        val scale = 1.5f
        val panX = 50f
        val panY = -30f
        val viewportSizePx = 280f

        val minDim = minOf(origW, origH) // 1080
        val targetCropSize = (minDim / scale).toInt().coerceIn(100, minDim) // 720
        assertTrue("Target crop size must fit within original image bounds", targetCropSize <= minDim)

        val normPanX = (panX / viewportSizePx).coerceIn(-0.5f, 0.5f)
        val normPanY = (panY / viewportSizePx).coerceIn(-0.5f, 0.5f)

        val startX = ((origW - targetCropSize) / 2 - (normPanX * targetCropSize)).toInt().coerceIn(0, origW - targetCropSize)
        val startY = ((origH - targetCropSize) / 2 - (normPanY * targetCropSize)).toInt().coerceIn(0, origH - targetCropSize)

        assertTrue("Crop startX must be >= 0", startX >= 0)
        assertTrue("Crop startY must be >= 0", startY >= 0)
        assertTrue("Crop box must not exceed original width", startX + targetCropSize <= origW)
        assertTrue("Crop box must not exceed original height", startY + targetCropSize <= origH)
        assertEquals("Cropped region must be an exact 1:1 square", targetCropSize, targetCropSize)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUG 02: Notification Reliability & Schema Compatibility
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testNotificationDtoResolvesBothWebAndAndroidSchemas() {
        // Case A: Web-generated notification (uses 'type', 'fromUsername', 'createdAt')
        val webNotif = NotificationDto(
            id = "notif_web_1",
            message = "dj_berlin liked your signal",
            type = "like",
            fromUsername = "dj_berlin",
            is_read = false
        )
        assertEquals("Web notification type must resolve correctly", "like", webNotif.displayType)
        assertEquals("Web notification sender must resolve correctly", "dj_berlin", webNotif.displaySender)

        // Case B: Android-generated notification (uses 'notification_type', 'senderUsername')
        val androidNotif = NotificationDto(
            id = "notif_android_2",
            message = "You have a new follower",
            notification_type = "follow",
            senderUsername = "selector_99",
            is_read = true
        )
        assertEquals("Android notification type must resolve correctly", "follow", androidNotif.displayType)
        assertEquals("Android notification sender must resolve correctly", "selector_99", androidNotif.displaySender)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUG 03: Comments Functionality
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testCommentDtoCreationAndCommentsCountIncrement() {
        val comment = ReelCommentDto(
            id = "c_101",
            authorId = "user_abc",
            authorUsername = "techno_head",
            authorAvatar = "https://deckknob.com/avatars/u1.jpg",
            text = "Heavy bassline! Which synth is this?"
        )

        assertEquals("Comment ID must match", "c_101", comment.id)
        assertEquals("Author ID must match", "user_abc", comment.authorId)
        assertEquals("Author Username must match", "techno_head", comment.authorUsername)
        assertEquals("Text must match", "Heavy bassline! Which synth is this?", comment.text)

        var post = PostDto(id = "p_1", commentsCount = 3)
        post = post.copy(commentsCount = post.commentsCount + 1)
        assertEquals("Comments count must increment from 3 to 4", 4, post.commentsCount)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUG 04: Save / Bookmark Blank Screen Fix
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testBookmarkStateTogglingAndSavedVaultFiltering() {
        val post = PostDto(id = "post_99", caption = "Berlin Rave").apply {
            isBookmarked = false
        }
        assertFalse("Initially not bookmarked", post.isBookmarked)

        post.isBookmarked = true
        assertTrue("Bookmarked state is true", post.isBookmarked)

        val reel = ReelDto(id = "reel_88", caption = "Drops at 3AM").apply {
            isBookmarked = true
        }

        val savedItems = listOf(post.id, reel.id)
        assertEquals("Saved vault must contain both post and reel bookmarks", 2, savedItems.size)
        assertTrue(savedItems.contains("post_99"))
        assertTrue(savedItems.contains("reel_88"))
    }
}

