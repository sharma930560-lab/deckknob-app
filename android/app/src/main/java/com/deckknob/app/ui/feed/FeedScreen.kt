package com.deckknob.app.ui.feed



import android.net.Uri

import androidx.activity.compose.rememberLauncherForActivityResult

import androidx.activity.result.contract.ActivityResultContracts

import androidx.compose.foundation.background

import androidx.compose.foundation.border

import androidx.compose.foundation.clickable

import androidx.compose.foundation.gestures.detectTapGestures

import androidx.compose.foundation.layout.*

import androidx.compose.foundation.lazy.LazyColumn

import androidx.compose.foundation.lazy.LazyRow

import androidx.compose.foundation.lazy.items

import androidx.compose.foundation.shape.CircleShape

import androidx.compose.foundation.shape.RoundedCornerShape

import androidx.compose.material.icons.Icons

import androidx.compose.material.icons.filled.*

import androidx.compose.material.icons.outlined.Whatshot

import androidx.compose.material3.*

import androidx.compose.runtime.*

import androidx.compose.ui.Alignment

import androidx.compose.ui.Modifier

import androidx.compose.ui.draw.clip

import androidx.compose.ui.geometry.Offset

import androidx.compose.ui.graphics.Brush

import androidx.compose.ui.graphics.Color

import androidx.compose.ui.input.pointer.pointerInput

import androidx.compose.ui.layout.ContentScale

import androidx.compose.ui.text.font.FontWeight

import androidx.compose.ui.text.style.TextAlign

import androidx.compose.ui.text.style.TextOverflow

import androidx.compose.ui.unit.dp

import androidx.compose.ui.unit.sp

import androidx.hilt.navigation.compose.hiltViewModel

import coil.compose.AsyncImage

import com.deckknob.app.data.model.EventDto

import com.deckknob.app.data.model.PostDto

import com.deckknob.app.data.model.UserDto

import com.deckknob.app.ui.components.DeckKnobLogo

import com.deckknob.app.ui.components.FireReactionOverlay

import com.deckknob.app.ui.components.HashtagText

import com.deckknob.app.ui.components.LogoVariant

import com.deckknob.app.ui.components.MusicPickerSheet

import com.deckknob.app.ui.components.NotificationHubSheet

import com.deckknob.app.ui.stories.StoriesStrip

import com.deckknob.app.ui.theme.DeckKnobBlack

import com.deckknob.app.ui.theme.DeckKnobDarkCard

import com.deckknob.app.ui.theme.DeckKnobYellow



@Composable

