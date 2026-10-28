package com.deckknob.app.ui.reels

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.material.icons.outlined.Whatshot
import com.deckknob.app.ui.components.FireReactionOverlay
import com.deckknob.app.ui.components.HashtagText
import com.deckknob.app.ui.components.MusicPickerSheet

import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.deckknob.app.data.model.ReelCommentDto
import com.deckknob.app.data.model.ReelDto
import java.text.SimpleDateFormat
import java.util.*

private val DeckKnobBlack = Color(0xFF09090B)
private val DeckKnobYellow = Color(0xFFDFE104)

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ReelsScreen(
    onOpenUserProfile: (String) -> Unit = {},
    viewModel: ReelsViewModel = hiltViewModel()
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        if (viewModel.isLoading && viewModel.reels.isEmpty()) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center),
                color = DeckKnobYellow
            )
        } else if (viewModel.reels.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "NO KLYPS YET",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Be the first to drop an underground short video signal!",
                    color = Color.Gray,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(20.dp))
                Button(
                    onClick = { viewModel.showCreateReelDialog = true },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = DeckKnobYellow,
                        contentColor = DeckKnobBlack
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("CREATE KLYP", fontWeight = FontWeight.Bold)
                }
            }
        } else {
            val pagerState = rememberPagerState(pageCount = { viewModel.reels.size })
            VerticalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                val reel = viewModel.reels[page]
                KlypItem(
                    reel = reel,
                    isCurrentPage = pagerState.currentPage == page,
                    index = page,
                    viewModel = viewModel,
                    onOpenUserProfile = onOpenUserProfile
                )
            }
        }

        // Global top-right Floating Create (+) button
        FloatingActionButton(
            onClick = { viewModel.showCreateReelDialog = true },
            modifier = Modifier
                .align(Alignment.TopEnd)
                .statusBarsPadding()
                .padding(top = 12.dp, end = 16.dp)
                .size(44.dp),
            containerColor = DeckKnobYellow,
            contentColor = DeckKnobBlack,
            shape = CircleShape
        ) {
            Icon(Icons.Default.Add, contentDescription = "Create Klyp")
        }

        // Create Klyp Dialog
        if (viewModel.showCreateReelDialog && !viewModel.showMusicPicker) {
            CreateKlypDialog(
                viewModel = viewModel,
                onDismiss = { viewModel.showCreateReelDialog = false }
            )
        }

        if (viewModel.showMusicPicker) {
            MusicPickerSheet(
                onDismiss = { viewModel.showMusicPicker = false },
                onTrackSelected = { track ->
                    viewModel.newReelMusic = track
                },
                onClearMusic = {
                    viewModel.newReelMusic = null
                }
            )
        }

        // Comments Bottom Sheet
        if (viewModel.activeCommentReelId != null) {
            val activeReel = viewModel.reels.find { it.id == viewModel.activeCommentReelId }
            KlypCommentsSheet(
                reel = activeReel,
                viewModel = viewModel,
                onDismiss = { viewModel.closeComments() }
            )
        }
    }
}

