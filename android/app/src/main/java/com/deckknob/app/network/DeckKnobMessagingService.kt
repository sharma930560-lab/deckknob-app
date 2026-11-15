package com.deckknob.app.network

import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.deckknob.app.MainActivity
import com.deckknob.app.util.DeckKnobLogger
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class DeckKnobMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        DeckKnobLogger.i(DeckKnobLogger.Tag.PUSH, "New FCM Token received: ${token.take(8)}...")
        try {
            val uid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
            if (!uid.isNullOrBlank()) {
                com.google.firebase.firestore.FirebaseFirestore.getInstance()
                    .collection("users")
                    .document(uid)
                    .update(
                        mapOf(
                            "fcmToken" to token,
                            "fcm_token" to token,
                            "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                        )
                    )
                DeckKnobLogger.d(DeckKnobLogger.Tag.PUSH, "Synced refreshed FCM token for UID: $uid")
            }
        } catch (e: Exception) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.PUSH, "Failed to persist token to Firestore: ${e.message}")
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        DeckKnobLogger.d(DeckKnobLogger.Tag.PUSH, "FCM message received from: ${remoteMessage.from}")

        val title = remoteMessage.notification?.title 
            ?: remoteMessage.data["title"] 
            ?: "DECKKNOB Signal"
        val body = remoteMessage.notification?.body 
            ?: remoteMessage.data["body"] 
            ?: remoteMessage.data["message"]
            ?: "New notification from DECKKNOB underground"

        val screen = remoteMessage.data["screen"] ?: remoteMessage.data["type"]
        val targetId = remoteMessage.data["targetId"] ?: remoteMessage.data["referenceId"] ?: remoteMessage.data["eventId"] ?: remoteMessage.data["senderId"]

        showNotification(title, body, screen, targetId)
    }

    private fun showNotification(title: String, message: String, screen: String? = null, targetId: String? = null) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val permission = ContextCompat.checkSelfPermission(
                this,
                android.Manifest.permission.POST_NOTIFICATIONS
            )
            if (permission != PackageManager.PERMISSION_GRANTED) {
                DeckKnobLogger.w(DeckKnobLogger.Tag.PUSH, "Notification permission not granted. Dropping alert.")
                return
            }
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            if (!screen.isNullOrBlank()) {
                putExtra("navigate_to", screen)
            }
            if (!targetId.isNullOrBlank()) {
                putExtra("target_id", targetId)
            }
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_more)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
            DeckKnobLogger.i(DeckKnobLogger.Tag.PUSH, "Notification displayed successfully: $title (screen=$screen)")
        } catch (e: SecurityException) {
            DeckKnobLogger.e(DeckKnobLogger.Tag.PUSH, "Failed to post notification due to security exception: ${e.message}", e)
        }
    }

    companion object {
        const val CHANNEL_ID = "deckknob_alerts"
    }
}

