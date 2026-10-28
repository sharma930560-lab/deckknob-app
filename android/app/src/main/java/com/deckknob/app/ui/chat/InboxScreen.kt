package com.deckknob.app.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InboxScreen(
    onBack: () -> Unit,
    onOpenChat: (String) -> Unit,
    viewModel: ChatViewModel = hiltViewModel()
) {
    LaunchedEffect(Unit) {
        viewModel.loadUserChats()
    }

    val chats by viewModel.userChats.collectAsState()
    val dateFormat = remember { SimpleDateFormat("MMM d, h:mm a", Locale.getDefault()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "MESSAGES",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        letterSpacing = 1.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF09090B)
                )
            )
        },
        containerColor = Color(0xFF09090B)
    ) { paddingValues ->
        if (chats.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Email,
                        contentDescription = null,
                        tint = Color(0xFF3F3F46),
                        modifier = Modifier.size(56.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "No messages yet",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Connect with DJs and artists by visiting their profile",
                        color = Color.Gray,
                        fontSize = 13.sp
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                items(chats, key = { it.id }) { chat ->
                    val otherUid = chat.participants.firstOrNull { it != viewModel.currentUserId } ?: ""
                    val otherUser = chat.otherUser

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                if (otherUid.isNotBlank()) {
                                    onOpenChat(otherUid)
                                }
                            }
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(50.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF27272A)),
                            contentAlignment = Alignment.Center
                        ) {
                            if (!otherUser?.profilePic.isNullOrBlank()) {
                                AsyncImage(
                                    model = otherUser?.profilePic,
                                    contentDescription = otherUser?.username,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Icon(
                                    Icons.Default.Person,
                                    contentDescription = null,
                                    tint = Color.Gray,
                                    modifier = Modifier.size(28.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = otherUser?.name?.ifBlank { otherUser.username } ?: (if (otherUid.isNotBlank()) "@$otherUid" else "Unknown"),
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                if (otherUser?.role == "dj") {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Surface(
                                        color = Color(0xFFDFE104),
                                        shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = "DJ",
                                            color = Color.Black,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 9.sp,
                                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(2.dp))

                            Text(
                                text = chat.lastMessage ?: "Started a chat",
                                color = if (chat.lastSenderId != viewModel.currentUserId && !chat.readBy.contains(viewModel.currentUserId)) Color.White else Color.Gray,
                                fontWeight = if (chat.lastSenderId != viewModel.currentUserId && !chat.readBy.contains(viewModel.currentUserId)) FontWeight.SemiBold else FontWeight.Normal,
                                fontSize = 13.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        if (chat.lastMessageAt != null) {
                            Text(
                                text = dateFormat.format(chat.lastMessageAt.toDate()),
                                color = Color(0xFF71717A),
                                fontSize = 11.sp
                            )
                        }
                    }
                    HorizontalDivider(color = Color(0xFF18181B), thickness = 0.5.dp)
                }
            }
        }
    }
}

