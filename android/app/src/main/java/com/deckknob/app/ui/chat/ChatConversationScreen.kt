package com.deckknob.app.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatConversationScreen(
    targetUid: String,
    onBack: () -> Unit,
    onOpenUserProfile: ((String) -> Unit)? = null,
    viewModel: ChatViewModel = hiltViewModel()
) {
    LaunchedEffect(targetUid) {
        viewModel.initializeChat(targetUid)
    }

    val messages by viewModel.messages.collectAsState()
    val recipient = viewModel.recipientUser
    val listState = rememberLazyListState()

    // Auto-scroll to latest message
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    val timeFormat = remember { SimpleDateFormat("h:mm a", Locale.getDefault()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable {
                            if (targetUid.isNotBlank()) {
                                onOpenUserProfile?.invoke(targetUid)
                            }
                        }
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF27272A)),
                            contentAlignment = Alignment.Center
                        ) {
                            if (!recipient?.profilePic.isNullOrBlank()) {
                                AsyncImage(
                                    model = recipient?.profilePic,
                                    contentDescription = recipient?.username,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Icon(
                                    Icons.Default.Person,
                                    contentDescription = null,
                                    tint = Color.Gray,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = recipient?.name?.ifBlank { recipient.username } ?: "User",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                                if (recipient?.role == "dj") {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Surface(
                                        color = Color(0xFFDFE104),
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = "DJ",
                                            color = Color.Black,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 10.sp,
                                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                            Text(
                                text = "@${recipient?.username ?: "artist"}",
                                color = Color.Gray,
                                fontSize = 12.sp
                            )
                        }
                    }
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
        containerColor = Color(0xFF09090B),
        bottomBar = {
            // Message Input Bar
            Surface(
                color = Color(0xFF18181B),
                modifier = Modifier
                    .fillMaxWidth()
                    .imePadding()
            ) {
                Column {
                    if (viewModel.errorMessage != null) {
                        Text(
                            text = viewModel.errorMessage.orEmpty(),
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                        )
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = viewModel.messageInput,
                            onValueChange = { viewModel.messageInput = it },
                            placeholder = {
                                Text("Message @${recipient?.username ?: "artist"}...", color = Color(0xFF71717A), fontSize = 14.sp)
                            },
                            modifier = Modifier
                                .weight(1f)
                                .heightIn(min = 44.dp, max = 120.dp),
                            shape = RoundedCornerShape(22.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = Color(0xFF27272A),
                                unfocusedContainerColor = Color(0xFF27272A),
                                focusedBorderColor = Color(0xFF3F3F46),
                                unfocusedBorderColor = Color.Transparent,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            maxLines = 4
                        )

                        Spacer(modifier = Modifier.width(8.dp))

                        IconButton(
                            onClick = { viewModel.sendMessage() },
                            enabled = viewModel.messageInput.isNotBlank() && !viewModel.isSending,
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(
                                    if (viewModel.messageInput.isNotBlank() && !viewModel.isSending) Color(0xFFDFE104) else Color(0xFF27272A)
                                )
                        ) {
                            if (viewModel.isSending) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.Black,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Icon(
                                    Icons.AutoMirrored.Filled.Send,
                                    contentDescription = "Send",
                                    tint = if (viewModel.messageInput.isNotBlank()) Color.Black else Color.Gray,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        if (viewModel.isLoading && messages.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color(0xFFDFE104))
            }
        } else if (messages.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Say hello to @${recipient?.username ?: "artist"}!",
                        color = Color.Gray,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Direct messages are end-to-end between participants",
                        color = Color(0xFF52525B),
                        fontSize = 12.sp
                    )
                }
            }
        } else {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(messages, key = { it.id }) { msg ->
                    val isMine = msg.senderId == viewModel.currentUserId

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start
                    ) {
                        Column(
                            horizontalAlignment = if (isMine) Alignment.End else Alignment.Start
                        ) {
                            Box(
                                modifier = Modifier
                                    .widthIn(max = 280.dp)
                                    .background(
                                        color = if (isMine) Color(0xFFDFE104) else Color(0xFF27272A),
                                        shape = RoundedCornerShape(
                                            topStart = 16.dp,
                                            topEnd = 16.dp,
                                            bottomStart = if (isMine) 16.dp else 4.dp,
                                            bottomEnd = if (isMine) 4.dp else 16.dp
                                        )
                                    )
                                    .padding(horizontal = 14.dp, vertical = 10.dp)
                            ) {
                                Text(
                                    text = msg.text,
                                    color = if (isMine) Color(0xFF09090B) else Color.White,
                                    fontSize = 14.sp,
                                    lineHeight = 20.sp
                                )
                            }

                            if (msg.createdAt != null) {
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = timeFormat.format(msg.createdAt.toDate()),
                                    color = Color(0xFF71717A),
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

