package com.deckknob.app.ui.stories

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.deckknob.app.data.model.StoryDto
import kotlinx.coroutines.isActive
import java.util.concurrent.TimeUnit

@Composable
fun StoriesStrip(
    viewModel: StoriesViewModel = hiltViewModel()
) {
    var activeViewerStoryIndex by remember { mutableStateOf<Int?>(null) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) {
            viewModel.selectedMediaUri = uri
            viewModel.showCreateStoryDialog = true
        }
    }

    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp, horizontal = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // "Your Story" / Add Story Item
        item {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clickable { launcher.launch("image/*") }
                    .padding(horizontal = 2.dp)
            ) {
                Box(contentAlignment = Alignment.BottomEnd) {
                    Box(
                        modifier = Modifier
                            .size(68.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF18181B))
                            .border(1.5.dp, Color(0xFF3F3F46), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = "Your Story",
                            tint = Color.LightGray,
                            modifier = Modifier.size(34.dp)
                        )
                    }

                    // Yellow plus badge
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .offset(x = 2.dp, y = 2.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFDFE104))
                            .border(2.dp, Color(0xFF09090B), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = "Add Story",
                            tint = Color.Black,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Your Story",
                    fontSize = 11.sp,
                    color = Color.LightGray,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        // Active Stories List
        itemsIndexed(viewModel.stories, key = { _, story -> story.id }) { index, story ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clickable { activeViewerStoryIndex = index }
                    .padding(horizontal = 2.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(68.dp)
                        .clip(CircleShape)
                        .border(2.5.dp, Color(0xFFDFE104), CircleShape)
                        .padding(3.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF18181B))
                ) {
                    AsyncImage(
                        model = story.authorAvatar.ifEmpty { story.displayMediaUrl },
                        contentDescription = story.authorUsername,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = story.authorUsername.ifEmpty { "User" },
                    fontSize = 11.sp,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.widthIn(max = 68.dp)
                )
            }
        }
    }

    // Instagram-Style Edge-to-Edge Story Viewer
    if (activeViewerStoryIndex != null && viewModel.stories.isNotEmpty()) {
        val safeIndex = activeViewerStoryIndex!!.coerceIn(0, viewModel.stories.size - 1)
        InstagramStoryViewer(
            stories = viewModel.stories,
            initialIndex = safeIndex,
            onDismiss = { activeViewerStoryIndex = null }
        )
    }

    // Instagram-Style Story Editor Dialog
    if (viewModel.showCreateStoryDialog && viewModel.selectedMediaUri != null) {
        StoryEditorDialog(
            viewModel = viewModel,
            onDismiss = {
                viewModel.resetStoryEditor()
            }
        )
    }
}

