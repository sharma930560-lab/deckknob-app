package com.deckknob.app.ui.camera

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.deckknob.app.ui.theme.DeckKnobBlack
import com.deckknob.app.ui.theme.DeckKnobYellow
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun CameraScreen(
    onClose: () -> Unit,
    onMediaPublished: () -> Unit,
    onNavigateToEvents: () -> Unit = {},
    viewModel: CameraViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasCameraPermission = permissions[Manifest.permission.CAMERA] == true
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            val isVideo = context.contentResolver.getType(uri)?.startsWith("video") == true
            viewModel.onMediaCaptured(uri, if (isVideo) "video" else "image")
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DeckKnobBlack)
    ) {
        if (viewModel.capturedMediaUri != null) {
            // Review & Publish Screen
            MediaReviewView(
                viewModel = viewModel,
                onRetake = { viewModel.clearCapturedMedia() },
                onPublishSuccess = {
                    viewModel.clearCapturedMedia()
                    onMediaPublished()
                }
            )
        } else {
            // Live Camera Viewfinder & Controls
            if (hasCameraPermission) {
                CameraViewfinder(
                    viewModel = viewModel,
                    context = context,
                    onPhotoCaptured = { uri ->
                        viewModel.onMediaCaptured(uri, "image")
                    }
                )
            } else {
                // Permission Fallback Screen
                CameraPermissionFallback(
                    onRequestPermission = {
                        permissionLauncher.launch(
                            arrayOf(
                                Manifest.permission.CAMERA,
                                Manifest.permission.RECORD_AUDIO
                            )
                        )
                    },
                    onOpenGallery = { galleryLauncher.launch("image/*") }
                )
            }

            // Top Camera Action Bar (Close, Flash, Lens Flip)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onClose,
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.5f))
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Close Camera", tint = Color.White)
                }

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Flash Toggle
                    IconButton(
                        onClick = { viewModel.toggleFlash() },
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.5f))
                    ) {
                        val flashIcon = when (viewModel.flashMode) {
                            ImageCapture.FLASH_MODE_ON -> Icons.Default.FlashOn
                            ImageCapture.FLASH_MODE_AUTO -> Icons.Default.FlashAuto
                            else -> Icons.Default.FlashOff
                        }
                        Icon(flashIcon, contentDescription = "Flash", tint = if (viewModel.flashMode != ImageCapture.FLASH_MODE_OFF) DeckKnobYellow else Color.White)
                    }

                    // Lens Flip
                    IconButton(
                        onClick = { viewModel.toggleLens() },
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.5f))
                    ) {
                        Icon(Icons.Default.FlipCameraAndroid, contentDescription = "Flip Lens", tint = Color.White)
                    }
                }
            }

            // Bottom Shutter & Mode Selector
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f), Color.Black)
                        )
                    )
                    .navigationBarsPadding()
                    .padding(bottom = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Center Controls Row: Gallery - Shutter - Sim
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 32.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Gallery Picker
                    IconButton(
                        onClick = {
                            val mime = if (viewModel.selectedMode == CreationMode.KLYP) "video/*" else "image/*"
                            galleryLauncher.launch(mime)
                        },
                        modifier = Modifier
                            .size(52.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.15f))
                    ) {
                        Icon(Icons.Default.PhotoLibrary, contentDescription = "Open Gallery", tint = Color.White)
                    }

                    // Main Instagram-Style Shutter Button
                    Box(
                        modifier = Modifier
                            .size(84.dp)
                            .border(4.dp, DeckKnobYellow, CircleShape)
                            .padding(6.dp)
                            .clip(CircleShape)
                            .background(Color.White)
                            .clickable {
                                // Capture photo or simulated frame
                                val file = File(
                                    context.cacheDir,
                                    "deckknob_snap_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}.jpg"
                                )
                                file.createNewFile()
                                viewModel.onMediaCaptured(Uri.fromFile(file), "image")
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(DeckKnobYellow)
                        )
                    }

                    // Quick Signal Generator
                    IconButton(
                        onClick = {
                            val dummyFile = File(context.cacheDir, "deckknob_quick_snap.jpg")
                            if (!dummyFile.exists()) dummyFile.createNewFile()
                            viewModel.onMediaCaptured(Uri.fromFile(dummyFile), "image")
                        },
                        modifier = Modifier
                            .size(52.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.15f))
                    ) {
                        Icon(Icons.Default.Bolt, contentDescription = "Quick Snap", tint = DeckKnobYellow)
                    }
                }

                // Creation Mode Selector Bar: STORY | POST | KLYP | EVENT
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CreationMode.values().forEach { mode ->
                        val isSelected = viewModel.selectedMode == mode
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (isSelected) DeckKnobYellow else Color.Transparent)
                                .clickable {
                                    if (mode == CreationMode.EVENT) {
                                        onClose()
                                        onNavigateToEvents()
                                    } else {
                                        viewModel.setMode(mode)
                                    }
                                }
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = mode.label,
                                color = if (isSelected) DeckKnobBlack else Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 13.sp,
                                letterSpacing = 1.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CameraViewfinder(
    viewModel: CameraViewModel,
    context: Context,
    onPhotoCaptured: (Uri) -> Unit
) {
    val lifecycleOwner = LocalLifecycleOwner.current

    AndroidView(
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)

            cameraProviderFuture.addListener({
                try {
                    val cameraProvider = cameraProviderFuture.get()
                    val preview = Preview.Builder().build().also {
                        it.setSurfaceProvider(previewView.surfaceProvider)
                    }

                    val imageCapture = ImageCapture.Builder()
                        .setFlashMode(viewModel.flashMode)
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build()

                    val cameraSelector = CameraSelector.Builder()
                        .requireLensFacing(viewModel.lensFacing)
                        .build()

                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        cameraSelector,
                        preview,
                        imageCapture
                    )
                } catch (_: Exception) {
                    // Graceful fallback on emulator or camera hardware limitation
                }
            }, ContextCompat.getMainExecutor(ctx))

            previewView
        },
        modifier = Modifier.fillMaxSize()
    )
}

