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
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Info
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
fun GroupChatScreen(
    groupId: String,
    onBack: () -> Unit,
    onOpenGroupDetails: (String) -> Unit,
    onOpenUserProfile: ((String) -> Unit)? = null,
    viewModel: ChatViewModel = hiltViewModel()
) {
    LaunchedEffect(groupId) {
        viewModel.initializeGroupChat(groupId)
    }

    val messages by viewModel.messages.collectAsState()
    val group = viewModel.currentChat
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
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenGroupDetails(groupId) }
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF27272A)),
                            contentAlignment = Alignment.Center
                        ) {
                            if (!group?.imageUrl.isNullOrBlank()) {
                                AsyncImage(
                                    model = group?.imageUrl,
                                    contentDescription = group?.name,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Icon(
                                    Icons.Default.Groups,
                                    contentDescription = null,
                                    tint = Color(0xFFDFE104),
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = group?.name ?: "Group Chat",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                maxLines = 1
                            )
                            Text(
                                text = "${group?.memberCount ?: group?.participants?.size ?: 0} members",
                                color = Color(0xFFA1A1AA),
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
                actions = {
                    IconButton(onClick = { onOpenGroupDetails(groupId) }) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = "Group Details",
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
        contentWindowInsets = WindowInsets.statusBars
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .imePadding()
        ) {
            // Independent scrolling message history filling available space
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                if (viewModel.isLoading && messages.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Color(0xFFDFE104))
                    }
                } else if (messages.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "Welcome to ${group?.name ?: "the group"}!",
                                color = Color.Gray,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Send the first message to get the conversation going",
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
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(messages, key = { it.id }) { msg ->
                            val isMine = msg.senderId == viewModel.currentUserId

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start,
                                verticalAlignment = Alignment.Bottom
                            ) {
                                if (!isMine) {
                                    Box(
                                        modifier = Modifier
                                            .size(28.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFF27272A))
                                            .clickable {
                                                if (msg.senderId.isNotBlank()) {
                                                    onOpenUserProfile?.invoke(msg.senderId)
                                                }
                                            },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (!msg.senderAvatar.isNullOrBlank()) {
                                            AsyncImage(
                                                model = msg.senderAvatar,
                                                contentDescription = msg.senderName,
                                                modifier = Modifier.fillMaxSize(),
                                                contentScale = ContentScale.Crop
                                            )
                                        } else {
                                            Icon(
                                                Icons.Default.Person,
                                                contentDescription = null,
                                                tint = Color.Gray,
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                }

                                Surface(
                                    shape = RoundedCornerShape(
                                        topStart = 16.dp,
                                        topEnd = 16.dp,
                                        bottomStart = if (isMine) 16.dp else 4.dp,
                                        bottomEnd = if (isMine) 4.dp else 16.dp
                                    ),
                                    color = if (isMine) Color(0xFFDFE104) else Color(0xFF27272A),
                                    modifier = Modifier.widthIn(max = 280.dp)
                                ) {
                                    Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                                        if (!isMine && !msg.senderName.isNullOrBlank()) {
                                            Text(
                                                text = msg.senderName,
                                                color = Color(0xFFDFE104),
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 11.sp,
                                                modifier = Modifier.padding(bottom = 2.dp)
                                            )
                                        }

                                        Text(
                                            text = msg.text,
                                            color = if (isMine) Color.Black else Color.White,
                                            fontSize = 14.sp
                                        )

                                        if (msg.createdAt != null) {
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                text = timeFormat.format(msg.createdAt.toDate()),
                                                color = if (isMine) Color(0x99000000) else Color(0xFF71717A),
                                                fontSize = 10.sp,
                                                modifier = Modifier.align(Alignment.End)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Message Composer anchored immediately above keyboard / navigation bar
            Surface(
                color = Color(0xFF18181B),
                modifier = Modifier
                    .fillMaxWidth()
                    .windowInsetsPadding(
                        WindowInsets.navigationBars.exclude(WindowInsets.ime)
                    )
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
                                Text("Message in group...", color = Color(0xFF71717A), fontSize = 14.sp)
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
    }
}