@OptIn(UnstableApi::class)
@Composable
fun KlypItem(
    reel: ReelDto,
    isCurrentPage: Boolean,
    index: Int,
    viewModel: ReelsViewModel,
    onOpenUserProfile: (String) -> Unit = {}
) {
    val context = LocalContext.current
    var manualPaused by remember { mutableStateOf(false) }
    var showFireAnimation by remember { mutableStateOf(false) }
    var fireTapOffset by remember { mutableStateOf<androidx.compose.ui.geometry.Offset?>(null) }

    // Reset manual pause on swipe
    LaunchedEffect(isCurrentPage) {
        if (!isCurrentPage) {
            manualPaused = false
        }
    }

    val exoPlayer = remember(reel.displayMediaUrl) {
        if (reel.displayMediaUrl.isNotBlank()) {
            ExoPlayer.Builder(context).build().apply {
                try {
                    setMediaItem(MediaItem.fromUri(reel.displayMediaUrl))
                    repeatMode = Player.REPEAT_MODE_ONE
                    addListener(object : Player.Listener {
                        override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                            android.util.Log.w("KlypPlayer", "Video playback error for ${reel.id}: ${error.message}")
                        }
                    })
                    prepare()
                } catch (e: Exception) {
                    android.util.Log.e("KlypPlayer", "Failed to prepare media for ${reel.id}", e)
                }
            }
        } else null
    }

    // Playback sync with active page & sound
    DisposableEffect(isCurrentPage, manualPaused, viewModel.isGlobalMuted) {
        val player = exoPlayer
        if (player != null) {
            if (isCurrentPage && !manualPaused) {
                player.volume = if (viewModel.isGlobalMuted) 0f else 1f
                player.playWhenReady = true
            } else {
                player.playWhenReady = false
                player.pause()
            }
        }
        onDispose {
            player?.pause()
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            exoPlayer?.release()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Video View
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = false
                }
            },
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(reel.id) {
                    detectTapGestures(
                        onDoubleTap = { offset ->
                            fireTapOffset = offset
                            showFireAnimation = true
                            viewModel.toggleLike(reel)
                        },
                        onTap = {
                            manualPaused = !manualPaused
                        }
                    )
                }
        )

        // Signature 3D Fire Animation Burst Overlay on double-tap
        FireReactionOverlay(
            visible = showFireAnimation,
            tapOffset = fireTapOffset,
            onDismiss = { showFireAnimation = false }
        )

        // Gradient overlays for text contrast
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(140.dp)
                .align(Alignment.TopCenter)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Black.copy(alpha = 0.65f), Color.Transparent)
                    )
                )
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(340.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f), Color.Black)
                    )
                )
        )

        // Top Left Klyp Badge
        Row(
            modifier = Modifier
                .align(Alignment.TopStart)
                .statusBarsPadding()
                .padding(top = 16.dp, start = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .background(DeckKnobYellow, RoundedCornerShape(4.dp))
                    .padding(horizontal = 8.dp, vertical = 3.dp)
            ) {
                Text(
                    text = "KLYP ${String.format("%02d", index + 1)}",
                    fontWeight = FontWeight.Black,
                    color = DeckKnobBlack,
                    fontSize = 11.sp,
                    letterSpacing = 1.sp
                )
            }
        }

        // Center Pause Indicator
        AnimatedVisibility(
            visible = manualPaused,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.Center)
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.65f))
                    .border(1.dp, Color.White.copy(alpha = 0.25f), CircleShape)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) {
                        manualPaused = false
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.PlayArrow,
                    contentDescription = "Play",
                    tint = Color.White,
                    modifier = Modifier.size(40.dp)
                )
            }
        }

        // Right-Side Action Rail
        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .navigationBarsPadding()
                .padding(end = 12.dp, bottom = 96.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Like / Fire Button
            ActionRailItem(
                icon = if (reel.isLiked) Icons.Filled.Whatshot else Icons.Outlined.Whatshot,
                label = formatCount(reel.likesCount),
                tint = if (reel.isLiked) DeckKnobYellow else Color.White,
                onClick = { viewModel.toggleLike(reel) }
            )

            // Comment Button
            ActionRailItem(
                icon = Icons.Default.ChatBubbleOutline,
                label = formatCount(reel.commentsCount),
                tint = Color.White,
                onClick = { viewModel.openComments(reel.id) }
            )

            // Share Button
            ActionRailItem(
                icon = Icons.Default.Share,
                label = "Share",
                tint = Color.White,
                onClick = { shareKlyp(context, reel) }
            )

            // Bookmark / Save Button
            ActionRailItem(
                icon = if (reel.isBookmarked) Icons.Filled.Bookmark else Icons.Filled.BookmarkBorder,
                label = "Save",
                tint = if (reel.isBookmarked) DeckKnobYellow else Color.White,
                onClick = { viewModel.toggleBookmark(reel) }
            )

            // Sound Toggle Button
            ActionRailItem(
                icon = if (viewModel.isGlobalMuted) Icons.Default.VolumeOff else Icons.Default.VolumeUp,
                label = if (viewModel.isGlobalMuted) "Muted" else "Sound",
                tint = if (viewModel.isGlobalMuted) Color.Gray else Color.White,
                onClick = { viewModel.toggleMute() }
            )
        }

        // Bottom Left Creator Info & Audio
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomStart)
                .navigationBarsPadding()
                .padding(start = 16.dp, end = 92.dp, bottom = 96.dp)
        ) {
            // Creator Row
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (reel.authorAvatar.isNotEmpty()) {
                    AsyncImage(
                        model = reel.authorAvatar,
                        contentDescription = "Avatar",
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .border(1.5.dp, DeckKnobYellow, CircleShape)
                            .clickable { onOpenUserProfile(reel.authorId) },
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(DeckKnobYellow),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = reel.authorUsername.take(1).uppercase().ifEmpty { "D" },
                            fontWeight = FontWeight.Black,
                            color = DeckKnobBlack,
                            fontSize = 16.sp
                        )
                    }
                }

                Text(
                    text = "@${reel.authorUsername.ifEmpty { "selector" }}",
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    fontSize = 15.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.clickable { onOpenUserProfile(reel.authorId) }
                )

                if (reel.authorRole.isNotEmpty()) {
                    Box(
                        modifier = Modifier
                            .background(Color.White.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = reel.authorRole.uppercase(),
                            color = DeckKnobYellow,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp
                        )
                    }
                }
            }

            // Caption
            if (reel.caption.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                HashtagText(
                    text = reel.caption,
                    color = Color.White.copy(alpha = 0.92f),
                    highlightColor = Color(0xFFDFE104),
                    fontSize = 13.sp,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Audio Title Pill
            Spacer(modifier = Modifier.height(10.dp))
            val audioTitle = if (reel.music != null && reel.music.displayTitle.isNotEmpty()) {
                "${reel.music.displayTitle} • ${reel.music.displayArtist.ifEmpty { reel.authorUsername }}"
            } else {
                "Original Audio • @${reel.authorUsername.ifEmpty { "selector" }}"
            }

            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color.Black.copy(alpha = 0.6f))
                    .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(14.dp))
                    .padding(horizontal = 10.dp, vertical = 5.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.MusicNote,
                    contentDescription = "Soundtrack",
                    tint = DeckKnobYellow,
                    modifier = Modifier.size(14.dp)
                )
                Text(
                    text = audioTitle,
                    color = DeckKnobYellow,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun ActionRailItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    tint: Color,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(
            interactionSource = remember { MutableInteractionSource() },
            indication = null
        ) { onClick() }
    ) {
        Box(
            modifier = Modifier
                .size(46.dp)
                .clip(CircleShape)
                .background(Color.Black.copy(alpha = 0.5f))
                .border(1.dp, Color.White.copy(alpha = 0.12f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = tint,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KlypCommentsSheet(
    reel: ReelDto?,
    viewModel: ReelsViewModel,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = DeckKnobBlack,
        contentColor = Color.White,
        tonalElevation = 8.dp,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .navigationBarsPadding()
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "COMMENTS (${reel?.commentsCount ?: viewModel.comments.size})",
                    fontWeight = FontWeight.Black,
                    fontSize = 14.sp,
                    letterSpacing = 1.sp,
                    color = Color.White
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.Gray)
                }
            }
            HorizontalDivider(color = Color.White.copy(alpha = 0.1f))

            // Comments List
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 160.dp, max = 340.dp)
                    .padding(vertical = 12.dp)
            ) {
                if (viewModel.isLoadingComments) {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = DeckKnobYellow
                    )
                } else if (viewModel.comments.isEmpty()) {
                    Text(
                        text = "No comments yet. Drop the first beat!",
                        color = Color.Gray,
                        fontSize = 13.sp,
                        modifier = Modifier.align(Alignment.Center)
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        items(viewModel.comments) { comment ->
                            CommentRow(comment = comment)
                        }
                    }
                }
            }

            HorizontalDivider(color = Color.White.copy(alpha = 0.1f))

            // Add Comment Input
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp, bottom = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = viewModel.newCommentText,
                    onValueChange = { viewModel.newCommentText = it },
                    placeholder = { Text("Add a comment...", color = Color.Gray, fontSize = 13.sp) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(20.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = DeckKnobYellow,
                        unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    maxLines = 3
                )

                IconButton(
                    onClick = { viewModel.sendComment() },
                    enabled = viewModel.newCommentText.isNotBlank() && !viewModel.isSubmittingComment,
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(if (viewModel.newCommentText.isNotBlank()) DeckKnobYellow else Color.White.copy(alpha = 0.1f))
                ) {
                    if (viewModel.isSubmittingComment) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = DeckKnobBlack)
                    } else {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Send,
                            contentDescription = "Send",
                            tint = if (viewModel.newCommentText.isNotBlank()) DeckKnobBlack else Color.Gray,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CommentRow(comment: ReelCommentDto) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top
    ) {
        if (comment.authorAvatar.isNotEmpty()) {
            AsyncImage(
                model = comment.authorAvatar,
                contentDescription = null,
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )
        } else {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = comment.authorUsername.take(1).uppercase().ifEmpty { "U" },
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    fontSize = 12.sp
                )
            }
        }

        Column(modifier = Modifier.weight(1f)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "@${comment.authorUsername.ifEmpty { "selector" }}",
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    fontSize = 12.sp
                )
                Text(
                    text = formatCommentTimestamp(comment.createdAt),
                    color = Color.Gray,
                    fontSize = 10.sp
                )
            }
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = comment.text,
                color = Color.White.copy(alpha = 0.88f),
                fontSize = 13.sp,
                lineHeight = 17.sp
            )
        }
    }
}

