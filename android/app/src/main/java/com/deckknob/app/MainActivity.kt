package com.deckknob.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.runtime.LaunchedEffect
import androidx.core.content.ContextCompat
import com.deckknob.app.ui.navigation.AppNavigation
import com.deckknob.app.ui.theme.DeckKnobTheme
import com.deckknob.app.util.DeckKnobLogger
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        DeckKnobLogger.d(DeckKnobLogger.Tag.LIFECYCLE, "MainActivity onCreate called (hasSavedInstanceState=${savedInstanceState != null})")

        // Sync FCM token to Firestore on activity startup for notification reliability
        com.google.firebase.messaging.FirebaseMessaging.getInstance().token
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result
                    val uid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
                    if (!uid.isNullOrBlank() && !token.isNullOrBlank()) {
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
                        DeckKnobLogger.d(DeckKnobLogger.Tag.PUSH, "FCM token synced on startup for UID: $uid")
                    }
                }
            }

        setContent {
            val windowSizeClass = calculateWindowSizeClass(this)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val notificationPermissionLauncher = rememberLauncherForActivityResult(
                    contract = ActivityResultContracts.RequestPermission()
                ) { isGranted ->
                    DeckKnobLogger.i(DeckKnobLogger.Tag.PUSH, "POST_NOTIFICATIONS permission result: granted=$isGranted")
                }

                LaunchedEffect(Unit) {
                    if (ContextCompat.checkSelfPermission(
                            this@MainActivity,
                            Manifest.permission.POST_NOTIFICATIONS
                        ) != PackageManager.PERMISSION_GRANTED
                    ) {
                        DeckKnobLogger.d(DeckKnobLogger.Tag.PUSH, "Requesting POST_NOTIFICATIONS permission")
                        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    } else {
                        DeckKnobLogger.d(DeckKnobLogger.Tag.PUSH, "POST_NOTIFICATIONS permission already granted")
                    }
                }
            }

            DeckKnobTheme {
                AppNavigation(windowSizeClass)
            }
        }
    }

    override fun onStart() {
        super.onStart()
        DeckKnobLogger.d(DeckKnobLogger.Tag.LIFECYCLE, "MainActivity onStart")
    }

    override fun onResume() {
        super.onResume()
        DeckKnobLogger.d(DeckKnobLogger.Tag.LIFECYCLE, "MainActivity onResume")
    }

    override fun onPause() {
        super.onPause()
        DeckKnobLogger.d(DeckKnobLogger.Tag.LIFECYCLE, "MainActivity onPause")
    }

    override fun onStop() {
        super.onStop()
        DeckKnobLogger.d(DeckKnobLogger.Tag.LIFECYCLE, "MainActivity onStop")
    }

    override fun onDestroy() {
        super.onDestroy()
        DeckKnobLogger.d(DeckKnobLogger.Tag.LIFECYCLE, "MainActivity onDestroy")
    }
}