fun FeedScreen(

    onOpenCamera: () -> Unit = {},

    onOpenUserProfile: (String) -> Unit = {},

    onOpenEventDetails: (String) -> Unit = {},

    onNavigateToEvents: () -> Unit = {},

    onOpenMessages: () -> Unit = {},

    viewModel: FeedViewModel = hiltViewModel()

) {

    Scaffold(

        containerColor = DeckKnobBlack,

        floatingActionButton = {

            FloatingActionButton(

                onClick = { viewModel.showCreatePostDialog = true },

                containerColor = DeckKnobYellow,

                contentColor = DeckKnobBlack,

                shape = CircleShape

            ) {

                Icon(Icons.Default.Add, contentDescription = "New Post")

            }

        }

    ) { padding ->

        Column(

            modifier = Modifier

                .fillMaxSize()

                .padding(padding)

                .statusBarsPadding()

        ) {

            // Header Bar: Brand Logo + Notification Bell + Camera Action

            Row(

                modifier = Modifier

                    .fillMaxWidth()

                    .padding(horizontal = 16.dp, vertical = 8.dp),

                verticalAlignment = Alignment.CenterVertically,

                horizontalArrangement = Arrangement.SpaceBetween

            ) {

                DeckKnobLogo(variant = LogoVariant.Header)



                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {

                    // Direct Messages
                    IconButton(
                        onClick = onOpenMessages,
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.08f))
                    ) {
                        Icon(
                            imageVector = Icons.Default.Email,
                            contentDescription = "Messages",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    // Notification Bell

                    IconButton(

                        onClick = { viewModel.showNotificationHub = true },

                        modifier = Modifier

                            .size(38.dp)

                            .clip(CircleShape)

                            .background(Color.White.copy(alpha = 0.08f))

                    ) {

                        BadgedBox(

                            badge = {

                                if (viewModel.notifications.isNotEmpty()) {

                                    Badge(

                                        containerColor = DeckKnobYellow,

                                        contentColor = Color.Black

                                    ) {

                                        Text(

                                            text = viewModel.notifications.size.toString(),

                                            fontSize = 9.sp,

                                            fontWeight = FontWeight.Black

                                        )

                                    }

                                }

                            }

                        ) {

                            Icon(

                                imageVector = Icons.Default.Notifications,

                                contentDescription = "Notifications",

                                tint = if (viewModel.notifications.isNotEmpty()) DeckKnobYellow else Color.White,

                                modifier = Modifier.size(20.dp)

                            )

                        }

                    }



                    // Camera Button

                    IconButton(

                        onClick = onOpenCamera,

                        modifier = Modifier

                            .size(38.dp)

                            .clip(CircleShape)

                            .background(Color.White.copy(alpha = 0.08f))

                    ) {

                        Icon(

                            imageVector = Icons.Default.PhotoCamera,

                            contentDescription = "Open Camera",

                            tint = DeckKnobYellow,

                            modifier = Modifier.size(20.dp)

                        )

                    }

                }

            }



            HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)



            LazyColumn(

                modifier = Modifier.fillMaxSize(),

                contentPadding = PaddingValues(bottom = 80.dp)

            ) {

                // 1. Editorial Hero Banner (Website Parity)

                item {

                    Box(

                        modifier = Modifier

                            .fillMaxWidth()

                            .background(

                                Brush.verticalGradient(

                                    colors = listOf(

                                        Color(0xFF141416),

                                        Color(0xFF09090B)

                                    )

                                )

                            )

                            .padding(horizontal = 16.dp, vertical = 14.dp)

                    ) {

                        Column {

                            Text(

                                text = "LIVE FROM THE UNDERGROUND",

                                fontSize = 10.sp,

                                fontWeight = FontWeight.Black,

                                letterSpacing = 2.sp,

                                color = DeckKnobYellow

                            )

                            Spacer(modifier = Modifier.height(4.dp))

                            Text(

                                text = "DROP THE NIGHT",

                                fontSize = 28.sp,

                                fontWeight = FontWeight.Black,

                                letterSpacing = (-0.5).sp,

                                color = Color.White

                            )

                            Spacer(modifier = Modifier.height(10.dp))



                            // Running ticker banner pill

                            Box(

                                modifier = Modifier

                                    .fillMaxWidth()

                                    .clip(RoundedCornerShape(20.dp))

                                    .background(Color.White.copy(alpha = 0.04f))

                                    .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(20.dp))

                                    .padding(horizontal = 14.dp, vertical = 6.dp)

                            ) {

                                Text(

                                    text = "Techno  /  House  /  Klyps  /  Events  /  Backstage  /  Lineups  /  Tonight",

                                    fontSize = 10.sp,

                                    fontWeight = FontWeight.Bold,

                                    letterSpacing = 1.sp,

                                    color = Color.Gray,

                                    maxLines = 1,

                                    overflow = TextOverflow.Ellipsis

                                )

                            }

                        }

                    }

                    HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)

                }



                // 2. Stories Strip

                item {

                    StoriesStrip()

                    HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)

                }



                // 3. Music-Scene Category Filters (Horizontal Chips)

                item {

                    LazyRow(

                        modifier = Modifier

                            .fillMaxWidth()

                            .background(Color(0xFF09090B))

                            .padding(horizontal = 16.dp, vertical = 10.dp),

                        horizontalArrangement = Arrangement.spacedBy(8.dp)

                    ) {

                        items(GENRE_TABS) { genre ->

                            val isSelected = viewModel.activeGenre == genre

                            Box(

                                modifier = Modifier

                                    .clip(RoundedCornerShape(20.dp))

                                    .background(if (isSelected) DeckKnobYellow else Color.White.copy(alpha = 0.04f))

                                    .border(

                                        1.dp,

                                        if (isSelected) DeckKnobYellow else Color.White.copy(alpha = 0.12f),

                                        RoundedCornerShape(20.dp)

                                    )

                                    .clickable { viewModel.activeGenre = genre }

                                    .padding(horizontal = 14.dp, vertical = 6.dp)

                            ) {

                                Text(

                                    text = genre.uppercase(),

                                    fontSize = 10.sp,

                                    fontWeight = FontWeight.Black,

                                    letterSpacing = 1.sp,

                                    color = if (isSelected) Color.Black else Color.LightGray

                                )

                            }

                        }

                    }

                    HorizontalDivider(color = Color.White.copy(alpha = 0.06f), thickness = 1.dp)

                }



                // 4. Upcoming Events Carousel (Tonight's Gigs)

                if (viewModel.upcomingEvents.isNotEmpty()) {

                    item {

                        Column(

                            modifier = Modifier

                                .fillMaxWidth()

                                .padding(vertical = 12.dp)

                        ) {

                            Row(

                                modifier = Modifier

                                    .fillMaxWidth()

                                    .padding(horizontal = 16.dp),

                                horizontalArrangement = Arrangement.SpaceBetween,

                                verticalAlignment = Alignment.CenterVertically

                            ) {

                                Text(

                                    text = "TONIGHT'S GIGS",

                                    fontSize = 11.sp,

                                    fontWeight = FontWeight.Black,

                                    letterSpacing = 1.5.sp,

                                    color = DeckKnobYellow

                                )

                                Text(

                                    text = "See all →",

                                    fontSize = 11.sp,

                                    fontWeight = FontWeight.Bold,

                                    color = Color.Gray,

                                    modifier = Modifier.clickable { onNavigateToEvents() }

                                )

                            }



                            Spacer(modifier = Modifier.height(10.dp))



                            LazyRow(

                                contentPadding = PaddingValues(horizontal = 16.dp),

                                horizontalArrangement = Arrangement.spacedBy(12.dp)

                            ) {

                                items(viewModel.upcomingEvents) { event ->

                                    UpcomingEventMiniCard(

                                        event = event,

                                        onCardClick = { onOpenEventDetails(event.id) }

                                    )

                                }

                            }

                        }

                        HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)

                    }

                }



                // 5. Scene Radar (DJ Discovery Section)

                if (viewModel.sceneRadarDjs.isNotEmpty()) {

                    item {

                        Column(

                            modifier = Modifier

                                .fillMaxWidth()

                                .padding(vertical = 12.dp)

                        ) {

                            Row(

                                modifier = Modifier

                                    .fillMaxWidth()

                                    .padding(horizontal = 16.dp),

                                horizontalArrangement = Arrangement.SpaceBetween,

                                verticalAlignment = Alignment.CenterVertically

                            ) {

                                Row(verticalAlignment = Alignment.CenterVertically) {

                                    Text(

                                        text = "SCENE RADAR",

                                        fontSize = 11.sp,

                                        fontWeight = FontWeight.Black,

                                        letterSpacing = 1.5.sp,

                                        color = Color.White

                                    )

                                    Spacer(modifier = Modifier.width(6.dp))

                                    Text(text = "⚡", fontSize = 11.sp)

                                }

                                Text(

                                    text = "Trending DJs",

                                    fontSize = 10.sp,

                                    fontWeight = FontWeight.Bold,

                                    color = Color.Gray

                                )

                            }



                            Spacer(modifier = Modifier.height(10.dp))



                            LazyRow(

                                contentPadding = PaddingValues(horizontal = 16.dp),

                                horizontalArrangement = Arrangement.spacedBy(10.dp)

                            ) {

                                items(viewModel.sceneRadarDjs) { dj ->

                                    val isFollowed = viewModel.followedDjs.contains(dj.uid)

                                    SceneRadarDjCard(

                                        dj = dj,

                                        isFollowed = isFollowed,

                                        onToggleFollow = { viewModel.toggleFollowDj(dj.uid) },

                                        onOpenProfile = {

                                            if (dj.uid.isNotBlank()) onOpenUserProfile(dj.uid)

                                        }

                                    )

                                }

                            }

                        }

                        HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)

                    }

                }



                // 6. Social Feed Posts

                if (viewModel.isLoading && viewModel.posts.isEmpty()) {

                    item {

                        Box(

                            modifier = Modifier

                                .fillMaxWidth()

                                .padding(48.dp),

                            contentAlignment = Alignment.Center

                        ) {

                            CircularProgressIndicator(color = DeckKnobYellow, modifier = Modifier.size(32.dp))

                        }

                    }

                } else if (viewModel.filteredPosts.isEmpty()) {

                    item {

                        Box(

                            modifier = Modifier

                                .fillMaxWidth()

                                .padding(vertical = 48.dp, horizontal = 24.dp),

                            contentAlignment = Alignment.Center

                        ) {

                            Column(horizontalAlignment = Alignment.CenterHorizontally) {

                                Text(text = "🎚️", fontSize = 32.sp)

                                Spacer(modifier = Modifier.height(8.dp))

                                Text(

                                    text = if (viewModel.activeGenre == "All") "NO POSTS YET" else "NO ${viewModel.activeGenre.uppercase()} POSTS",

                                    fontWeight = FontWeight.Bold,

                                    fontSize = 13.sp,

                                    letterSpacing = 1.sp,

                                    color = Color.LightGray

                                )

                                Spacer(modifier = Modifier.height(4.dp))

                                Text(

                                    text = "Be the first underground DJ to share track drops, set transitions, and booth signals.",

                                    fontSize = 11.sp,

                                    color = Color.Gray,

                                    textAlign = TextAlign.Center

                                )

                            }

                        }

                    }

                } else {

                    items(viewModel.filteredPosts, key = { it.id }) { post ->

                        PostCard(

                            post = post,

                            onToggleLike = { viewModel.toggleLike(post) },

                            onOpenAuthorProfile = { authorUid ->

                                if (authorUid.isNotBlank()) onOpenUserProfile(authorUid)

                            }

                        )

                    }

                }

            }

        }



        // Notification Hub Bottom Sheet

        if (viewModel.showNotificationHub) {

            NotificationHubSheet(

                notifications = viewModel.notifications,

                isLoading = viewModel.isNotificationsLoading,

                onDismiss = { viewModel.showNotificationHub = false }

            )

        }



        // Create Post Dialog

        if (viewModel.showCreatePostDialog && !viewModel.showMusicPicker) {

            CreatePostDialog(

                caption = viewModel.newPostCaption,

                onCaptionChange = { viewModel.newPostCaption = it },

                mediaUri = viewModel.newPostMediaUri,

                onMediaSelected = { viewModel.newPostMediaUri = it },

                selectedMusic = viewModel.newPostMusic,

                onOpenMusicPicker = { viewModel.showMusicPicker = true },

                onRemoveMusic = { viewModel.newPostMusic = null },

                isPosting = viewModel.isPosting,

                onDismiss = { viewModel.showCreatePostDialog = false },

                onSubmit = { viewModel.submitPost() }

            )

        }



        // Attached Music Soundtrack Picker

        if (viewModel.showMusicPicker) {

            MusicPickerSheet(

                onTrackSelected = { track ->

                    viewModel.newPostMusic = track

                    viewModel.showMusicPicker = false

                },

                onDismiss = { viewModel.showMusicPicker = false }

            )

        }

    }

}



