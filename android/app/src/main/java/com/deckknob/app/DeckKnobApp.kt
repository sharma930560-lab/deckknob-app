package com.deckknob.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.decode.VideoFrameDecoder
import com.deckknob.app.network.DeckKnobMessagingService
import com.deckknob.app.util.DeckKnobLogger
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class DeckKnobApp : Application(), ImageLoaderFactory {

    override fun onCreate() {
        super.onCreate()
        DeckKnobLogger.installGlobalCrashHandler()
        DeckKnobLogger.i(
            DeckKnobLogger.Tag.LIFECYCLE,
            "DeckKnobApp initialized (versionCode=${BuildConfig.VERSION_CODE}, versionName=${BuildConfig.VERSION_NAME})"
        )
        createNotificationChannel()
    }

    override fun newImageLoader(): ImageLoader {
        return ImageLoader.Builder(this)
            .components {
                add(VideoFrameDecoder.Factory())
            }
            .crossfade(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "DECKKNOB Alerts"
            val descriptionText = "DJ Livestreams, Event Signals, and Community Updates"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(DeckKnobMessagingService.CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
            DeckKnobLogger.d(DeckKnobLogger.Tag.PUSH, "FCM notification channel configured: ${DeckKnobMessagingService.CHANNEL_ID}")
        }
    }
}
