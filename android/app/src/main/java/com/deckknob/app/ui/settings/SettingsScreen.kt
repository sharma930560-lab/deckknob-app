package com.deckknob.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.*
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
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.deckknob.app.data.model.UserDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onLogout: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val user = viewModel.currentUser

    Scaffold(
        containerColor = Color(0xFF09090B),
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "SETTINGS",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        letterSpacing = 1.sp,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF09090B))
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
        ) {
            // Profile Summary Header
            if (user != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF141416))
                        .border(1.dp, Color(0xFF27272A), RoundedCornerShape(14.dp))
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(52.dp)
                            .clip(CircleShape)
                            .border(1.5.dp, Color(0xFFDFE104), CircleShape)
                            .background(Color(0xFF27272A)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (!user.profilePic.isNullOrEmpty()) {
                            AsyncImage(
                                model = user.profilePic,
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Text(
                                text = user.username.take(1).uppercase(),
                                fontWeight = FontWeight.Black,
                                color = Color(0xFFDFE104),
                                fontSize = 20.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = user.name.ifEmpty { user.username },
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Text(
                            text = "@${user.username} • ${user.role.uppercase()}",
                            color = Color.Gray,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            // SECTION 1: ACCOUNT
            SectionHeader("Your Account")

            // Account Privacy Row with Switch
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { viewModel.updateAccountPrivacy(!viewModel.isPrivateAccount) }
                    .padding(vertical = 12.dp, horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Lock, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Private Account", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                    Text(
                        if (viewModel.isPrivateAccount) "Only approved followers see your content" else "Anyone on DECKKNOB can view your sets and klyps",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
                Switch(
                    checked = viewModel.isPrivateAccount,
                    onCheckedChange = { viewModel.updateAccountPrivacy(it) },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.Black,
                        checkedTrackColor = Color(0xFFDFE104),
                        uncheckedThumbColor = Color.LightGray,
                        uncheckedTrackColor = Color(0xFF27272A)
                    )
                )
            }

            // Account Type Row
            SettingsRow(
                icon = Icons.Default.Badge,
                title = "Account Type",
                subtitle = "Current: ${viewModel.selectedRole.uppercase()} (Tap to change)",
                onClick = { viewModel.showAccountTypeDialog = true }
            )

            // Switch Account Row
            SettingsRow(
                icon = Icons.Default.SwitchAccount,
                title = "Switch Account",
                subtitle = "${viewModel.allSessions.size} logged in account(s)",
                onClick = { viewModel.showAccountSwitcherDialog = true }
            )

            HorizontalDivider(color = Color(0xFF18181B), modifier = Modifier.padding(vertical = 8.dp))

            // SECTION 2: EXPERIENCE & PREFERENCES
            SectionHeader("Experience & Metrics")

            // Notifications Row
            SettingsRow(
                icon = Icons.Default.Notifications,
                title = "Notification Preferences",
                subtitle = "Push alerts, direct messages, event drops",
                onClick = { viewModel.showNotificationsDialog = true }
            )

            // Hide Like Counts Row with Switch
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { viewModel.updateLikeCountsVisibility(!viewModel.hideLikeCounts) }
                    .padding(vertical = 12.dp, horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Favorite, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Hide Like Counts", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                    Text("Hide number of likes on other artists' posts", fontSize = 12.sp, color = Color.Gray)
                }
                Switch(
                    checked = viewModel.hideLikeCounts,
                    onCheckedChange = { viewModel.updateLikeCountsVisibility(it) },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.Black,
                        checkedTrackColor = Color(0xFFDFE104),
                        uncheckedThumbColor = Color.LightGray,
                        uncheckedTrackColor = Color(0xFF27272A)
                    )
                )
            }

            HorizontalDivider(color = Color(0xFF18181B), modifier = Modifier.padding(vertical = 8.dp))

            // SECTION 3: SUPPORT & LEGAL
            SectionHeader("Support & Community")

            SettingsRow(
                icon = Icons.AutoMirrored.Filled.HelpOutline,
                title = "Help Center",
                subtitle = "DJ setup guides, stem uploads, streaming FAQ",
                onClick = { viewModel.showHelpCenterDialog = true }
            )

            SettingsRow(
                icon = Icons.Default.ReportProblem,
                title = "Report a Problem",
                subtitle = "Send bug reports directly to our engineers",
                onClick = { viewModel.showReportProblemDialog = true }
            )

            Spacer(modifier = Modifier.height(32.dp))

            // High Contrast Log Out Button
            Button(
                onClick = {
                    viewModel.logout()
                    onLogout()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.Red.copy(alpha = 0.15f),
                    contentColor = Color(0xFFFF5252)
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color.Red.copy(alpha = 0.3f)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("LOG OUT OF DECKKNOB", fontWeight = FontWeight.Black, fontSize = 13.sp, letterSpacing = 0.5.sp)
            }

            Spacer(modifier = Modifier.height(36.dp))
        }

        // Account Type Selector Dialog
        if (viewModel.showAccountTypeDialog) {
            AccountTypeDialog(
                currentRole = viewModel.selectedRole,
                onSelectRole = { viewModel.updateAccountType(it) },
                onDismiss = { viewModel.showAccountTypeDialog = false }
            )
        }

        // Real Functional Account Switcher Dialog
        if (viewModel.showAccountSwitcherDialog) {
            AccountSwitcherDialog(
                sessions = viewModel.allSessions,
                activeUid = viewModel.currentUser?.uid ?: "",
                onSwitch = { viewModel.switchAccount(it) },
                onAddAccount = {
                    viewModel.showAccountSwitcherDialog = false
                    onLogout()
                },
                onDismiss = { viewModel.showAccountSwitcherDialog = false }
            )
        }

        // Notification Preferences Sheet
        if (viewModel.showNotificationsDialog) {
            NotificationPreferencesDialog(
                push = viewModel.notifyPush,
                onPushChange = { viewModel.notifyPush = it },
                dms = viewModel.notifyDMs,
                onDmsChange = { viewModel.notifyDMs = it },
                events = viewModel.notifyEvents,
                onEventsChange = { viewModel.notifyEvents = it },
                activity = viewModel.notifyActivity,
                onActivityChange = { viewModel.notifyActivity = it },
                onDismiss = { viewModel.showNotificationsDialog = false }
            )
        }

        // Help Center Dialog
        if (viewModel.showHelpCenterDialog) {
            HelpCenterDialog(onDismiss = { viewModel.showHelpCenterDialog = false })
        }

        // Report a Problem Dialog
        if (viewModel.showReportProblemDialog) {
            ReportProblemDialog(
                viewModel = viewModel,
                onDismiss = {
                    viewModel.showReportProblemDialog = false
                    viewModel.reportSubmittedSuccessfully = false
                    viewModel.reportErrorMessage = null
                }
            )
        }
    }
}