@Composable
fun CreateKlypDialog(
    viewModel: ReelsViewModel,
    onDismiss: () -> Unit
) {
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        viewModel.newReelVideoUri = uri
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DeckKnobBlack,
        title = {
            Text(
                "CREATE KLYP",
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp,
                color = Color.White
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Upload short vertical videos up to 59s with underground DJ sets, clips or visuals.",
                    color = Color.Gray,
                    fontSize = 12.sp
                )
                OutlinedTextField(
                    value = viewModel.newReelCaption,
                    onValueChange = { viewModel.newReelCaption = it },
                    placeholder = { Text("Klyp caption & tags...", color = Color.Gray) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = DeckKnobYellow,
                        unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { launcher.launch("video/mp4") },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (viewModel.newReelVideoUri != null) DeckKnobYellow.copy(alpha = 0.2f) else Color.White.copy(alpha = 0.1f),
                            contentColor = if (viewModel.newReelVideoUri != null) DeckKnobYellow else Color.White
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.VideoLibrary, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (viewModel.newReelVideoUri != null) "VIDEO READY" else "PICK MP4", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = { viewModel.showMusicPicker = true },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (viewModel.newReelMusic != null) DeckKnobYellow.copy(alpha = 0.2f) else Color.White.copy(alpha = 0.1f),
                            contentColor = if (viewModel.newReelMusic != null) DeckKnobYellow else Color.White
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.MusicNote, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (viewModel.newReelMusic != null) "SOUNDTRACK" else "ADD AUDIO", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
                if (viewModel.newReelMusic != null) {
                    Text(
                        text = "♪ ${viewModel.newReelMusic?.title} • ${viewModel.newReelMusic?.artist}",
                        color = DeckKnobYellow,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { viewModel.submitReel() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = DeckKnobYellow,
                    contentColor = DeckKnobBlack
                ),
                shape = RoundedCornerShape(10.dp),
                enabled = !viewModel.isUploading && viewModel.newReelVideoUri != null
            ) {
                if (viewModel.isUploading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = DeckKnobBlack)
                } else {
                    Text("UPLOAD KLYP", fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("CANCEL", color = Color.Gray, fontWeight = FontWeight.Bold)
            }
        }
    )
}

private fun formatCount(count: Int): String {
    return when {
        count >= 1_000_000 -> String.format("%.1fM", count / 1_000_000.0)
        count >= 1_000 -> String.format("%.1fK", count / 1_000.0)
        else -> count.toString()
    }
}

private fun formatCommentTimestamp(date: Date?): String {
    if (date == null) return "just now"
    val diff = System.currentTimeMillis() - date.time
    val minutes = diff / (1000 * 60)
    return when {
        minutes < 1 -> "just now"
        minutes < 60 -> "${minutes}m"
        minutes < 1440 -> "${minutes / 60}h"
        else -> "${minutes / 1440}d"
    }
}

private fun shareKlyp(context: Context, reel: ReelDto) {
    try {
        val sendIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(
                Intent.EXTRA_TEXT,
                "Check out this Klyp by @${reel.authorUsername} on DECKKNOB!\n${reel.caption}\n${reel.displayMediaUrl}"
            )
            type = "text/plain"
        }
        val shareIntent = Intent.createChooser(sendIntent, "Share Klyp")
        context.startActivity(shareIntent)
    } catch (_: Exception) {}
}
