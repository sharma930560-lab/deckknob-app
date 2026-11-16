package com.deckknob.app.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
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
import com.deckknob.app.data.model.UserDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupDetailsScreen(
    groupId: String,
    onBack: () -> Unit,
    onGroupExited: () -> Unit,
    onOpenUserProfile: ((String) -> Unit)? = null,
    viewModel: GroupDetailsViewModel = hiltViewModel()
) {
    LaunchedEffect(groupId) {
        viewModel.initialize(groupId)
    }

    LaunchedEffect(viewModel.hasLeftGroup) {
        if (viewModel.hasLeftGroup) {
            onGroupExited()
        }
    }

    val group = viewModel.currentGroup
    val members = viewModel.members
    val addMemberResults by viewModel.addMemberResults.collectAsState()

    var showLeaveDialog by remember { mutableStateOf(false) }
    var showEditInfoDialog by remember { mutableStateOf(false) }
    var editName by remember { mutableStateOf("") }
    var editDesc by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "GROUP INFO",
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
                actions = {
                    if (viewModel.isAdmin) {
                        IconButton(onClick = {
                            editName = group?.name.orEmpty()
                            editDesc = group?.description.orEmpty()
                            showEditInfoDialog = true
                        }) {
                            Icon(Icons.Default.Edit, contentDescription = "Edit Group", tint = Color.White)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF09090B)
                )
            )
        },
        containerColor = Color(0xFF09090B)
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            item {
                if (viewModel.errorMessage != null) {
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp)
                    ) {
                        Text(
                            text = viewModel.errorMessage.orEmpty(),
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }

                // Group Hero Banner
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(80.dp)
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
                                modifier = Modifier.size(44.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = group?.name.orEmpty(),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )

                    if (!group?.description.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = group?.description.orEmpty(),
                            color = Color.Gray,
                            fontSize = 13.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "${members.size} members",
                        color = Color(0xFFDFE104),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                HorizontalDivider(color = Color(0xFF27272A), thickness = 0.5.dp)
                Spacer(modifier = Modifier.height(16.dp))

                // Admin Add Members Section
                if (viewModel.isAdmin) {
                    Text(
                        text = "ADD MEMBERS",
                        color = Color(0xFFA1A1AA),
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = viewModel.addMemberQuery,
                        onValueChange = { viewModel.onSearchAddMembers(it) },
                        placeholder = { Text("Search users to add to group...", color = Color(0xFF71717A), fontSize = 13.sp) },
                        leadingIcon = { Icon(Icons.Default.PersonAdd, contentDescription = null, tint = Color.Gray) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color(0xFF18181B),
                            unfocusedContainerColor = Color(0xFF18181B),
                            focusedBorderColor = Color(0xFF3F3F46),
                            unfocusedBorderColor = Color(0xFF27272A),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                }
            }

            // Search add members results
            if (viewModel.isAdmin && addMemberResults.isNotEmpty()) {
                items(addMemberResults, key = { "search_${it.uid}" }) { user ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "@${user.username} (${user.name})",
                            color = Color.White,
                            fontSize = 13.sp,
                            modifier = Modifier.weight(1f)
                        )
                        Button(
                            onClick = { viewModel.addMemberToGroup(user) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDFE104)),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                        ) {
                            Text("Add", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                    HorizontalDivider(color = Color(0xFF18181B), thickness = 0.5.dp)
                }

                item {
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }

            // Member list header
            item {
                Text(
                    text = "MEMBERS (${members.size})",
                    color = Color(0xFFA1A1AA),
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            // Members list
            items(members, key = { it.uid }) { user ->
                val isMemberOwner = user.uid == group?.ownerId
                val isMemberAdmin = group?.adminIds?.contains(user.uid) == true
                val isSelf = user.uid == viewModel.currentUserId

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenUserProfile?.invoke(user.uid) }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF27272A)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (!user.profilePic.isNullOrBlank()) {
                            AsyncImage(
                                model = user.profilePic,
                                contentDescription = user.username,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Icon(Icons.Default.Person, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(24.dp))
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = user.name.ifBlank { user.username } + if (isSelf) " (You)" else "",
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (isMemberOwner) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Surface(
                                    color = Color(0xFFDFE104),
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = "OWNER",
                                        color = Color.Black,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 9.sp,
                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                    )
                                }
                            } else if (isMemberAdmin) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Surface(
                                    color = Color(0xFF3F3F46),
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = "ADMIN",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 9.sp,
                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }
                        Text(
                            text = "@${user.username}",
                            color = Color.Gray,
                            fontSize = 12.sp
                        )
                    }

                    // Admin options for other members
                    if (!isSelf && !isMemberOwner && viewModel.isAdmin) {
                        IconButton(onClick = { viewModel.removeMemberFromGroup(user.uid) }) {
                            Icon(Icons.Default.PersonRemove, contentDescription = "Remove Member", tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                        }
                    }

                    // Owner can transfer ownership
                    if (!isSelf && viewModel.isOwner) {
                        IconButton(onClick = { viewModel.transferOwnership(user.uid) }) {
                            Icon(Icons.Default.Shield, contentDescription = "Make Owner", tint = Color(0xFFDFE104), modifier = Modifier.size(20.dp))
                        }
                    }
                }
                HorizontalDivider(color = Color(0xFF18181B), thickness = 0.5.dp)
            }

            // Leave group button
            item {
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = { showLeaveDialog = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF27272A)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ExitToApp,
                        contentDescription = "Leave Group",
                        tint = Color(0xFFEF4444)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Leave Group",
                        color = Color(0xFFEF4444),
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }

    if (showLeaveDialog) {
        AlertDialog(
            onDismissRequest = { showLeaveDialog = false },
            title = { Text("Leave Group?", color = Color.White, fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    if (viewModel.isOwner)
                        "You are the group owner. You must transfer ownership to another member before leaving."
                    else
                        "Are you sure you want to leave ${group?.name}? You will no longer receive messages from this group.",
                    color = Color(0xFFA1A1AA)
                )
            },
            confirmButton = {
                if (!viewModel.isOwner) {
                    TextButton(onClick = {
                        showLeaveDialog = false
                        viewModel.leaveGroup()
                    }) {
                        Text("Leave", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showLeaveDialog = false }) {
                    Text("Cancel", color = Color.White)
                }
            },
            containerColor = Color(0xFF18181B)
        )
    }

    if (showEditInfoDialog) {
        AlertDialog(
            onDismissRequest = { showEditInfoDialog = false },
            title = { Text("Edit Group Info", color = Color.White, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    OutlinedTextField(
                        value = editName,
                        onValueChange = { editName = it },
                        label = { Text("Group Name", color = Color.Gray) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = editDesc,
                        onValueChange = { editDesc = it },
                        label = { Text("Description", color = Color.Gray) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showEditInfoDialog = false
                        viewModel.updateGroupInfo(editName, editDesc)
                    },
                    enabled = editName.isNotBlank()
                ) {
                    Text("Save", color = Color(0xFFDFE104), fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showEditInfoDialog = false }) {
                    Text("Cancel", color = Color.White)
                }
            },
            containerColor = Color(0xFF18181B)
        )
    }
}