@Composable
fun AccountTypeDialog(
    currentRole: String,
    onSelectRole: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val roles = listOf(
        Triple("dj", "DJ / Selector", "For performing artists, resident DJs, and electronic selectors."),
        Triple("producer", "Music Producer", "For beatmakers, sound designers, and track producers."),
        Triple("fan", "Fan & Clubber", "For music lovers, underground clubbers, and vinyl collectors.")
    )

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF141416)),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A)),
            shape = RoundedCornerShape(18.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "SELECT ACCOUNT TYPE",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(14.dp))

                roles.forEach { (roleKey, title, desc) ->
                    val isSelected = currentRole.equals(roleKey, ignoreCase = true)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) Color(0xFFDFE104).copy(alpha = 0.12f) else Color.Transparent)
                            .border(
                                1.dp,
                                if (isSelected) Color(0xFFDFE104) else Color(0xFF27272A),
                                RoundedCornerShape(12.dp)
                            )
                            .clickable { onSelectRole(roleKey) }
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = isSelected,
                            onClick = { onSelectRole(roleKey) },
                            colors = RadioButtonDefaults.colors(
                                selectedColor = Color(0xFFDFE104),
                                unselectedColor = Color.Gray
                            )
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(desc, color = Color.Gray, fontSize = 11.sp, lineHeight = 15.sp)
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                }

                Spacer(modifier = Modifier.height(6.dp))
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text("CANCEL", color = Color.Gray, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun AccountSwitcherDialog(
    sessions: List<UserDto>,
    activeUid: String,
    onSwitch: (String) -> Unit,
    onAddAccount: () -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF141416)),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A)),
            shape = RoundedCornerShape(18.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "SWITCH ACCOUNT",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(14.dp))

                if (sessions.isEmpty()) {
                    Text("No other saved sessions found on this device.", color = Color.Gray, fontSize = 13.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                } else {
                    sessions.forEach { session ->
                        val isActive = session.uid == activeUid
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (isActive) Color(0xFFDFE104).copy(alpha = 0.12f) else Color(0xFF18181B))
                                .border(
                                    1.dp,
                                    if (isActive) Color(0xFFDFE104) else Color(0xFF27272A),
                                    RoundedCornerShape(12.dp)
                                )
                                .clickable { onSwitch(session.uid) }
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF27272A)),
                                contentAlignment = Alignment.Center
                            ) {
                                if (session.profilePic?.isNotEmpty() == true) {
                                    AsyncImage(
                                        model = session.profilePic,
                                        contentDescription = null,
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop
                                    )
                                } else {
                                    Text(
                                        text = session.username.take(1).uppercase(),
                                        color = Color(0xFFDFE104),
                                        fontWeight = FontWeight.Black
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(session.username, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text(session.role.uppercase(), color = Color.Gray, fontSize = 11.sp)
                            }

                            if (isActive) {
                                Text("ACTIVE", color = Color(0xFFDFE104), fontWeight = FontWeight.Black, fontSize = 11.sp)
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }

                // Add Another Account Button
                Button(
                    onClick = onAddAccount,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF27272A), contentColor = Color.White),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("LOG IN TO ANOTHER ACCOUNT", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }

                Spacer(modifier = Modifier.height(8.dp))

                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text("CLOSE", color = Color.Gray, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun NotificationPreferencesDialog(
    push: Boolean,
    onPushChange: (Boolean) -> Unit,
    dms: Boolean,
    onDmsChange: (Boolean) -> Unit,
    events: Boolean,
    onEventsChange: (Boolean) -> Unit,
    activity: Boolean,
    onActivityChange: (Boolean) -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF141416)),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A)),
            shape = RoundedCornerShape(18.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "NOTIFICATION ALERTS",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(14.dp))

                NotificationRow("Push Notifications", "Master alerts on device", push, onPushChange)
                NotificationRow("Direct Messages", "Alerts when an artist chats with you", dms, onDmsChange)
                NotificationRow("Event Reminders", "Alerts before saved parties and sets start", events, onEventsChange)
                NotificationRow("Activity & Likes", "When someone likes or saves your Klyps", activity, onActivityChange)

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDFE104), contentColor = Color.Black),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("DONE", color = Color.Black, fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
private fun NotificationRow(title: String, subtitle: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(subtitle, color = Color.Gray, fontSize = 11.sp)
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.Black,
                checkedTrackColor = Color(0xFFDFE104)
            )
        )
    }
}

