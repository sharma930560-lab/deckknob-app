package com.deckknob.app

import com.deckknob.app.data.model.UserDto
import com.deckknob.app.util.UrlLauncher
import org.junit.Assert.*
import org.junit.Test

class SocialFeaturesTest {

    @Test
    fun urlLauncher_normalizesStandardUrls() {
        val httpsUrl = UrlLauncher.normalizeUrl("https://deckknob-684f7.web.app")
        assertEquals("https://deckknob-684f7.web.app", httpsUrl)

        val httpUrl = UrlLauncher.normalizeUrl("http://example.com/profile")
        assertEquals("http://example.com/profile", httpUrl)

        val noScheme = UrlLauncher.normalizeUrl("soundcloud.com/deckknob")
        assertEquals("https://soundcloud.com/deckknob", noScheme)

        val whitespace = UrlLauncher.normalizeUrl("   https://deckknob.com/user   ")
        assertEquals("https://deckknob.com/user", whitespace)
    }

    @Test
    fun urlLauncher_expandsSocialHandles() {
        val instaHandle = UrlLauncher.normalizeUrl("@technodj", UrlLauncher.Platform.INSTAGRAM)
        assertEquals("https://instagram.com/technodj", instaHandle)

        val instaHandleNoPrefix = UrlLauncher.normalizeUrl("technodj", UrlLauncher.Platform.INSTAGRAM)
        assertEquals("https://instagram.com/technodj", instaHandleNoPrefix)

        val scHandle = UrlLauncher.normalizeUrl("sound_master", UrlLauncher.Platform.SOUNDCLOUD)
        assertEquals("https://soundcloud.com/sound_master", scHandle)

        val ytHandle = UrlLauncher.normalizeUrl("deckknob_channel", UrlLauncher.Platform.YOUTUBE)
        assertEquals("https://youtube.com/@deckknob_channel", ytHandle)

        val spotifyArtist = UrlLauncher.normalizeUrl("4Z8W4fKeB5YxbusRsdQVPb", UrlLauncher.Platform.SPOTIFY)
        assertEquals("https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb", spotifyArtist)
    }

    @Test
    fun urlLauncher_rejectsUnsafeSchemesAndPayloads() {
        assertNull(UrlLauncher.normalizeUrl("javascript:alert(document.cookie)"))
        assertNull(UrlLauncher.normalizeUrl("JAVASCRIPT:void(0)"))
        assertNull(UrlLauncher.normalizeUrl("file:///data/user/0/com.deckknob.app/databases"))
        assertNull(UrlLauncher.normalizeUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="))
        assertNull(UrlLauncher.normalizeUrl("content://media/external/images/media/42"))
        assertNull(UrlLauncher.normalizeUrl("intent://host/#Intent;scheme=bad;end"))
        assertNull(UrlLauncher.normalizeUrl("about:blank"))
        assertNull(UrlLauncher.normalizeUrl(""))
        assertNull(UrlLauncher.normalizeUrl("   "))
    }

    @Test
    fun userDto_socialCountsAndLinksIntegrity() {
        val user = UserDto(
            uid = "user_test_123",
            username = "djdeck",
            name = "DJ Deck",
            bio = "Techno Producer",
            followersCount = 42,
            followingCount = 18,
            website = "https://deckknob.com",
            instagram = "djdeck",
            soundcloud = "djdeck_official",
            youtube = "DJDeckLive"
        )

        assertEquals("user_test_123", user.uid)
        assertEquals("djdeck", user.username)
        assertEquals(42, user.followersCount)
        assertEquals(18, user.followingCount)
        assertEquals("https://deckknob.com", user.website)
        assertEquals("djdeck", user.instagram)
        assertEquals("djdeck_official", user.soundcloud)
        assertEquals("DJDeckLive", user.youtube)
    }

    @Test
    fun socialFollowLogic_simulatesAtomicCounters() {
        var followerCount = 10
        var followingCount = 5

        // Follow action
        followerCount += 1
        followingCount += 1
        assertEquals(11, followerCount)
        assertEquals(6, followingCount)

        // Unfollow action with floor at 0
        followerCount = maxOf(0, followerCount - 1)
        followingCount = maxOf(0, followingCount - 1)
        assertEquals(10, followerCount)
        assertEquals(5, followingCount)

        // Decrement below 0 safeguard
        var zeroCount = 0
        zeroCount = maxOf(0, zeroCount - 1)
        assertEquals(0, zeroCount)
    }

    @Test
    fun socialSearch_matchesCaseInsensitivePrefixAndSubstrings() {
        val users = listOf(
            UserDto(uid = "1", username = "charlottedewitte", name = "Charlotte"),
            UserDto(uid = "2", username = "ameliapens", name = "Amelie Lens"),
            UserDto(uid = "3", username = "carlcox", name = "Carl Cox")
        )

        val query1 = "charlotte"
        val matched1 = users.filter {
            it.username.contains(query1, ignoreCase = true) || it.name.contains(query1, ignoreCase = true)
        }
        assertEquals(1, matched1.size)
        assertEquals("1", matched1.first().uid)

        val query2 = "CARL"
        val matched2 = users.filter {
            it.username.contains(query2, ignoreCase = true) || it.name.contains(query2, ignoreCase = true)
        }
        assertEquals(1, matched2.size)
        assertEquals("3", matched2.first().uid)

        val queryPartial = "ar"
        val matchedPartial = users.filter {
            it.username.contains(queryPartial, ignoreCase = true) || it.name.contains(queryPartial, ignoreCase = true)
        }
        assertEquals(2, matchedPartial.size) // Matches charlottedewitte and carlcox
    }
}