@Composable
fun InstagramStoryViewer(
    stories: List<StoryDto>,
    initialIndex: Int,
    onDismiss: () -> Unit
) {
    var currentIndex by remember { mutableIntStateOf(initialIndex) }
    val currentStory = stories.getOrNull(currentIndex) ?: run {
        onDismiss()
        return
    }

    var isPaused by remember { mutableStateOf(false) }
    var progress by remember(currentIndex) { mutableFloatStateOf(0f) }
    var isLiked by remember { mutableStateOf(false) }

    // 5-second automatic progression timer with pause support
    LaunchedEffect(currentIndex, isPaused) {
        if (!isPaused) {
            val totalSteps = 100
            val stepDelayMs = 50L // 5000ms total
            while (progress < 1f && isActive) {
                kotlinx.coroutines.delay(stepDelayMs)
                progress += (1f / totalSteps)
            }
            if (progress >= 1f) {
                if (currentIndex < stories.size - 1) {
                    currentIndex++
                    progress = 0f
                } else {
                    onDismiss()
                }
            }
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
        ) {
            // Full Screen Story Media with Filter
            val isMono = currentStory.filterName == "mono"
            val filterColor = when (currentStory.filterName) {
                "warm" -> Color(0xFFFF9800).copy(alpha = 0.22f)
                "cool" -> Color(0xFF00E5FF).copy(alpha = 0.20f)
                "vintage" -> Color(0xFF8D6E63).copy(alpha = 0.26f)
                "glow" -> Color(0xFFDFE104).copy(alpha = 0.18f)
                else -> null
            }

            AsyncImage(
                model = currentStory.displayMediaUrl,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
                colorFilter = if (isMono) androidx.compose.ui.graphics.ColorFilter.colorMatrix(
                    androidx.compose.ui.graphics.ColorMatrix().apply { setToSaturation(0f) }
                ) else null
            )

            filterColor?.let { tint ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(tint)
                )
            }

            // Styled DJ Text Overlay Sticker
            if (currentStory.textOverlay.isNotEmpty()) {
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(horizontal = 24.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color.Black.copy(alpha = 0.75f))
                        .border(1.5.dp, Color(0xFFDFE104), RoundedCornerShape(14.dp))
                        .padding(horizontal = 20.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = currentStory.textOverlay,
                        color = Color(0xFFDFE104),
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
            }

            // Top gradient overlay for header visibility
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .align(Alignment.TopCenter)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Black.copy(alpha = 0.85f), Color.Transparent)
                        )
                    )
            )

            // Bottom gradient overlay for caption visibility
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.9f))
                        )
                    )
            )

            // Touch interaction layer for Next, Prev, and Tap-and-Hold to Pause
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(currentIndex) {
                        detectTapGestures(
                            onPress = {
                                isPaused = true
                                tryAwaitRelease()
                                isPaused = false
                            },
                            onTap = { offset ->
                                val screenWidth = size.width
                                if (offset.x < screenWidth * 0.35f) {
                                    // Tap left: previous story
                                    if (currentIndex > 0) {
                                        currentIndex--
                                        progress = 0f
                                    } else {
                                        progress = 0f
                                    }
                                } else {
                                    // Tap right: next story
                                    if (currentIndex < stories.size - 1) {
                                        currentIndex++
                                        progress = 0f
                                    } else {
                                        onDismiss()
                                    }
                                }
                            }
                        )
                    }
            )

            // Top Content: Segmented Progress Bar & User Header
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                // Segmented Progress Bar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    stories.forEachIndexed { idx, _ ->
                        val segmentProgress = when {
                            idx < currentIndex -> 1f
                            idx == currentIndex -> progress
                            else -> 0f
                        }
                        LinearProgressIndicator(
                            progress = { segmentProgress },
                            modifier = Modifier
                                .weight(1f)
                                .height(3.dp)
                                .clip(RoundedCornerShape(2.dp)),
                            color = Color(0xFFDFE104),
                            trackColor = Color.White.copy(alpha = 0.3f),
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Header: Avatar, Username, Time Ago, Close (X) Button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .border(1.5.dp, Color(0xFFDFE104), CircleShape)
                                .background(Color.DarkGray)
                        ) {
                            AsyncImage(
                                model = currentStory.authorAvatar.ifEmpty { currentStory.displayMediaUrl },
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }

                        Spacer(modifier = Modifier.width(10.dp))

                        Column {
                            Text(
                                text = currentStory.authorUsername.ifEmpty { "deckknob_artist" },
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 14.sp
                            )
                            val timeAgo = calculateTimeAgo(currentStory.createdAt?.time)
                            Text(
                                text = timeAgo,
                                color = Color.LightGray,
                                fontSize = 11.sp
                            )
                            currentStory.music?.let { m ->
                                Spacer(modifier = Modifier.height(2.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.MusicNote,
                                        contentDescription = null,
                                        tint = Color(0xFFDFE104),
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text(
                                        text = "${m.title} • ${m.artist}",
                                        color = Color(0xFFDFE104),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }

                    IconButton(onClick = onDismiss) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Close Story",
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
            }

            // Bottom Content: Caption & Reaction bar
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(16.dp)
            ) {
                if (currentStory.caption.isNotEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.Black.copy(alpha = 0.6f))
                            .padding(12.dp)
                    ) {
                        Text(
                            text = currentStory.caption,
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            lineHeight = 18.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .clip(RoundedCornerShape(22.dp))
                            .background(Color.White.copy(alpha = 0.15f))
                            .border(1.dp, Color.White.copy(alpha = 0.25f), RoundedCornerShape(22.dp))
                            .padding(horizontal = 16.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        Text(
                            text = "Send message...",
                            color = Color.LightGray,
                            fontSize = 13.sp
                        )
                    }

                    IconButton(
                        onClick = { isLiked = !isLiked },
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(if (isLiked) Color.Red.copy(alpha = 0.2f) else Color.White.copy(alpha = 0.15f))
                    ) {
                        Icon(
                            imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                            contentDescription = "Like Story",
                            tint = if (isLiked) Color.Red else Color.White
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun StoryComposerSheet(
    viewModel: StoriesViewModel,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF09090B))
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "NEW STORY (24H)",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        letterSpacing = 1.sp
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Cancel", tint = Color.White)
                    }
                }

                HorizontalDivider(color = Color(0xFF27272A), modifier = Modifier.padding(vertical = 12.dp))

                // Image Preview Card
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color(0xFF141416))
                        .border(1.dp, Color(0xFF27272A), RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    AsyncImage(
                        model = viewModel.selectedMediaUri,
                        contentDescription = "Story Preview",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Caption Input
                OutlinedTextField(
                    value = viewModel.caption,
                    onValueChange = { viewModel.caption = it },
                    placeholder = { Text("Add caption or track ID...", color = Color.Gray) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFDFE104),
                        unfocusedBorderColor = Color(0xFF3F3F46),
                        focusedContainerColor = Color(0xFF141416),
                        unfocusedContainerColor = Color(0xFF141416)
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // HIGH CONTRAST YELLOW SHARE BUTTON
                Button(
                    onClick = { viewModel.submitStory() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFDFE104),
                        contentColor = Color.Black
                    ),
                    enabled = !viewModel.isUploading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (viewModel.isUploading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            color = Color.Black,
                            strokeWidth = 2.5.dp
                        )
                    } else {
                        Text(
                            text = "SHARE TO STORY",
                            color = Color.Black,
                            fontWeight = FontWeight.Black,
                            fontSize = 15.sp,
                            letterSpacing = 1.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}

private fun calculateTimeAgo(timestampMs: Long?): String {
    if (timestampMs == null) return "Just now"
    val diff = System.currentTimeMillis() - timestampMs
    val minutes = TimeUnit.MILLISECONDS.toMinutes(diff)
    val hours = TimeUnit.MILLISECONDS.toHours(diff)
    return when {
        minutes < 1 -> "Just now"
        minutes < 60 -> "${minutes}m ago"
        hours < 24 -> "${hours}h ago"
        else -> "1d ago"
    }
}