@Composable
fun HelpCenterDialog(onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF141416)),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A)),
            shape = RoundedCornerShape(18.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = "DECKKNOB HELP CENTER",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(14.dp))

                HelpItem(
                    q = "How do I upload Klyps / Video reels?",
                    a = "Tap the Klyps tab, tap the (+) button on the top right, pick an MP4 video, enter your caption or genre tags, and publish."
                )
                HelpItem(
                    q = "How do I host an event?",
                    a = "Go to the Events screen, tap 'HOST EVENT' (+), upload your event flyer, choose the date & time, venue and lineup description, then tap 'PUBLISH EVENT'."
                )
                HelpItem(
                    q = "How does 24H Stories work?",
                    a = "Tap 'Your Story' on top of your home feed to post an image or flyer snippet. It will automatically disappear after 24 hours."
                )
                HelpItem(
                    q = "Audio quality & STEM standards",
                    a = "DECKKNOB supports high-fidelity audio streams. For original mixes, 320kbps MP3 or lossless WAV/FLAC formats are recommended."
                )

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDFE104), contentColor = Color.Black),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("GOT IT", color = Color.Black, fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
private fun HelpItem(q: String, a: String) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Text(q, color = Color(0xFFDFE104), fontWeight = FontWeight.Bold, fontSize = 13.sp)
        Spacer(modifier = Modifier.height(4.dp))
        Text(a, color = Color.LightGray, fontSize = 12.sp, lineHeight = 16.sp)
    }
}

