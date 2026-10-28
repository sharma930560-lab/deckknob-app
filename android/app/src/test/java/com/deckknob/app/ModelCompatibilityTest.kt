package com.deckknob.app

import com.deckknob.app.data.model.EventDto
import com.deckknob.app.data.model.MusicDto
import com.deckknob.app.data.model.PostDto
import com.deckknob.app.data.model.ReelCommentDto
import com.deckknob.app.data.model.ReelDto
import com.deckknob.app.data.model.StoryDto
import com.deckknob.app.data.model.UserDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ModelCompatibilityTest {

    @Test
    fun testPostDtoMediaUrlFallback() {
        val postCamel = PostDto(id = "p1", mediaUrl = "https://cdn.deckknob.com/pic1.jpg")
        assertEquals("https://cdn.deckknob.com/pic1.jpg", postCamel.displayMediaUrl)

        val postSnake = PostDto(id = "p2", media_url = "https://cdn.deckknob.com/pic2.jpg")
        assertEquals("https://cdn.deckknob.com/pic2.jpg", postSnake.displayMediaUrl)

        val postBoth = PostDto(
            id = "p3",
            mediaUrl = "https://cdn.deckknob.com/pic_primary.jpg",
            media_url = "https://cdn.deckknob.com/pic_legacy.jpg"
        )
        assertEquals("https://cdn.deckknob.com/pic_primary.jpg", postBoth.displayMediaUrl)
    }

    @Test
    fun testPostDtoMediaTypeFallback() {
        val postCamel = PostDto(id = "p1", mediaType = "video")
        assertEquals("video", postCamel.displayMediaType)

        val postSnake = PostDto(id = "p2", mediaType = "", media_type = "audio")
        assertEquals("audio", postSnake.displayMediaType)
    }

    @Test
    fun testReelDtoMediaUrlFallback() {
        val reelCamel = ReelDto(id = "r1", mediaUrl = "https://cdn.deckknob.com/reel1.mp4")
        assertEquals("https://cdn.deckknob.com/reel1.mp4", reelCamel.displayMediaUrl)

        val reelSnake = ReelDto(id = "r2", media_url = "https://cdn.deckknob.com/reel2.mp4")
        assertEquals("https://cdn.deckknob.com/reel2.mp4", reelSnake.displayMediaUrl)
    }

    @Test
    fun testReelDtoWithMusicAndEngagement() {
        val music = MusicDto(
            id = "m1",
            title = "Berlin Underground",
            artist = "Klangkuenstler",
            audio_url = "https://cdn.deckknob.com/audio/berlin.mp3"
        )
        val reel = ReelDto(
            id = "r3",
            mediaUrl = "https://cdn.deckknob.com/reel3.mp4",
            likesCount = 42,
            commentsCount = 7,
            music = music
        )
        reel.isLiked = true
        reel.isBookmarked = true

        assertEquals("https://cdn.deckknob.com/audio/berlin.mp3", music.displayAudioUrl)
        assertEquals("Berlin Underground", music.displayTitle)
        assertEquals("Klangkuenstler", music.displayArtist)
        assertEquals(42, reel.likesCount)
        assertEquals(7, reel.commentsCount)
        assertTrue(reel.isLiked)
        assertTrue(reel.isBookmarked)
        assertNotNull(reel.music)
    }

    @Test
    fun testReelCommentDto() {
        val comment = ReelCommentDto(
            id = "c1",
            authorId = "u1",
            authorUsername = "selector",
            text = "Heavy bassline! 🔥"
        )
        assertEquals("c1", comment.id)
        assertEquals("selector", comment.authorUsername)
        assertEquals("Heavy bassline! 🔥", comment.text)
    }

    @Test
    fun testStoryDtoMediaUrlAndTypeFallback() {
        val story = StoryDto(
            id = "s1",
            mediaUrl = "https://cdn.deckknob.com/story.jpg",
            media_type = "image"
        )
        assertEquals("https://cdn.deckknob.com/story.jpg", story.displayMediaUrl)
        assertEquals("image", story.displayMediaType)
        assertFalse(story.isArchived)
    }

    @Test
    fun testEventDtoBannerImageFallback() {
        val eventPrimary = EventDto(id = "e1", image = "https://cdn.deckknob.com/flyer1.png")
        assertEquals("https://cdn.deckknob.com/flyer1.png", eventPrimary.bannerImage)

        val eventLegacy = EventDto(id = "e2", media_url = "https://cdn.deckknob.com/flyer2.png")
        assertEquals("https://cdn.deckknob.com/flyer2.png", eventLegacy.bannerImage)
    }

    @Test
    fun testUserDtoDefaultValues() {
        val user = UserDto(uid = "u1", username = "resident_dj", email = "dj@deckknob.com")
        assertEquals("fan", user.role)
        assertEquals(0, user.followersCount)
        assertEquals(0, user.followingCount)
        assertEquals(0, user.postsCount)
        assertFalse(user.isLive)
        assertFalse(user.isPrivate)
        assertFalse(user.hideLikes)
    }

    @Test
    fun testUserDtoProfileAndSettingsFields() {
        val user = UserDto(
            uid = "u2",
            username = "amelie_lens",
            name = "Amelie Lens",
            email = "amelie@lenske.com",
            coverPhoto = "https://cdn.deckknob.com/covers/amelie.jpg",
            profilePic = "https://cdn.deckknob.com/avatars/amelie.jpg",
            role = "dj",
            genre = "Techno",
            city = "Antwerp",
            bio = "Exhale Records founder & techno selector",
            website = "https://lenske.com",
            instagram = "amelie_lens",
            soundcloud = "amelielens",
            youtube = "amelielens",
            isPrivate = true,
            hideLikes = true
        )
        assertEquals("Amelie Lens", user.name)
        assertEquals("https://cdn.deckknob.com/covers/amelie.jpg", user.coverPhoto)
        assertEquals("https://cdn.deckknob.com/avatars/amelie.jpg", user.profilePic)
        assertEquals("dj", user.role)
        assertEquals("Techno", user.genre)
        assertEquals("Antwerp", user.city)
        assertTrue(user.isPrivate)
        assertTrue(user.hideLikes)
        assertEquals("https://lenske.com", user.website)
        assertEquals("amelie_lens", user.instagram)
    }

    @Test
    fun testStoryDtoExpirationWindow() {
        val now = java.util.Date()
        val expiresAt = java.util.Date(now.time + 24 * 60 * 60 * 1000)
        val story = StoryDto(
            id = "s2",
            authorId = "u2",
            authorUsername = "amelie_lens",
            mediaUrl = "https://cdn.deckknob.com/stories/s2.jpg",
            createdAt = now,
            expiresAt = expiresAt
        )
        assertEquals(now.time, story.createdAt?.time)
        assertEquals(expiresAt.time, story.expiresAt?.time)
        assertTrue(story.expiresAt!!.time > story.createdAt!!.time)
    }

    @Test
    fun testEventDtoHostingFields() {
        val event = EventDto(
            id = "e3",
            title = "Awakenings ADE 2026",
            venue = "Gashouder",
            city = "Amsterdam",
            date = "OCT 24, 2026",
            time = "10:00 PM",
            description = "Techno marathon in Amsterdam"
        )
        assertEquals("Awakenings ADE 2026", event.title)
        assertEquals("Gashouder", event.venue)
        assertEquals("Amsterdam", event.city)
        assertEquals("OCT 24, 2026", event.date)
        assertEquals("10:00 PM", event.time)
    }

    @Test
    fun testPostDtoFireReactionFields() {
        val post = PostDto(
            id = "post_fire_1",
            authorUsername = "dj_solomun",
            caption = "Ibiza closing set 🔥",
            likesCount = 42
        ).apply {
            isLiked = true
        }
        assertEquals(42, post.likesCount)
        assertTrue(post.isLiked)

        // Unfire simulation
        post.isLiked = false
        post.likesCount = 41
        assertEquals(41, post.likesCount)
        assertFalse(post.isLiked)
    }

    @Test
    fun testCameraCreationModes() {
        val storyMode = com.deckknob.app.ui.camera.CreationMode.STORY
        val postMode = com.deckknob.app.ui.camera.CreationMode.POST
        val klypMode = com.deckknob.app.ui.camera.CreationMode.KLYP
        val eventMode = com.deckknob.app.ui.camera.CreationMode.EVENT

        assertEquals("STORY", storyMode.label)
        assertEquals("POST", postMode.label)
        assertEquals("KLYP", klypMode.label)
        assertEquals("EVENT", eventMode.label)
    }

    @Test
    fun testDemoPlaylistsAndTracks() {
        val track1 = com.deckknob.app.data.model.DemoTrackDto(
            id = "track_1",
            title = "Berghain Sunrise",
            audioUrl = "https://example.com/audio1.mp3",
            bpm = 138,
            key = "A min",
            duration = 180
        )
        val playlist = com.deckknob.app.data.model.DemoPlaylistDto(
            id = "pl_1",
            title = "Dark Techno Promos",
            description = "Exclusive unreleased promo tracks for clubs",
            tracks = listOf(track1),
            visibility = "public",
            ownershipAttested = true
        )
        val user = UserDto(
            uid = "user_dj_1",
            username = "richie_hawtin",
            demoPlaylists = listOf(playlist)
        )

        assertEquals(1, user.demoPlaylists.size)
        assertEquals("pl_1", user.demoPlaylists[0].id)
        assertEquals("Dark Techno Promos", user.demoPlaylists[0].title)
        assertEquals(1, user.demoPlaylists[0].tracks.size)
        assertEquals("Berghain Sunrise", user.demoPlaylists[0].tracks[0].title)
        assertEquals(Integer.valueOf(138), user.demoPlaylists[0].tracks[0].bpm)
        assertEquals("A min", user.demoPlaylists[0].tracks[0].key)
        assertEquals("public", user.demoPlaylists[0].visibility)
        assertTrue(user.demoPlaylists[0].ownershipAttested)
    }

    @Test
    fun testCuratedElectronicCatalogMetadata() {
        val catalog = com.deckknob.app.ui.components.CURATED_ELECTRONIC_CATALOG
        assertTrue(catalog.isNotEmpty())
        assertEquals(6, catalog.size)

        for (track in catalog) {
            assertTrue(track.id.isNotBlank())
            assertTrue(track.title.isNotBlank())
            assertTrue(track.artist.isNotBlank())
            assertTrue(track.audioUrl.startsWith("https://"))
            assertTrue(track.bpm > 0)
            assertTrue(track.duration in 5.0..30.0)
            assertEquals("Creative Commons BY 4.0", track.license)
        }
    }

    @Test
    fun testPostDtoWithSoundtrack() {
        val soundtrack = MusicDto(
            id = "curated_1",
            title = "Techno Pulse",
            artist = "Sub Zero",
            audio_url = "https://cdn.deckknob.com/audio/techno_pulse.mp3"
        )
        val post = PostDto(
            id = "post_music_1",
            caption = "Festival vibes with soundtrack",
            music = soundtrack
        )

        assertNotNull(post.music)
        assertEquals("Techno Pulse", post.music?.displayTitle)
        assertEquals("Sub Zero", post.music?.displayArtist)
        assertEquals("https://cdn.deckknob.com/audio/techno_pulse.mp3", post.music?.displayAudioUrl)
    }
}