@Composable

fun UpcomingEventMiniCard(

    event: EventDto,

    onCardClick: () -> Unit = {},

    onRsvpClick: () -> Unit = {}

) {

    Box(

        modifier = Modifier

            .width(220.dp)

            .clip(RoundedCornerShape(16.dp))

            .background(Color(0xFF141416))

            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))

            .clickable { onCardClick() }

            .padding(12.dp)

    ) {

        val flyer = if (event.image.isNotBlank()) event.image else event.media_url

        Column {

            if (flyer.isNotBlank()) {

                AsyncImage(

                    model = flyer,

                    contentDescription = event.title,

                    modifier = Modifier

                        .fillMaxWidth()

                        .height(90.dp)

                        .clip(RoundedCornerShape(10.dp)),

                    contentScale = ContentScale.Crop

                )

                Spacer(modifier = Modifier.height(8.dp))

            }



            Text(

                text = event.title,

                fontSize = 13.sp,

                fontWeight = FontWeight.Bold,

                color = Color.White,

                maxLines = 1,

                overflow = TextOverflow.Ellipsis

            )



            Spacer(modifier = Modifier.height(2.dp))



            Text(

                text = "${event.venue}${if (event.city.isNotBlank()) " • " + event.city else ""}",

                fontSize = 11.sp,

                color = Color.Gray,

                maxLines = 1,

                overflow = TextOverflow.Ellipsis

            )



            Spacer(modifier = Modifier.height(8.dp))



            Row(

                modifier = Modifier.fillMaxWidth(),

                horizontalArrangement = Arrangement.SpaceBetween,

                verticalAlignment = Alignment.CenterVertically

            ) {

                Text(

                    text = event.date.ifBlank { "TONIGHT" },

                    fontSize = 10.sp,

                    fontWeight = FontWeight.Black,

                    color = DeckKnobYellow

                )



                Box(

                    modifier = Modifier

                        .clip(RoundedCornerShape(8.dp))

                        .background(DeckKnobYellow)

                        .clickable { onRsvpClick() }

                        .padding(horizontal = 8.dp, vertical = 3.dp)

                ) {

                    Text(

                        text = "RSVP",

                        fontSize = 9.sp,

                        fontWeight = FontWeight.Black,

                        color = Color.Black

                    )

                }

            }

        }

    }

}