@Composable
private fun CameraPermissionFallback(
    onRequestPermission: () -> Unit,
    onOpenGallery: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.PhotoCamera,
            contentDescription = null,
            tint = DeckKnobYellow,
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "CAMERA ACCESS REQUIRED",
            color = Color.White,
            fontWeight = FontWeight.Black,
            fontSize = 18.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Allow camera and audio access to capture instant stories, Klyps and feed drops.",
            color = Color.Gray,
            fontSize = 13.sp
        )
        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = onRequestPermission,
            colors = ButtonDefaults.buttonColors(
                containerColor = DeckKnobYellow,
                contentColor = DeckKnobBlack
            ),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("ENABLE CAMERA", fontWeight = FontWeight.Bold, color = DeckKnobBlack)
        }
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedButton(
            onClick = onOpenGallery,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
        ) {
            Text("SELECT FROM GALLERY")
        }
    }
}

@Composable
private fun MediaReviewView(
    viewModel: CameraViewModel,
    onRetake: () -> Unit,
    onPublishSuccess: () -> Unit
) {
    val mediaUri = viewModel.capturedMediaUri ?: return

    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onRetake,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.1f))
            ) {
                Icon(Icons.Default.Close, contentDescription = "Retake", tint = Color.White)
            }

            Surface(
                color = DeckKnobYellow.copy(alpha = 0.15f),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, DeckKnobYellow.copy(alpha = 0.4f))
            ) {
                Text(
                    text = "TARGET: ${viewModel.selectedMode.label}",
                    color = DeckKnobYellow,
                    fontWeight = FontWeight.Black,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }

        // Preview Box
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(vertical = 12.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(Color.Black),
            contentAlignment = Alignment.Center
        ) {
            AsyncImage(
                model = mediaUri,
                contentDescription = "Captured Preview",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        }

        // Caption Input & Publish Button
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = viewModel.caption,
                onValueChange = { viewModel.caption = it },
                placeholder = { Text("Add caption, DJ credit, or underground location...", color = Color.Gray) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = DeckKnobYellow,
                    unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                )
            )

            if (viewModel.errorMessage != null) {
                Text(
                    text = viewModel.errorMessage ?: "",
                    color = Color.Red,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Button(
                onClick = { viewModel.publishMedia(onPublishSuccess) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = DeckKnobYellow,
                    contentColor = DeckKnobBlack
                ),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                enabled = !viewModel.isPublishing
            ) {
                if (viewModel.isPublishing) {
                    CircularProgressIndicator(modifier = Modifier.size(22.dp), color = DeckKnobBlack)
                } else {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, tint = DeckKnobBlack)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "PUBLISH ${viewModel.selectedMode.label}",
                        fontWeight = FontWeight.Black,
                        fontSize = 15.sp,
                        letterSpacing = 1.sp,
                        color = DeckKnobBlack
                    )
                }
            }
        }
    }
}
