package com.deckknob.app.ui.settings

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.deckknob.app.data.model.update.DownloadState
import com.deckknob.app.ui.theme.DeckKnobBlack
import com.deckknob.app.ui.theme.DeckKnobYellow
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UpdateCenterScreen(
    onBack: () -> Unit,
    viewModel: UpdateCenterViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val updateInfo by viewModel.updateInfo.collectAsState()
    val remoteConfig by viewModel.remoteConfig.collectAsState()
    val downloadProgress by viewModel.downloadProgress.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "APP UPDATES",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                        letterSpacing = 1.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.showWhatsNewManually() }) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = "What's New",
                            tint = DeckKnobYellow
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DeckKnobBlack
                )
            )
        },
        containerColor = DeckKnobBlack
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(modifier = Modifier.height(4.dp)) }

            // 1. Current Installed Version Card
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFF18181B),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF27272A)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.SystemUpdate,
                                    contentDescription = null,
                                    tint = DeckKnobYellow,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Column {
                                Text(
                                    text = "INSTALLED VERSION",
                                    color = Color.Gray,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 0.5.sp
                                )
                                Text(
                                    text = "v${viewModel.installedVersionName} (Build ${viewModel.installedVersionCode})",
                                    color = Color.White,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }

                        val versionStatus = updateInfo?.versionStatus ?: com.deckknob.app.data.model.update.VersionStatus.UP_TO_DATE
                        val (badgeText, badgeColor, badgeBg) = when (versionStatus) {
                            com.deckknob.app.data.model.update.VersionStatus.AHEAD_OF_RELEASE ->
                                Triple("DEV BUILD", Color(0xFF818CF8), Color(0xFF818CF8).copy(alpha = 0.2f))
                            com.deckknob.app.data.model.update.VersionStatus.UPDATE_AVAILABLE ->
                                Triple("UPDATE READY", DeckKnobYellow, DeckKnobYellow.copy(alpha = 0.2f))
                            com.deckknob.app.data.model.update.VersionStatus.UP_TO_DATE ->
                                Triple("UP TO DATE", Color(0xFF10B981), Color(0xFF10B981).copy(alpha = 0.2f))
                            com.deckknob.app.data.model.update.VersionStatus.DOWNGRADE_REJECTED ->
                                Triple("REJECTED", Color(0xFFEF4444), Color(0xFFEF4444).copy(alpha = 0.2f))
                        }
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(badgeBg)
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = badgeText,
                                color = badgeColor,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }
                }
            }

            // 2. Latest Release & Check Action Card
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFF18181B),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "LATEST PUBLISHED RELEASE",
                                    color = Color.Gray,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 0.5.sp
                                )
                                Text(
                                    text = updateInfo?.releaseTitle ?: "DECKKNOB v${remoteConfig.latestVersionName}",
                                    color = Color.White,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            Button(
                                onClick = { viewModel.checkForUpdates() },
                                enabled = !viewModel.isChecking,
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF27272A),
                                    contentColor = Color.White
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                if (viewModel.isChecking) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(14.dp),
                                        color = DeckKnobYellow,
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Icon(
                                        imageVector = Icons.Default.Refresh,
                                        contentDescription = null,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Check", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }

                        // Informational Banner if local build is ahead of published release
                        val currentStatus = updateInfo?.versionStatus ?: com.deckknob.app.data.model.update.VersionStatus.UP_TO_DATE
                        if (currentStatus == com.deckknob.app.data.model.update.VersionStatus.AHEAD_OF_RELEASE) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFF818CF8).copy(alpha = 0.12f))
                                    .padding(horizontal = 10.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = Color(0xFF818CF8),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Installed build (v${viewModel.installedVersionName}, build ${viewModel.installedVersionCode}) is ahead of latest published release. Downgrades are prevented.",
                                    color = Color.White.copy(alpha = 0.9f),
                                    fontSize = 11.sp
                                )
                            }
                        }

                        // Last Checked Timestamp
                        val lastChecked = updateInfo?.lastCheckedTimestamp ?: 0L
                        if (lastChecked > 0L) {
                            val timeStr = SimpleDateFormat("MMM d, yyyy • h:mm a", Locale.getDefault()).format(Date(lastChecked))
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Last checked: $timeStr",
                                color = Color(0xFF71717A),
                                fontSize = 11.sp
                            )
                        }

                        // Error Banner if any
                        if (viewModel.errorMessage != null) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                color = Color.Red.copy(alpha = 0.15f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color.Red.copy(alpha = 0.3f))
                            ) {
                                Text(
                                    text = viewModel.errorMessage ?: "",
                                    color = Color(0xFFFF5252),
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(10.dp)
                                )
                            }
                        }

                        // Download Progress Section
                        if (downloadProgress.state == DownloadState.DOWNLOADING || downloadProgress.state == DownloadState.VERIFYING) {
                            Spacer(modifier = Modifier.height(16.dp))
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = if (downloadProgress.state == DownloadState.VERIFYING) "Verifying signature & SHA-256..." else "Downloading update...",
                                        color = Color.LightGray,
                                        fontSize = 12.sp
                                    )
                                    Text(
                                        text = "${downloadProgress.percentage}%",
                                        color = DeckKnobYellow,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                LinearProgressIndicator(
                                    progress = { downloadProgress.percentage / 100f },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(6.dp)
                                        .clip(RoundedCornerShape(3.dp)),
                                    color = DeckKnobYellow,
                                    trackColor = Color(0xFF27272A)
                                )
                            }
                        }

                        // Download & Install Action Button
                        if (updateInfo?.isUpdateAvailable == true && downloadProgress.state != DownloadState.DOWNLOADING && downloadProgress.state != DownloadState.VERIFYING) {
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = {
                                    if (downloadProgress.state == DownloadState.READY_TO_INSTALL) {
                                        viewModel.confirmAndInstall(context)
                                    } else {
                                        viewModel.startDownload()
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(46.dp),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = DeckKnobYellow,
                                    contentColor = Color.Black
                                )
                            ) {
                                Icon(
                                    imageVector = if (downloadProgress.state == DownloadState.READY_TO_INSTALL) Icons.Default.InstallMobile else Icons.Default.Download,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = if (downloadProgress.state == DownloadState.READY_TO_INSTALL) "INSTALL VERIFIED APK" else "DOWNLOAD & INSTALL UPDATE",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 13.sp,
                                    letterSpacing = 0.5.sp
                                )
                            }
                        }
                    }
                }
            }

            // 3. Release Notes & Changelog Accordion
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFF18181B),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Text(
                            text = "CHANGELOG & RELEASE NOTES",
                            color = Color.LightGray,
                            fontWeight = FontWeight.Black,
                            fontSize = 12.sp,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        // Features
                        val features = updateInfo?.newFeatures ?: emptyList()
                        if (features.isNotEmpty()) {
                            Text("New Features", color = DeckKnobYellow, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Spacer(modifier = Modifier.height(6.dp))
                            features.forEach { feat ->
                                Row(modifier = Modifier.padding(vertical = 3.dp)) {
                                    Text("• ", color = DeckKnobYellow, fontWeight = FontWeight.Black)
                                    Text(feat, color = Color.White, fontSize = 12.sp)
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                        }

                        // Fixes
                        val fixes = updateInfo?.bugFixes ?: emptyList()
                        if (fixes.isNotEmpty()) {
                            Text("Bug Fixes", color = Color(0xFF60A5FA), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Spacer(modifier = Modifier.height(6.dp))
                            fixes.forEach { fix ->
                                Row(modifier = Modifier.padding(vertical = 3.dp)) {
                                    Text("• ", color = Color(0xFF60A5FA), fontWeight = FontWeight.Black)
                                    Text(fix, color = Color(0xFFA1A1AA), fontSize = 12.sp)
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                        }

                        // Improvements
                        val improvements = updateInfo?.improvements ?: emptyList()
                        if (improvements.isNotEmpty()) {
                            Text("Improvements", color = Color(0xFF34D399), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Spacer(modifier = Modifier.height(6.dp))
                            improvements.forEach { imp ->
                                Row(modifier = Modifier.padding(vertical = 3.dp)) {
                                    Text("• ", color = Color(0xFF34D399), fontWeight = FontWeight.Black)
                                    Text(imp, color = Color(0xFFA1A1AA), fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }

            // 4. Remote Feature Updates (OTA Architecture)
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFF18181B),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "REMOTE FEATURE FLAGS (OTA)",
                                color = Color.LightGray,
                                fontWeight = FontWeight.Black,
                                fontSize = 12.sp,
                                letterSpacing = 1.sp
                            )
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(Color(0xFF10B981).copy(alpha = 0.2f))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text("LIVE SYNC", color = Color(0xFF10B981), fontSize = 9.sp, fontWeight = FontWeight.Black)
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Remotely configurable features update over-the-air via Firestore without reinstalling the application.",
                            color = Color.Gray,
                            fontSize = 11.sp
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // Chips grid
                        val flags = remoteConfig.featureFlags
                        flags.entries.chunked(2).forEach { rowEntries ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                rowEntries.forEach { entry ->
                                    val isEnabled = remoteConfig.isFeatureEnabled(entry.key)
                                    Surface(
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(8.dp),
                                        color = Color(0xFF27272A).copy(alpha = 0.6f),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF3F3F46))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(8.dp)
                                                    .clip(CircleShape)
                                                    .background(if (isEnabled) Color(0xFF10B981) else Color(0xFFEF4444))
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(
                                                text = entry.key.replace("_", " ").uppercase(),
                                                color = Color.White,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                                if (rowEntries.size == 1) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }

    // What's New Dialog
    if (viewModel.showWhatsNewDialog) {
        WhatsNewDialog(
            versionName = viewModel.installedVersionName,
            updateInfo = updateInfo,
            onDismiss = { viewModel.dismissWhatsNew() }
        )
    }

    // Install Confirmation Dialog
    if (viewModel.showInstallConfirmDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.showInstallConfirmDialog = false },
            title = {
                Text(
                    text = "INSTALL UPDATE",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp
                )
            },
            text = {
                Text(
                    text = "A verified APK package for DECKKNOB has been downloaded and cryptographically verified. Do you want to proceed with installation?",
                    color = Color.LightGray,
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.confirmAndInstall(context) },
                    colors = ButtonDefaults.buttonColors(containerColor = DeckKnobYellow, contentColor = Color.Black),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("INSTALL NOW", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.showInstallConfirmDialog = false }) {
                    Text("LATER", color = Color.Gray, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            },
            containerColor = Color(0xFF18181B)
        )
    }

    // Permission Rationale Dialog
    if (viewModel.showPermissionRationaleDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.showPermissionRationaleDialog = false },
            title = {
                Text(
                    text = "INSTALL PERMISSION REQUIRED",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp
                )
            },
            text = {
                Text(
                    text = "To install verified in-app updates directly from the official DECKKNOB repository, Android requires permission to install apps from this source.",
                    color = Color.LightGray,
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.requestInstallPermission(context) },
                    colors = ButtonDefaults.buttonColors(containerColor = DeckKnobYellow, contentColor = Color.Black),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("OPEN SETTINGS", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.showPermissionRationaleDialog = false }) {
                    Text("CANCEL", color = Color.Gray, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            },
            containerColor = Color(0xFF18181B)
        )
    }
}
