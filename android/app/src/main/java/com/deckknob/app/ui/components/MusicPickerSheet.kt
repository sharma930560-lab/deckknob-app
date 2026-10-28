package com.deckknob.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.deckknob.app.data.model.MusicDto
import com.deckknob.app.ui.theme.DeckKnobBlack
import com.deckknob.app.ui.theme.DeckKnobYellow

data class CuratedTrackItem(
    val id: String,
    val title: String,
    val artist: String,
    val genre: String,
    val bpm: Int,
    val duration: Double,
    val audioUrl: String,
    val license: String = "Creative Commons BY 4.0"
)

val CURATED_ELECTRONIC_CATALOG = listOf(
    CuratedTrackItem(
        id = "curated_1",
        title = "Techno Pulse",
        artist = "Leon Bassline",
        genre = "Techno",
        bpm = 128,
        duration = 15.0,
        audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    ),
    CuratedTrackItem(
        id = "curated_2",
        title = "Summer House Breeze",
        artist = "Nora Waves",
        genre = "House",
        bpm = 122,
        duration = 15.0,
        audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    ),
    CuratedTrackItem(
        id = "curated_3",
        title = "Neon Horizon",
        artist = "Synth Ranger",
        genre = "Synthwave",
        bpm = 115,
        duration = 15.0,
        audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
    ),
    CuratedTrackItem(
        id = "curated_4",
        title = "Berlin Deep Acid",
        artist = "Klangkuenstler",
        genre = "Hard Techno",
        bpm = 135,
        duration = 15.0,
        audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
    ),
    CuratedTrackItem(
        id = "curated_5",
        title = "Ibiza Sunset Melodic",
        artist = "Solomun Vibe",
        genre = "Melodic House",
        bpm = 124,
        duration = 15.0,
        audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
    ),
    CuratedTrackItem(
        id = "curated_6",
        title = "Subway Dark Grooves",
        artist = "Charlotte Kraft",
        genre = "Techno",
        bpm = 130,
        duration = 15.0,
        audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"
    )
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MusicPickerSheet(
    onDismiss: () -> Unit,
    onTrackSelected: (MusicDto) -> Unit,
    onClearMusic: (() -> Unit)? = null
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedGenre by remember { mutableStateOf("All") }
    var playingTrackId by remember { mutableStateOf<String?>(null) }

    val genres = listOf("All", "Techno", "House", "Synthwave", "Hard Techno", "Melodic House")

    val filteredTracks = CURATED_ELECTRONIC_CATALOG.filter { track ->
        val matchesGenre = selectedGenre == "All" || track.genre.equals(selectedGenre, ignoreCase = true)
        val matchesQuery = searchQuery.isBlank() ||
                track.title.contains(searchQuery, ignoreCase = true) ||
                track.artist.contains(searchQuery, ignoreCase = true)
        matchesGenre && matchesQuery
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = DeckKnobBlack,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "ADD SOUNDTRACK",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 17.sp,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "Pre-cleared royalty-free electronic music for UGC",
                        color = Color.Gray,
                        fontSize = 12.sp
                    )
                }

                if (onClearMusic != null) {
                    TextButton(onClick = {
                        onClearMusic()
                        onDismiss()
                    }) {
                        Text("REMOVE", color = Color.Red, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search tracks, artists, or techno beats...", color = Color.Gray, fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = DeckKnobYellow) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = DeckKnobYellow,
                    unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                )
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Genre Chips
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(genres) { g ->
                    val isSelected = selectedGenre == g
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = if (isSelected) DeckKnobYellow else Color.White.copy(alpha = 0.08f),
                        modifier = Modifier.clickable { selectedGenre = g }
                    ) {
                        Text(
                            text = g,
                            color = if (isSelected) DeckKnobBlack else Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Track List
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 380.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(filteredTracks) { track ->
                    Surface(
                        color = Color(0xFF18181B),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                onTrackSelected(
                                    MusicDto(
                                        id = track.id,
                                        title = track.title,
                                        artist = track.artist,
                                        audioUrl = track.audioUrl,
                                        previewUrl = track.audioUrl,
                                        duration = track.duration,
                                        attribution = "${track.artist} (${track.license})"
                                    )
                                )
                                onDismiss()
                            }
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
                                        .size(42.dp)
                                        .clip(CircleShape)
                                        .background(DeckKnobYellow.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.MusicNote,
                                        contentDescription = null,
                                        tint = DeckKnobYellow,
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
                                    Text(
                                        text = "${track.artist} • ${track.genre} • ${track.bpm} BPM",
                                        color = Color.Gray,
                                        fontSize = 11.sp
                                    )
                                }
                            }

                            Button(
                                onClick = {
                                    onTrackSelected(
                                        MusicDto(
                                            id = track.id,
                                            title = track.title,
                                            artist = track.artist,
                                            audioUrl = track.audioUrl,
                                            previewUrl = track.audioUrl,
                                            duration = track.duration,
                                            attribution = "${track.artist} (${track.license})"
                                        )
                                    )
                                    onDismiss()
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = DeckKnobYellow,
                                    contentColor = DeckKnobBlack
                                ),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                            ) {
                                Text("USE", fontWeight = FontWeight.Black, fontSize = 11.sp, color = DeckKnobBlack)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

