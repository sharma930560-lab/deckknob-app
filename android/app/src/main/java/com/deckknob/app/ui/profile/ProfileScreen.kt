package com.deckknob.app.ui.profile

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.deckknob.app.data.model.UserDto

private val GENRE_OPTIONS = listOf(
    "Techno", "House", "Afro House", "Electro", "Drum & Bass",
    "Jungle", "Breaks", "Hard Groove", "Ambient", "Experimental",
    "Hip-Hop", "Trap", "Bass Music", "Other"
)

@Composable
fun ProfileScreen(
    targetUid: String? = null,
    onBack: (() -> Unit)? = null,
    onSettingsClick: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel()
) {
    LaunchedEffect(targetUid) {
        viewModel.loadUserProfile(targetUid)
    }

    val user = viewModel.currentUser
    val context = LocalContext.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF09090B))
            .statusBarsPadding()
    ) {
        if (viewModel.isLoading && user == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFFDFE104))
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
            ) {
                // Top Header Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (onBack != null || viewModel.isOtherUser) {
                            IconButton(
                                onClick = { onBack?.invoke() },
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    Icons.Default.ArrowBack,
                                    contentDescription = "Back",
                                    tint = Color.White
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text(
                            text = if (viewModel.isOtherUser && user != null) "@${user.username.uppercase()}" else "DECKKNOB PROFILE",
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp,
                            letterSpacing = 1.sp,
                            color = Color.White
                        )
                    }
                    if (!viewModel.isOtherUser) {
                        IconButton(onClick = onSettingsClick) {
                            Icon(
                                Icons.Default.Settings,
                                contentDescription = "Settings",
                                tint = Color.White
                            )
                        }
                    }
                }

                // Cover Photo Banner
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color(0xFF27272A), Color(0xFF18181B), Color(0xFF09090B))
                            )
                        )
                        .clickable {
                            if (!user?.coverPhoto.isNullOrEmpty()) {
                                viewModel.showCoverViewer = true
                            }
                        }
                ) {
                    if (!user?.coverPhoto.isNullOrEmpty()) {
                        AsyncImage(
                            model = user?.coverPhoto,
                            contentDescription = "Cover Photo",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }

                    // Subtle bottom gradient overlay
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    listOf(Color.Transparent, Color(0xFF09090B).copy(alpha = 0.8f))
                                )
                            )
                    )
                }

                // Profile Avatar & Identity Section
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .offset(y = (-48).dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        // Avatar (Clickable to view full-screen)
                        Box(
                            modifier = Modifier
                                .size(96.dp)
                                .clip(CircleShape)
                                .border(3.dp, Color(0xFFDFE104), CircleShape)
                                .background(Color(0xFF18181B))
                                .clickable { viewModel.showAvatarViewer = true },
                            contentAlignment = Alignment.Center
                        ) {
                            if (!user?.profilePic.isNullOrEmpty()) {
                                AsyncImage(
                                    model = user?.profilePic,
                                    contentDescription = "Profile Picture",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Text(
                                    text = user?.username?.take(1)?.uppercase() ?: "D",
                                    fontSize = 36.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFFDFE104)
                                )
                            }
                        }

                        // Role & Live Badges
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFFDFE104).copy(alpha = 0.15f))
                                    .border(1.dp, Color(0xFFDFE104), RoundedCornerShape(8.dp))
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = (user?.role ?: "FAN").uppercase(),
                                    color = Color(0xFFDFE104),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    letterSpacing = 1.sp
                                )
                            }

                            if (user?.isLive == true) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color.Red.copy(alpha = 0.2f))
                                        .border(1.dp, Color.Red, RoundedCornerShape(8.dp))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = "LIVE",
                                        color = Color.Red,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Name & Username
                    Text(
                        text = user?.name?.ifEmpty { user.username } ?: "Artist",
                        fontWeight = FontWeight.Black,
                        fontSize = 22.sp,
                        color = Color.White
                    )
                    Text(
                        text = "@${user?.username ?: "deckknob"}",
                        color = Color.Gray,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )

                    // Genre & City Pill
                    if (!user?.city.isNullOrEmpty() || !user?.genre.isNullOrEmpty()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.MusicNote,
                                contentDescription = null,
                                tint = Color(0xFFDFE104),
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "${user?.genre?.ifEmpty { "Sound Artist" }} • ${user?.city?.ifEmpty { "Global" }}",
                                color = Color(0xFFE4E4E7),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

                    // Multiline Bio
                    if (!user?.bio.isNullOrEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = user.bio,
                            color = Color(0xFFA1A1AA),
                            fontSize = 13.sp,
                            lineHeight = 18.sp
                        )
                    }

                    // Social Links Row
                    val hasSocials = !user?.website.isNullOrEmpty() ||
                            !user?.instagram.isNullOrEmpty() ||
                            !user?.soundcloud.isNullOrEmpty()
                    if (hasSocials) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (!user?.website.isNullOrEmpty()) {
                                SocialChip(label = "Web: ${user.website}", icon = Icons.Default.Language)
                            }
                            if (!user?.instagram.isNullOrEmpty()) {
                                SocialChip(label = "@${user.instagram}", icon = Icons.Default.Share)
                            }
                            if (!user?.soundcloud.isNullOrEmpty()) {
                                SocialChip(label = "SoundCloud", icon = Icons.Default.Headphones)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Stats Counter Bar (Instagram / SoundCloud style)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF18181B).copy(alpha = 0.7f))
                            .border(1.dp, Color(0xFF27272A), RoundedCornerShape(12.dp))
                            .padding(vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        StatItem(count = viewModel.userPosts.size, label = "POSTS")
                        VerticalDivider(modifier = Modifier.height(28.dp), color = Color(0xFF27272A))
                        StatItem(count = viewModel.userKlyps.size, label = "KLYPS")
                        VerticalDivider(modifier = Modifier.height(28.dp), color = Color(0xFF27272A))
                        StatItem(count = user?.followersCount ?: 0, label = "FOLLOWERS")
                        VerticalDivider(modifier = Modifier.height(28.dp), color = Color(0xFF27272A))
                        StatItem(count = user?.followingCount ?: 0, label = "FOLLOWING")
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Action Buttons: Edit Profile & Share Profile
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (viewModel.isOtherUser) {
                            Button(
                                onClick = { viewModel.toggleFollow() },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(46.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (viewModel.isFollowingUser) Color(0xFF27272A) else Color(0xFFDFE104),
                                    contentColor = if (viewModel.isFollowingUser) Color.White else Color.Black
                                ),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(
                                    if (viewModel.isFollowingUser) Icons.Default.Check else Icons.Default.PersonAdd,
                                    contentDescription = null,
                                    tint = if (viewModel.isFollowingUser) Color.White else Color.Black,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    if (viewModel.isFollowingUser) "FOLLOWING" else "FOLLOW",
                                    color = if (viewModel.isFollowingUser) Color.White else Color.Black,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 13.sp
                                )
                            }
                        } else {
                            Button(
                                onClick = { viewModel.openEditProfile() },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(46.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFFDFE104),
                                    contentColor = Color.Black
                                ),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(
                                    Icons.Default.Edit,
                                    contentDescription = null,
                                    tint = Color.Black,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    "EDIT PROFILE",
                                    color = Color.Black,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 13.sp
                                )
                            }
                        }

                        Button(
                            onClick = {
                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(
                                        Intent.EXTRA_TEXT,
                                        "Check out @${user?.username ?: "artist"} on DECKKNOB! https://deckknob.com/@${user?.username}"
                                    )
                                }
                                context.startActivity(Intent.createChooser(shareIntent, "Share Profile"))
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(46.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF27272A),
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(
                                Icons.Default.Share,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                "SHARE PROFILE",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Content Tabs (Posts / Klyps / Saved / DJ Demos)
                    TabRow(
                        selectedTabIndex = viewModel.selectedTab,
                        containerColor = Color.Transparent,
                        contentColor = Color(0xFFDFE104),
                        indicator = { tabPositions ->
                            TabRowDefaults.Indicator(
                                Modifier.tabIndicatorOffset(tabPositions[viewModel.selectedTab]),
                                color = Color(0xFFDFE104),
                                height = 2.dp
                            )
                        },
                        divider = {
                            HorizontalDivider(color = Color(0xFF27272A))
                        }
                    ) {
                        Tab(
                            selected = viewModel.selectedTab == 0,
                            onClick = { viewModel.selectedTab = 0 },
                            icon = { Icon(Icons.Default.GridView, contentDescription = "Posts") }
                        )
                        Tab(
                            selected = viewModel.selectedTab == 1,
                            onClick = { viewModel.selectedTab = 1 },
                            icon = { Icon(Icons.Default.VideoLibrary, contentDescription = "Klyps") }
                        )
                        Tab(
                            selected = viewModel.selectedTab == 2,
                            onClick = { viewModel.selectedTab = 2 },
                            icon = { Icon(Icons.Default.BookmarkBorder, contentDescription = "Saved") }
                        )
                        Tab(
                            selected = viewModel.selectedTab == 3,
                            onClick = { viewModel.selectedTab = 3 },
                            icon = { Icon(Icons.Default.Headphones, contentDescription = "DJ Sets") }
                        )
                        Tab(
                            selected = viewModel.selectedTab == 4,
                            onClick = { viewModel.selectedTab = 4 },
                            icon = { Icon(Icons.Default.CalendarMonth, contentDescription = "Calendar") }
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Tab Content
                    when (viewModel.selectedTab) {
                        0 -> {
                            if (viewModel.userPosts.isEmpty()) {
                                EmptyTabState(
                                    icon = Icons.Default.PhotoLibrary,
                                    title = "NO POSTS YET",
                                    subtitle = "Moments and music updates you share will appear here."
                                )
                            } else {
                                LazyVerticalGrid(
                                    columns = GridCells.Fixed(3),
                                    modifier = Modifier.height(300.dp),
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    items(viewModel.userPosts) { post ->
                                        AsyncImage(
                                            model = post.mediaUrl,
                                            contentDescription = null,
                                            modifier = Modifier
                                                .aspectRatio(1f)
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(Color(0xFF18181B)),
                                            contentScale = ContentScale.Crop
                                        )
                                    }
                                }
                            }
                        }
                        1 -> {
                            if (viewModel.userKlyps.isEmpty()) {
                                EmptyTabState(
                                    icon = Icons.Default.PlayCircleOutline,
                                    title = "NO KLYPS RECORDED",
                                    subtitle = "Drop your 60s DJ cuts, transitions and booth energy."
                                )
                            } else {
                                LazyVerticalGrid(
                                    columns = GridCells.Fixed(3),
                                    modifier = Modifier.height(300.dp),
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    items(viewModel.userKlyps) { klyp ->
                                        Box(
                                            modifier = Modifier
                                                .aspectRatio(9f / 16f)
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Color(0xFF18181B))
                                                .border(0.5.dp, Color(0xFF27272A), RoundedCornerShape(8.dp))
                                        ) {
                                            val thumbSource = klyp.poster.ifEmpty { klyp.mediaUrl }
                                            AsyncImage(
                                                model = thumbSource,
                                                contentDescription = klyp.caption,
                                                modifier = Modifier.fillMaxSize(),
                                                contentScale = ContentScale.Crop
                                            )
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(48.dp)
                                                    .align(Alignment.BottomCenter)
                                                    .background(
                                                        Brush.verticalGradient(
                                                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f))
                                                        )
                                                    )
                                            )
                                            Row(
                                                modifier = Modifier
                                                    .align(Alignment.BottomStart)
                                                    .padding(6.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.PlayArrow,
                                                    contentDescription = null,
                                                    tint = Color(0xFFDFE104),
                                                    modifier = Modifier.size(14.dp)
                                                )
                                                Spacer(modifier = Modifier.width(2.dp))
                                                Text(
                                                    text = if (klyp.likesCount > 0) "${klyp.likesCount}" else "Klyp",
                                                    color = Color.White,
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        2 -> {
                            EmptyTabState(
                                icon = Icons.Default.BookmarkBorder,
                                title = "SAVED VAULT",
                                subtitle = "Only you can see what you've saved for later."
                            )
                        }
                        3 -> {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 4.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "DJ DEMOS & STEMS",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 14.sp,
                                        color = Color.White
                                    )
                                    Button(
                                        onClick = { viewModel.showUploadDemoDialog = true },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = Color(0xFFDFE104),
                                            contentColor = Color.Black
                                        ),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.Black)
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("NEW DEMO", fontWeight = FontWeight.Black, fontSize = 11.sp, color = Color.Black)
                                    }
                                }

                                if (viewModel.demoPlaylists.isEmpty()) {
                                    EmptyTabState(
                                        icon = Icons.Default.Headphones,
                                        title = "NO DJ DEMOS UPLOADED",
                                        subtitle = "Drop unreleased club cuts, transitions or studio stems."
                                    )
                                } else {
                                    Column(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        viewModel.demoPlaylists.forEach { playlist ->
                                            Text(
                                                text = playlist.title.uppercase(),
                                                color = Color(0xFFDFE104),
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp,
                                                letterSpacing = 1.sp
                                            )
                                            playlist.tracks.forEach { track ->
                                                Card(
                                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF18181B)),
                                                    shape = RoundedCornerShape(12.dp),
                                                    modifier = Modifier.fillMaxWidth()
                                                ) {
                                                    Row(
                                                        modifier = Modifier
                                                            .fillMaxWidth()
                                                            .padding(12.dp),
                                                        verticalAlignment = Alignment.CenterVertically,
                                                        horizontalArrangement = Arrangement.SpaceBetween
                                                    ) {
                                                        Row(
                                                            verticalAlignment = Alignment.CenterVertically,
                                                            modifier = Modifier.weight(1f)
                                                        ) {
                                                            Box(
                                                                modifier = Modifier
                                                                    .size(40.dp)
                                                                    .clip(CircleShape)
                                                                    .background(Color(0xFF27272A)),
                                                                contentAlignment = Alignment.Center
                                                            ) {
                                                                Icon(
                                                                    Icons.Default.Audiotrack,
                                                                    contentDescription = null,
                                                                    tint = Color(0xFFDFE104),
                                                                    modifier = Modifier.size(20.dp)
                                                                )
                                                            }
                                                            Spacer(modifier = Modifier.width(12.dp))
                                                            Column {
                                                                Text(
                                                                    text = track.title,
                                                                    color = Color.White,
                                                                    fontWeight = FontWeight.Bold,
                                                                    fontSize = 14.sp
                                                                )
                                                                val details = buildString {
                                                                    if (track.bpm != null) append("${track.bpm} BPM • ")
                                                                    if (!track.key.isNullOrEmpty()) append("${track.key} • ")
                                                                    append("${track.duration}s")
                                                                }
                                                                Text(
                                                                    text = details,
                                                                    color = Color.Gray,
                                                                    fontSize = 11.sp
                                                                )
                                                            }
                                                        }

                                                        IconButton(
                                                            onClick = {
                                                                if (viewModel.activePlayingTrackUrl == track.audioUrl) {
                                                                    viewModel.activePlayingTrackUrl = null
                                                                } else {
                                                                    viewModel.activePlayingTrackUrl = track.audioUrl
                                                                }
                                                            },
                                                            modifier = Modifier
                                                                .size(36.dp)
                                                                .clip(CircleShape)
                                                                .background(if (viewModel.activePlayingTrackUrl == track.audioUrl) Color(0xFFDFE104) else Color(0xFF27272A))
                                                        ) {
                                                            Icon(
                                                                imageVector = if (viewModel.activePlayingTrackUrl == track.audioUrl) Icons.Default.Pause else Icons.Default.PlayArrow,
                                                                contentDescription = "Play/Pause Demo",
                                                                tint = if (viewModel.activePlayingTrackUrl == track.audioUrl) Color.Black else Color.White,
                                                                modifier = Modifier.size(18.dp)
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        4 -> {
                            DJCalendarTabContent(
                                viewModel = viewModel,
                                isOwner = !viewModel.isOtherUser
                            )
                        }
                    }
                }
            }
        }

        // Full Screen Avatar Viewer Dialog
        if (viewModel.showAvatarViewer) {
            FullScreenMediaViewer(
                title = "${user?.username ?: "User"}'s Avatar",
                mediaUrl = user?.profilePic,
                fallbackLetter = user?.username?.take(1)?.uppercase() ?: "D",
                onDismiss = { viewModel.showAvatarViewer = false }
            )
        }

        // Full Screen Cover Viewer Dialog
        if (viewModel.showCoverViewer) {
            FullScreenMediaViewer(
                title = "${user?.username ?: "User"}'s Cover Banner",
                mediaUrl = user?.coverPhoto,
                fallbackLetter = "C",
                onDismiss = { viewModel.showCoverViewer = false }
            )
        }

        // Upload DJ Demo Dialog
        if (viewModel.showUploadDemoDialog) {
            UploadDemoDialog(
                viewModel = viewModel,
                onDismiss = { viewModel.showUploadDemoDialog = false }
            )
        }

        // Advanced Instagram-Level Edit Profile Dialog
        if (viewModel.showEditProfileDialog) {
            EditProfileDialog(
                viewModel = viewModel,
                onDismiss = { viewModel.showEditProfileDialog = false }
            )
        }
    }
}

@Composable
private fun StatItem(count: Int, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = count.toString(),
            color = Color.White,
            fontWeight = FontWeight.Black,
            fontSize = 17.sp
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            color = Color(0xFFA1A1AA),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.5.sp
        )
    }
}

@Composable
private fun SocialChip(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(Color(0xFF18181B))
            .border(1.dp, Color(0xFF27272A), RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = Color(0xFFDFE104), modifier = Modifier.size(12.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = label,
            color = Color.LightGray,
            fontSize = 11.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun EmptyTabState(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 40.dp, horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = Color(0xFF3F3F46),
            modifier = Modifier.size(48.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = title,
            color = Color.White,
            fontWeight = FontWeight.Black,
            fontSize = 14.sp,
            letterSpacing = 1.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = subtitle,
            color = Color.Gray,
            fontSize = 12.sp,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun FullScreenMediaViewer(
    title: String,
    mediaUrl: String?,
    fallbackLetter: String,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.95f))
        ) {
            // Top Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                }
            }

            // Image Content
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                if (!mediaUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model = mediaUrl,
                        contentDescription = title,
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(1f)
                            .clip(RoundedCornerShape(16.dp)),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(160.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF18181B))
                            .border(2.dp, Color(0xFFDFE104), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = fallbackLetter,
                            fontSize = 64.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFFDFE104)
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileDialog(
    viewModel: ProfileViewModel,
    onDismiss: () -> Unit
) {
    val avatarPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) viewModel.editAvatarUri = uri
    }
    val coverPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) viewModel.editCoverUri = uri
    }

    var genreExpanded by remember { mutableStateOf(false) }

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
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp)
            ) {
                // Dialog Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "EDIT PROFILE",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 20.sp,
                        letterSpacing = 1.sp
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                    }
                }

                HorizontalDivider(color = Color(0xFF27272A), modifier = Modifier.padding(vertical = 12.dp))

                // Error Banner
                if (viewModel.error != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color.Red.copy(alpha = 0.15f))
                            .border(1.dp, Color.Red, RoundedCornerShape(10.dp))
                            .padding(12.dp)
                    ) {
                        Text(
                            text = "⚠ ${viewModel.error}",
                            color = Color(0xFFFF6B6B),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }

                // Photos Section
                Text(
                    text = "PHOTOS & BRANDING",
                    color = Color(0xFFDFE104),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.5.sp
                )
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Profile Photo Box
                    Box(
                        modifier = Modifier
                            .size(76.dp)
                            .clip(CircleShape)
                            .border(2.dp, Color(0xFFDFE104), CircleShape)
                            .background(Color(0xFF18181B)),
                        contentAlignment = Alignment.Center
                    ) {
                        val model = viewModel.editAvatarUri ?: viewModel.currentUser?.profilePic
                        if (model != null && model.toString().isNotEmpty()) {
                            AsyncImage(
                                model = model,
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Text("DJ", color = Color(0xFFDFE104), fontWeight = FontWeight.Black)
                        }
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Button(
                            onClick = { avatarPicker.launch("image/*") },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF27272A),
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.PhotoCamera, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                if (viewModel.editAvatarUri != null) "NEW AVATAR CHOSEN" else "CHANGE AVATAR",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Button(
                            onClick = { coverPicker.launch("image/*") },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF18181B),
                                contentColor = Color.LightGray
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Image, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                if (viewModel.editCoverUri != null) "NEW COVER CHOSEN" else "CHANGE COVER BANNER",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Basic Info Section
                Text(
                    text = "BASIC IDENTITY",
                    color = Color(0xFFDFE104),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.5.sp
                )
                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = viewModel.editName,
                    onValueChange = { viewModel.editName = it },
                    label = { Text("Display Name / Artist Name", color = Color.Gray) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFDFE104),
                        unfocusedBorderColor = Color(0xFF3F3F46),
                        focusedContainerColor = Color(0xFF18181B),
                        unfocusedContainerColor = Color(0xFF18181B)
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = viewModel.editBio,
                    onValueChange = { viewModel.editBio = it },
                    label = { Text("Bio (Multiline)", color = Color.Gray) },
                    minLines = 3,
                    maxLines = 5,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFDFE104),
                        unfocusedBorderColor = Color(0xFF3F3F46),
                        focusedContainerColor = Color(0xFF18181B),
                        unfocusedContainerColor = Color(0xFF18181B)
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(modifier = Modifier.height(20.dp))

                // DJ & Scene Info Section
                Text(
                    text = "DJ & SCENE INFO",
                    color = Color(0xFFDFE104),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.5.sp
                )
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = viewModel.editCity,
                        onValueChange = { viewModel.editCity = it },
                        label = { Text("City (e.g. Berlin)", color = Color.Gray) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFFDFE104),
                            unfocusedBorderColor = Color(0xFF3F3F46),
                            focusedContainerColor = Color(0xFF18181B),
                            unfocusedContainerColor = Color(0xFF18181B)
                        ),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    )

                    // Genre Selector
                    ExposedDropdownMenuBox(
                        expanded = genreExpanded,
                        onExpandedChange = { genreExpanded = it },
                        modifier = Modifier.weight(1f)
                    ) {
                        OutlinedTextField(
                            value = viewModel.editGenre,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Genre", color = Color.Gray) },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = genreExpanded) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFFDFE104),
                                unfocusedBorderColor = Color(0xFF3F3F46),
                                focusedContainerColor = Color(0xFF18181B),
                                unfocusedContainerColor = Color(0xFF18181B)
                            ),
                            modifier = Modifier.menuAnchor(),
                            shape = RoundedCornerShape(10.dp)
                        )
                        ExposedDropdownMenu(
                            expanded = genreExpanded,
                            onDismissRequest = { genreExpanded = false },
                            modifier = Modifier.background(Color(0xFF18181B))
                        ) {
                            GENRE_OPTIONS.forEach { genre ->
                                DropdownMenuItem(
                                    text = { Text(genre, color = Color.White) },
                                    onClick = {
                                        viewModel.editGenre = genre
                                        genreExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Role Selector (DJ, Producer, Fan)
                Text("Role / Profile Type:", color = Color.Gray, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("dj" to "DJ", "producer" to "Producer", "fan" to "Fan").forEach { (roleKey, roleLabel) ->
                        val isSelected = viewModel.editRole.equals(roleKey, ignoreCase = true)
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) Color(0xFFDFE104) else Color(0xFF18181B))
                                .border(
                                    1.dp,
                                    if (isSelected) Color(0xFFDFE104) else Color(0xFF3F3F46),
                                    RoundedCornerShape(8.dp)
                                )
                                .clickable { viewModel.editRole = roleKey }
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = roleLabel,
                                color = if (isSelected) Color.Black else Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Social Links Section
                Text(
                    text = "SOCIAL & MUSIC LINKS",
                    color = Color(0xFFDFE104),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.5.sp
                )
                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = viewModel.editInstagram,
                    onValueChange = { viewModel.editInstagram = it },
                    label = { Text("Instagram handle (without @)", color = Color.Gray) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFDFE104),
                        unfocusedBorderColor = Color(0xFF3F3F46),
                        focusedContainerColor = Color(0xFF18181B),
                        unfocusedContainerColor = Color(0xFF18181B)
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = viewModel.editSoundcloud,
                    onValueChange = { viewModel.editSoundcloud = it },
                    label = { Text("SoundCloud profile or URL", color = Color.Gray) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFDFE104),
                        unfocusedBorderColor = Color(0xFF3F3F46),
                        focusedContainerColor = Color(0xFF18181B),
                        unfocusedContainerColor = Color(0xFF18181B)
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = viewModel.editWebsite,
                    onValueChange = { viewModel.editWebsite = it },
                    label = { Text("Website / Linktree URL", color = Color.Gray) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFDFE104),
                        unfocusedBorderColor = Color(0xFF3F3F46),
                        focusedContainerColor = Color(0xFF18181B),
                        unfocusedContainerColor = Color(0xFF18181B)
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(modifier = Modifier.height(28.dp))

                // HIGH CONTRAST YELLOW SAVE BUTTON (Black text on yellow background)
                Button(
                    onClick = { viewModel.saveProfile() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFDFE104),
                        contentColor = Color.Black
                    ),
                    enabled = !viewModel.isSaving,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (viewModel.isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            color = Color.Black,
                            strokeWidth = 2.5.dp
                        )
                    } else {
                        Text(
                            text = "SAVE CHANGES",
                            color = Color.Black,
                            fontWeight = FontWeight.Black,
                            fontSize = 15.sp,
                            letterSpacing = 1.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedButton(
                    onClick = onDismiss,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.LightGray),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(Color(0xFF3F3F46))
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("CANCEL", color = Color.LightGray, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
fun UploadDemoDialog(
    viewModel: ProfileViewModel,
    onDismiss: () -> Unit
) {
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        viewModel.newDemoAudioUri = uri
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                "UPLOAD DJ DEMO / STEM",
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 17.sp,
                letterSpacing = 1.sp
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Upload unreleased originals or live sets directly to your DJ profile.",
                    color = Color.Gray,
                    fontSize = 12.sp
                )
                OutlinedTextField(
                    value = viewModel.newDemoTitle,
                    onValueChange = { viewModel.newDemoTitle = it },
                    placeholder = { Text("Track Title (e.g. Acid Sunrise)", color = Color.Gray) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFFDFE104),
                        unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = viewModel.newDemoBpm,
                        onValueChange = { viewModel.newDemoBpm = it },
                        placeholder = { Text("BPM (e.g. 132)", color = Color.Gray) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFFDFE104),
                            unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                    OutlinedTextField(
                        value = viewModel.newDemoKey,
                        onValueChange = { viewModel.newDemoKey = it },
                        placeholder = { Text("Key (e.g. F#m)", color = Color.Gray) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFFDFE104),
                            unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                }
                Button(
                    onClick = { launcher.launch("audio/*") },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (viewModel.newDemoAudioUri != null) Color(0xFFDFE104).copy(alpha = 0.2f) else Color.White.copy(alpha = 0.1f),
                        contentColor = if (viewModel.newDemoAudioUri != null) Color(0xFFDFE104) else Color.White
                    ),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Audiotrack, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        if (viewModel.newDemoAudioUri != null) "AUDIO FILE SELECTED" else "SELECT AUDIO FILE",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { viewModel.uploadDemoTrack() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFDFE104),
                    contentColor = Color.Black
                ),
                shape = RoundedCornerShape(10.dp),
                enabled = !viewModel.isUploadingDemo && viewModel.newDemoAudioUri != null && viewModel.newDemoTitle.isNotBlank()
            ) {
                if (viewModel.isUploadingDemo) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.Black)
                } else {
                    Text("PUBLISH DEMO", color = Color.Black, fontWeight = FontWeight.Black)
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