@Composable

fun SceneRadarDjCard(

    dj: UserDto,

    isFollowed: Boolean,

    onToggleFollow: () -> Unit,

    onOpenProfile: () -> Unit = {}

) {

    Box(

        modifier = Modifier

            .width(130.dp)

            .clip(RoundedCornerShape(16.dp))

            .background(Color(0xFF141416))

            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))

            .clickable { onOpenProfile() }

            .padding(12.dp)

    ) {

        Column(

            horizontalAlignment = Alignment.CenterHorizontally,

            modifier = Modifier.fillMaxWidth()

        ) {

            AsyncImage(

                model = dj.profilePic ?: "",

                contentDescription = dj.username,

                modifier = Modifier

                    .size(52.dp)

                    .clip(CircleShape)

                    .background(Color(0xFF27272A)),

                contentScale = ContentScale.Crop

            )



            Spacer(modifier = Modifier.height(8.dp))



            Text(

                text = "@${dj.username}",

                fontSize = 12.sp,

                fontWeight = FontWeight.Bold,

                color = Color.White,

                maxLines = 1,

                overflow = TextOverflow.Ellipsis

            )



            Text(

                text = dj.genre.ifBlank { dj.role.ifBlank { "DJ" } }.uppercase(),

                fontSize = 9.sp,

                fontWeight = FontWeight.Black,

                color = DeckKnobYellow,

                maxLines = 1

            )



            Spacer(modifier = Modifier.height(8.dp))



            Button(

                onClick = onToggleFollow,

                modifier = Modifier

                    .fillMaxWidth()

                    .height(28.dp),

                contentPadding = PaddingValues(0.dp),

                colors = ButtonDefaults.buttonColors(

                    containerColor = if (isFollowed) Color.White.copy(alpha = 0.1f) else DeckKnobYellow,

                    contentColor = if (isFollowed) Color.White else Color.Black

                ),

                shape = RoundedCornerShape(8.dp)

            ) {

                Text(

                    text = if (isFollowed) "Following" else "Follow",

                    fontSize = 10.sp,

                    fontWeight = FontWeight.Black

                )

            }

        }

    }

}