@Composable
fun ReportProblemDialog(
    viewModel: SettingsViewModel,
    onDismiss: () -> Unit
) {
    val categories = listOf("Playback Bug", "Upload Issue", "Account / Login", "Audio Glitch", "Other")

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF141416)),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A)),
            shape = RoundedCornerShape(18.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = "REPORT A PROBLEM",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Found a bug or playback glitch? Let our team know.",
                    color = Color.Gray,
                    fontSize = 12.sp
                )

                Spacer(modifier = Modifier.height(14.dp))

                if (viewModel.reportSubmittedSuccessfully) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFFDFE104).copy(alpha = 0.15f))
                            .border(1.dp, Color(0xFFDFE104), RoundedCornerShape(10.dp))
                            .padding(14.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "✓ Report sent! Thank you for helping improve DECKKNOB.",
                            color = Color(0xFFDFE104),
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    Button(
                        onClick = onDismiss,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDFE104), contentColor = Color.Black),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("CLOSE", color = Color.Black, fontWeight = FontWeight.Black)
                    }
                } else {
                    if (viewModel.reportErrorMessage != null) {
                        Text("⚠ ${viewModel.reportErrorMessage}", color = Color.Red, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    Text("CATEGORY", color = Color(0xFFDFE104), fontSize = 11.sp, fontWeight = FontWeight.Black)
                    Spacer(modifier = Modifier.height(6.dp))

                    // Category selection chips
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        categories.take(3).forEach { cat ->
                            val isSel = viewModel.reportCategory == cat
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(if (isSel) Color(0xFFDFE104) else Color(0xFF18181B))
                                    .border(1.dp, if (isSel) Color(0xFFDFE104) else Color(0xFF27272A), RoundedCornerShape(6.dp))
                                    .clickable { viewModel.reportCategory = cat }
                                    .padding(horizontal = 8.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    cat,
                                    color = if (isSel) Color.Black else Color.LightGray,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = viewModel.reportDescription,
                        onValueChange = { viewModel.reportDescription = it },
                        placeholder = { Text("Describe what happened...", color = Color.Gray) },
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

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = viewModel.reportEmail,
                        onValueChange = { viewModel.reportEmail = it },
                        label = { Text("Your Email (for updates)", color = Color.Gray) },
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

                    Spacer(modifier = Modifier.height(18.dp))

                    // HIGH CONTRAST YELLOW SUBMIT BUTTON
                    Button(
                        onClick = { viewModel.submitReport() },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFDFE104),
                            contentColor = Color.Black
                        ),
                        enabled = !viewModel.isSubmittingReport,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        if (viewModel.isSubmittingReport) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.Black)
                        } else {
                            Text("SUBMIT REPORT", color = Color.Black, fontWeight = FontWeight.Black, fontSize = 14.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                        Text("CANCEL", color = Color.Gray)
                    }
                }
            }
        }
    }
}
