package com.deckknob.app.ui.stories

import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.deckknob.app.data.model.MusicDto
import com.deckknob.app.ui.components.MusicPickerSheet

enum class StoryFilter(val id: String, val label: String, val tintColor: Color? = null, val isMono: Boolean = false) {
    NORMAL("normal", "Normal", null),
    WARM("warm", "Warm Club", Color(0xFFFF9800)),
    COOL("cool", "Cyberpunk", Color(0xFF00E5FF)),
    VINTAGE("vintage", "Retro 90s", Color(0xFF8D6E63)),
    MONO("mono", "Techno B&W", null, isMono = true),
    GLOW("glow", "Neon Rave", Color(0xFFDFE104))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoryEditorDialog(
    viewModel: StoriesViewModel,
    onDismiss: () -> Unit
) {
    var showMusicPicker by remember { mutableStateOf(false) }
    var showTextEditor by remember { mutableStateOf(false) }
    var showFiltersStrip by remember { mutableStateOf(false) }
    var showAdjustments by remember { mutableStateOf(false) }

    var draftText by remember { mutableStateOf(viewModel.textOverlay) }

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
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
        ) {
            // MAIN STORY CANVAS
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 90.dp),
                contentAlignment = Alignment.Center
            ) {
                val currentFilter = StoryFilter.values().firstOrNull { it.id == viewModel.filterName } ?: StoryFilter.NORMAL

                // Media Display with Mono ColorMatrix if selected
                val colorFilter = if (currentFilter.isMono) {
                    ColorFilter.colorMatrix(ColorMatrix().apply { setToSaturation(0f) })
                } else null

                AsyncImage(
                    model = viewModel.selectedMediaUri,
                    contentDescription = "Story Media",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                    colorFilter = colorFilter
                )

                // Filter Tint Overlay
                currentFilter.tintColor?.let { tint ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(tint.copy(alpha = 0.22f))
                    )
                }

                // Brightness & Contrast Adjustment Overlay
                if (viewModel.brightness != 0f) {
                    val overlayColor = if (viewModel.brightness > 0f) {
                        Color.White.copy(alpha = viewModel.brightness.coerceIn(0f, 0.4f))
                    } else {
                        Color.Black.copy(alpha = (-viewModel.brightness).coerceIn(0f, 0.5f))
                    }
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(overlayColor)
                    )
                }

                // Floating Text Sticker Overlay
                if (viewModel.textOverlay.isNotEmpty()) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(horizontal = 24.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color.Black.copy(alpha = 0.75f))
                            .border(1.5.dp, Color(0xFFDFE104), RoundedCornerShape(14.dp))
                            .clickable {
                                draftText = viewModel.textOverlay
                                showTextEditor = true
                            }
                            .padding(horizontal = 20.dp, vertical = 12.dp)
                    ) {
                        Text(
                            text = viewModel.textOverlay,
                            color = Color(0xFFDFE104),
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black,
                            textAlign = TextAlign.Center
                        )
                    }
                }

                // Floating Music Pill
                viewModel.attachedMusic?.let { music ->
                    Row(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(top = 70.dp)
                            .clip(RoundedCornerShape(20.dp))
                            .background(Color.Black.copy(alpha = 0.75f))
                            .border(1.dp, Color(0xFFDFE104).copy(alpha = 0.6f), RoundedCornerShape(20.dp))
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.MusicNote,
                            contentDescription = null,
                            tint = Color(0xFFDFE104),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "${music.title} • ${music.artist}",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Remove music",
                            tint = Color.LightGray,
                            modifier = Modifier
                                .size(16.dp)
                                .clickable { viewModel.attachedMusic = null }
                        )
                    }
                }
            }

            // TOP ACTION BAR (Dismiss, Text, Music, Filters, Adjust)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .align(Alignment.TopCenter),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.5f))
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Text Tool
                    IconButton(
                        onClick = {
                            draftText = viewModel.textOverlay
                            showTextEditor = true
                        },
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(if (viewModel.textOverlay.isNotEmpty()) Color(0xFFDFE104) else Color.Black.copy(alpha = 0.5f))
                    ) {
                        Icon(
                            Icons.Default.TextFields,
                            contentDescription = "Text Sticker",
                            tint = if (viewModel.textOverlay.isNotEmpty()) Color.Black else Color.White
                        )
                    }

                    // Music Tool
                    IconButton(
                        onClick = { showMusicPicker = true },
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(if (viewModel.attachedMusic != null) Color(0xFFDFE104) else Color.Black.copy(alpha = 0.5f))
                    ) {
                        Icon(
                            Icons.Default.MusicNote,
                            contentDescription = "Music Soundtrack",
                            tint = if (viewModel.attachedMusic != null) Color.Black else Color.White
                        )
                    }

                    // Filter Tool
                    IconButton(
                        onClick = {
                            showFiltersStrip = !showFiltersStrip
                            showAdjustments = false
                        },
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(if (viewModel.filterName != "normal") Color(0xFFDFE104) else Color.Black.copy(alpha = 0.5f))
                    ) {
                        Icon(
                            Icons.Default.AutoAwesome,
                            contentDescription = "Filters",
                            tint = if (viewModel.filterName != "normal") Color.Black else Color.White
                        )
                    }

                    // Adjustments Tool (Brightness/Contrast)
                    IconButton(
                        onClick = {
                            showAdjustments = !showAdjustments
                            showFiltersStrip = false
                        },
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(if (viewModel.brightness != 0f) Color(0xFFDFE104) else Color.Black.copy(alpha = 0.5f))
                    ) {
                        Icon(
                            Icons.Default.Tune,
                            contentDescription = "Adjustments",
                            tint = if (viewModel.brightness != 0f) Color.Black else Color.White
                        )
                    }
                }
            }

            // FILTER PRESETS CAROUSEL (Animated slide up above bottom bar)
            AnimatedVisibility(
                visible = showFiltersStrip,
                enter = slideInVertically(initialOffsetY = { it }),
                exit = slideOutVertically(targetOffsetY = { it }),
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 96.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.Black.copy(alpha = 0.85f))
                        .padding(vertical = 12.dp, horizontal = 16.dp)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StoryFilter.values().forEach { filter ->
                        val isSelected = viewModel.filterName == filter.id
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .clickable { viewModel.filterName = filter.id }
                                .padding(4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(52.dp)
                                    .clip(CircleShape)
                                    .border(
                                        width = if (isSelected) 2.5.dp else 1.dp,
                                        color = if (isSelected) Color(0xFFDFE104) else Color(0xFF3F3F46),
                                        shape = CircleShape
                                    )
                                    .background(filter.tintColor ?: Color(0xFF27272A)),
                                contentAlignment = Alignment.Center
                            ) {
                                if (filter.isMono) {
                                    Icon(
                                        Icons.Default.FilterBAndW,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(24.dp)
                                    )
                                } else if (filter == StoryFilter.NORMAL) {
                                    Icon(
                                        Icons.Default.PanoramaFishEye,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = filter.label,
                                fontSize = 11.sp,
                                color = if (isSelected) Color(0xFFDFE104) else Color.LightGray,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }
            }

            // ADJUSTMENTS PANEL (Brightness slider)
            AnimatedVisibility(
                visible = showAdjustments,
                enter = slideInVertically(initialOffsetY = { it }),
                exit = slideOutVertically(targetOffsetY = { it }),
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 96.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.Black.copy(alpha = 0.9f))
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "BRIGHTNESS",
                            color = Color(0xFFDFE104),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${(viewModel.brightness * 100).toInt()}%",
                            color = Color.White,
                            fontSize = 12.sp
                        )
                    }
                    Slider(
                        value = viewModel.brightness,
                        onValueChange = { viewModel.brightness = it },
                        valueRange = -0.3f..0.3f,
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFFDFE104),
                            activeTrackColor = Color(0xFFDFE104),
                            inactiveTrackColor = Color(0xFF3F3F46)
                        )
                    )
                }
            }

            // BOTTOM PUBLISHING DOCK
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .background(Color.Black.copy(alpha = 0.95f))
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Caption / Track info input
                OutlinedTextField(
                    value = viewModel.caption,
                    onValueChange = { viewModel.caption = it },
                    placeholder = { Text("Caption or #genre...", color = Color.Gray, fontSize = 13.sp) },
                    modifier = Modifier.weight(1f),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFDFE104),
                        unfocusedBorderColor = Color(0xFF3F3F46),
                        focusedContainerColor = Color(0xFF141416),
                        unfocusedContainerColor = Color(0xFF141416)
                    ),
                    singleLine = true,
                    shape = RoundedCornerShape(24.dp)
                )

                // High-Contrast Yellow Publish Story Button
                Button(
                    onClick = { viewModel.submitStory() },
                    enabled = !viewModel.isUploading,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFDFE104),
                        contentColor = Color.Black
                    ),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier.height(48.dp)
                ) {
                    if (viewModel.isUploading) {
                        CircularProgressIndicator(
                            color = Color.Black,
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = "YOUR STORY",
                            fontWeight = FontWeight.Black,
                            fontSize = 12.sp,
                            letterSpacing = 0.5.sp
                        )
                    }
                }
            }

            // TEXT STICKER EDITOR OVERLAY DIALOG
            if (showTextEditor) {
                Dialog(
                    onDismissRequest = {
                        viewModel.textOverlay = draftText.trim()
                        showTextEditor = false
                    }
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(20.dp))
                            .background(Color(0xFF18181B))
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "STORY TEXT OVERLAY",
                            color = Color(0xFFDFE104),
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        OutlinedTextField(
                            value = draftText,
                            onValueChange = { draftText = it },
                            placeholder = { Text("DROP YOUR TEXT HERE...", color = Color.Gray) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFFDFE104),
                                unfocusedBorderColor = Color(0xFF3F3F46)
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = {
                                    draftText = ""
                                    viewModel.textOverlay = ""
                                    showTextEditor = false
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Clear", color = Color.LightGray)
                            }
                            Button(
                                onClick = {
                                    viewModel.textOverlay = draftText.trim()
                                    showTextEditor = false
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFFDFE104),
                                    contentColor = Color.Black
                                ),
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Done", fontWeight = FontWeight.Black)
                            }
                        }
                    }
                }
            }

            // MUSIC PICKER SHEET
            if (showMusicPicker) {
                MusicPickerSheet(
                    onDismiss = { showMusicPicker = false },
                    onTrackSelected = { music ->
                        viewModel.attachedMusic = music
                        showMusicPicker = false
                    },
                    onClearMusic = {
                        viewModel.attachedMusic = null
                        showMusicPicker = false
                    }
                )
            }
        }
    }
}