@Composable

fun PostCard(

    post: PostDto,

    onToggleLike: () -> Unit,

    onOpenAuthorProfile: (String) -> Unit = {}

) {

    var showBurst by remember { mutableStateOf(false) }

    var tapOffset by remember { mutableStateOf<Offset?>(null) }



    Column(

        modifier = Modifier

            .fillMaxWidth()

            .padding(vertical = 8.dp)

    ) {

        // Author Header

        Row(

            modifier = Modifier

                .fillMaxWidth()

                .padding(horizontal = 16.dp, vertical = 8.dp),

            verticalAlignment = Alignment.CenterVertically

        ) {

            AsyncImage(

                model = post.authorAvatar,

                contentDescription = post.authorUsername,

                modifier = Modifier

                    .size(38.dp)

                    .clip(CircleShape)

                    .background(Color(0xFF27272A))

                    .clickable {

                        if (post.authorId.isNotBlank()) onOpenAuthorProfile(post.authorId)

                    },

                contentScale = ContentScale.Crop

            )



            Spacer(modifier = Modifier.width(10.dp))



            Column {

                Row(verticalAlignment = Alignment.CenterVertically) {

                    Text(

                        text = post.authorUsername,

                        fontWeight = FontWeight.Bold,

                        fontSize = 13.sp,

                        color = Color.White,

                        modifier = Modifier.clickable {

                            if (post.authorId.isNotBlank()) onOpenAuthorProfile(post.authorId)

                        }

                    )

                    Spacer(modifier = Modifier.width(6.dp))

                    Box(

                        modifier = Modifier

                            .clip(RoundedCornerShape(4.dp))

                            .background(DeckKnobYellow.copy(alpha = 0.15f))

                            .padding(horizontal = 5.dp, vertical = 1.dp)

                    ) {

                        Text(

                            text = post.authorRole.ifBlank { "DJ" }.uppercase(),

                            fontSize = 8.sp,

                            fontWeight = FontWeight.Black,

                            color = DeckKnobYellow

                        )

                    }

                }

            }

        }



        // Post Media with tap-position-aware Fire reaction

        if (post.mediaUrl.isNotEmpty()) {

            Box(

                modifier = Modifier

                    .fillMaxWidth()

                    .aspectRatio(4f / 5f)

                    .background(DeckKnobDarkCard)

                    .pointerInput(Unit) {

                        detectTapGestures(

                            onDoubleTap = { offset ->

                                tapOffset = offset

                                showBurst = true

                                onToggleLike()

                            }

                        )

                    }

            ) {

                AsyncImage(

                    model = post.mediaUrl,

                    contentDescription = post.caption,

                    modifier = Modifier.fillMaxSize(),

                    contentScale = ContentScale.Crop

                )



                // Tap-position-aware Fire reaction animation

                FireReactionOverlay(

                    visible = showBurst,

                    tapOffset = tapOffset,

                    onDismiss = {

                        showBurst = false

                        tapOffset = null

                    }

                )



                // Music Pill

                post.music?.let { music ->

                    Box(

                        modifier = Modifier

                            .align(Alignment.BottomStart)

                            .padding(12.dp)

                            .clip(RoundedCornerShape(20.dp))

                            .background(Color.Black.copy(alpha = 0.75f))

                            .padding(horizontal = 12.dp, vertical = 6.dp)

                    ) {

                        Row(verticalAlignment = Alignment.CenterVertically) {

                            Text(text = "🎵", fontSize = 11.sp)

                            Spacer(modifier = Modifier.width(6.dp))

                            Text(

                                text = "${music.title} • ${music.artist}",

                                color = Color.White,

                                fontSize = 11.sp,

                                fontWeight = FontWeight.Bold

                            )

                        }

                    }

                }

            }

        }



        // Post Action Bar: Fire, Comments, Share

        Row(

            modifier = Modifier

                .fillMaxWidth()

                .padding(horizontal = 16.dp, vertical = 8.dp),

            verticalAlignment = Alignment.CenterVertically,

            horizontalArrangement = Arrangement.spacedBy(16.dp)

        ) {

            Row(

                verticalAlignment = Alignment.CenterVertically,

                modifier = Modifier.clickable { onToggleLike() }

            ) {

                Icon(

                    imageVector = if (post.isLiked) Icons.Filled.Whatshot else Icons.Outlined.Whatshot,

                    contentDescription = "Fire Reaction",

                    tint = if (post.isLiked) DeckKnobYellow else Color.White,

                    modifier = Modifier.size(24.dp)

                )

                Spacer(modifier = Modifier.width(6.dp))

                Text(

                    text = "${post.likesCount}",

                    color = if (post.isLiked) DeckKnobYellow else Color.White,

                    fontWeight = FontWeight.Bold,

                    fontSize = 13.sp

                )

            }



            Row(verticalAlignment = Alignment.CenterVertically) {

                Icon(

                    imageVector = Icons.Default.ChatBubbleOutline,

                    contentDescription = "Comments",

                    tint = Color.White,

                    modifier = Modifier.size(22.dp)

                )

                Spacer(modifier = Modifier.width(6.dp))

                Text(

                    text = "${post.commentsCount}",

                    color = Color.White,

                    fontSize = 13.sp

                )

            }



            Icon(

                imageVector = Icons.Default.Share,

                contentDescription = "Share",

                tint = Color.White,

                modifier = Modifier.size(20.dp)

            )

        }



        // Caption with clickable yellow hashtags

        if (post.caption.isNotEmpty()) {

            Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp)) {

                HashtagText(

                    text = post.caption,

                    color = Color.White,

                    fontSize = 13.sp,

                    onHashtagClick = { /* Navigate to tag */ }

                )

            }

        }



        Spacer(modifier = Modifier.height(12.dp))

        HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)

    }

}



@Composable

fun CreatePostDialog(

    caption: String,

    onCaptionChange: (String) -> Unit,

    mediaUri: Uri?,

    onMediaSelected: (Uri?) -> Unit,

    selectedMusic: com.deckknob.app.data.model.MusicDto?,

    onOpenMusicPicker: () -> Unit,

    onRemoveMusic: () -> Unit,

    isPosting: Boolean,

    onDismiss: () -> Unit,

    onSubmit: () -> Unit

) {

    val launcher = rememberLauncherForActivityResult(

        contract = ActivityResultContracts.GetContent()

    ) { uri: Uri? ->

        onMediaSelected(uri)

    }



    AlertDialog(

        onDismissRequest = onDismiss,

        containerColor = Color(0xFF141416),

        title = {

            Text("DROP A SIGNAL", color = Color.White, fontWeight = FontWeight.Black, fontSize = 16.sp)

        },

        text = {

            Column {

                OutlinedTextField(

                    value = caption,

                    onValueChange = onCaptionChange,

                    placeholder = { Text("What's vibrating tonight? #techno #berlin", color = Color.Gray) },

                    colors = OutlinedTextFieldDefaults.colors(

                        focusedTextColor = Color.White,

                        unfocusedTextColor = Color.White,

                        focusedBorderColor = DeckKnobYellow,

                        unfocusedBorderColor = Color.White.copy(alpha = 0.2f)

                    ),

                    modifier = Modifier.fillMaxWidth(),

                    minLines = 3

                )



                Spacer(modifier = Modifier.height(12.dp))



                Button(

                    onClick = { launcher.launch("image/*") },

                    colors = ButtonDefaults.buttonColors(

                        containerColor = if (mediaUri != null) Color(0xFF27272A) else DeckKnobYellow,

                        contentColor = if (mediaUri != null) Color.White else Color.Black

                    ),

                    shape = RoundedCornerShape(8.dp),

                    modifier = Modifier.fillMaxWidth()

                ) {

                    Text(

                        text = if (mediaUri != null) "✓ PHOTO SELECTED" else "SELECT PHOTO FROM GALLERY",

                        fontWeight = FontWeight.Bold

                    )

                }



                Spacer(modifier = Modifier.height(8.dp))



                // Music Soundtrack Attachment

                if (selectedMusic != null) {

                    Row(

                        modifier = Modifier

                            .fillMaxWidth()

                            .clip(RoundedCornerShape(8.dp))

                            .background(Color(0xFF27272A))

                            .padding(horizontal = 12.dp, vertical = 8.dp),

                        verticalAlignment = Alignment.CenterVertically,

                        horizontalArrangement = Arrangement.SpaceBetween

                    ) {

                        Row(verticalAlignment = Alignment.CenterVertically) {

                            Text(text = "🎵", fontSize = 12.sp)

                            Spacer(modifier = Modifier.width(6.dp))

                            Text(

                                text = "${selectedMusic.title} • ${selectedMusic.artist}",

                                color = DeckKnobYellow,

                                fontSize = 12.sp,

                                fontWeight = FontWeight.Bold,

                                maxLines = 1

                            )

                        }

                        IconButton(onClick = onRemoveMusic, modifier = Modifier.size(24.dp)) {

                            Icon(Icons.Default.Close, contentDescription = "Remove", tint = Color.Gray, modifier = Modifier.size(16.dp))

                        }

                    }

                } else {

                    OutlinedButton(

                        onClick = onOpenMusicPicker,

                        modifier = Modifier.fillMaxWidth(),

                        colors = ButtonDefaults.outlinedButtonColors(contentColor = DeckKnobYellow),

                        border = androidx.compose.foundation.BorderStroke(1.dp, DeckKnobYellow.copy(alpha = 0.5f)),

                        shape = RoundedCornerShape(8.dp)

                    ) {

                        Text("🎵 ATTACH ELECTRONIC SOUNDTRACK", fontSize = 11.sp, fontWeight = FontWeight.Bold)

                    }

                }

            }

        },

        confirmButton = {

            Button(

                onClick = onSubmit,

                enabled = !isPosting,

                colors = ButtonDefaults.buttonColors(

                    containerColor = DeckKnobYellow,

                    contentColor = Color.Black

                ),

                shape = RoundedCornerShape(8.dp)

            ) {

                Text(

                    text = if (isPosting) "POSTING..." else "POST SIGNAL",

                    fontWeight = FontWeight.Black

                )

            }

        },

        dismissButton = {

            TextButton(onClick = onDismiss) {

                Text("CANCEL", color = Color.Gray)

            }

        }

    )

}

