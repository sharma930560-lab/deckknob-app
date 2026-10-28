package com.deckknob.app.ui.events

import android.content.Intent
import android.net.Uri
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
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
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
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.deckknob.app.data.model.EventDto

private val DeckKnobYellow = Color(0xFFDFE104)
private val DeckKnobDarkBg = Color(0xFF09090B)
private val DeckKnobCardBg = Color(0xFF141416)
private val DeckKnobBorder = Color(0xFF27272A)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EventDetailsScreen(
    eventId: String,
    viewModel: EventDetailsViewModel = hiltViewModel(),
    onBack: () -> Unit,
    onOpenUserProfile: (String) -> Unit = {}
) {
    val context = LocalContext.current

    LaunchedEffect(eventId) {
        viewModel.loadEvent(eventId)
    }

    val uiState = viewModel.uiState

    Scaffold(
        containerColor = DeckKnobDarkBg,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .size(40.dp)
                        .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.White
                    )
                }

                Text(
                    text = "EVENT DETAILS",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 13.sp,
                    letterSpacing = 1.5.sp
                )

                if (uiState is EventDetailsUiState.Success) {
                    val event = uiState.event
                    IconButton(
                        onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                val shareText = buildString {
                                    append("Check out ${event.title}")
                                    if (event.venue.isNotBlank()) append(" at ${event.venue}")
                                    if (event.date.isNotBlank()) append(" on ${event.date}")
                                    append(" on DECKKNOB 🔥")
                                }
                                putExtra(Intent.EXTRA_TEXT, shareText)
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Share Event"))
                        },
                        modifier = Modifier
                            .size(40.dp)
                            .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                    ) {
                        Icon(
                            Icons.Default.Share,
                            contentDescription = "Share",
                            tint = DeckKnobYellow
                        )
                    }
                } else {
                    Spacer(modifier = Modifier.size(40.dp))
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (uiState) {
                is EventDetailsUiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = DeckKnobYellow)
                    }
                }

                is EventDetailsUiState.Error -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                Icons.Default.EventBusy,
                                contentDescription = null,
                                tint = Color.Gray,
                                modifier = Modifier.size(64.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "EVENT NOT AVAILABLE",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 18.sp,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = uiState.message.ifBlank { "This event may have been deleted, cancelled, or is temporarily inaccessible." },
                                color = Color.Gray,
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = onBack,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = DeckKnobYellow,
                                    contentColor = Color.Black
                                ),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = Color.Black)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "GO BACK",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 13.sp
                                )
                            }
                        }
                    }
                }

                is EventDetailsUiState.Success -> {
                    val event = uiState.event
                    val scrollState = rememberScrollState()

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(scrollState)
                    ) {
                        // Poster Banner
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(260.dp)
                                .background(Color.Black)
                        ) {
                            val flyer = event.bannerImage
                            if (flyer.isNotBlank()) {
                                AsyncImage(
                                    model = flyer,
                                    contentDescription = event.title,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(Color(0xFF18181B)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.ConfirmationNumber,
                                        contentDescription = null,
                                        tint = Color(0xFF3F3F46),
                                        modifier = Modifier.size(72.dp)
                                    )
                                }
                            }

                            // Dark gradient overlay
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(
                                                Color.Transparent,
                                                Color.Black.copy(alpha = 0.4f),
                                                DeckKnobDarkBg
                                            )
                                        )
                                    )
                            )

                            // Date Badge Pill
                            Box(
                                modifier = Modifier
                                    .padding(16.dp)
                                    .align(Alignment.BottomStart)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color.Black.copy(alpha = 0.85f))
                                    .border(1.dp, DeckKnobYellow, RoundedCornerShape(8.dp))
                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = event.date.ifBlank { "UPCOMING" }.uppercase(),
                                    color = DeckKnobYellow,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Black,
                                    letterSpacing = 1.sp
                                )
                            }
                        }

                        // Event Information Body
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp, vertical = 12.dp)
                        ) {
                            // Title
                            Text(
                                text = event.title.ifBlank { "Untitled Event" },
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White,
                                letterSpacing = 0.5.sp,
                                lineHeight = 30.sp
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            // Presented by / Host Row
                            val hostName = event.username.ifBlank { "Resident DJ" }
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(DeckKnobCardBg)
                                    .border(1.dp, DeckKnobBorder, RoundedCornerShape(12.dp))
                                    .clickable {
                                        if (event.authorId.isNotBlank()) {
                                            onOpenUserProfile(event.authorId)
                                        }
                                    }
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(42.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF27272A)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.Person,
                                        contentDescription = null,
                                        tint = DeckKnobYellow,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "HOSTED BY",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Black,
                                        letterSpacing = 1.sp,
                                        color = Color.Gray
                                    )
                                    Text(
                                        text = "@$hostName",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }

                                if (event.authorId.isNotBlank()) {
                                    Text(
                                        text = "View Profile →",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = DeckKnobYellow
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Date & Venue Details Card
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(DeckKnobCardBg)
                                    .border(1.dp, DeckKnobBorder, RoundedCornerShape(14.dp))
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                // Date & Time
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Color(0xFF1E1E22)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            Icons.Default.CalendarToday,
                                            contentDescription = null,
                                            tint = DeckKnobYellow,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            text = "DATE & TIME",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Black,
                                            letterSpacing = 1.sp,
                                            color = Color.Gray
                                        )
                                        Text(
                                            text = "${event.date.ifBlank { "Date TBA" }} • ${event.time.ifBlank { "Time TBA" }}",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color.White
                                        )
                                    }
                                }

                                HorizontalDivider(color = Color.White.copy(alpha = 0.06f))

                                // Venue & Location
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Color(0xFF1E1E22)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            Icons.Default.LocationOn,
                                            contentDescription = null,
                                            tint = DeckKnobYellow,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            text = "VENUE / LOCATION",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Black,
                                            letterSpacing = 1.sp,
                                            color = Color.Gray
                                        )
                                        Text(
                                            text = "${event.venue.ifBlank { "Venue TBA" }}${if (event.city.isNotBlank()) " • " + event.city else ""}",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color.White
                                        )
                                    }
                                }
                            }

                            // Lineup Section (if provided)
                            val allArtists = (event.lineup + event.performingDJs).distinct().filter { it.isNotBlank() }
                            if (allArtists.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(18.dp))
                                Text(
                                    text = "LINEUP",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    letterSpacing = 1.5.sp,
                                    color = DeckKnobYellow
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    allArtists.forEach { artist ->
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Color(0xFF1E1E22))
                                                .border(1.dp, Color(0xFF2E2E33), RoundedCornerShape(8.dp))
                                                .padding(horizontal = 10.dp, vertical = 6.dp)
                                        ) {
                                            Text(
                                                text = artist,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                        }
                                    }
                                }
                            }

                            // Description Section
                            Spacer(modifier = Modifier.height(18.dp))
                            Text(
                                text = "ABOUT EVENT",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.5.sp,
                                color = DeckKnobYellow
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = event.description.ifBlank { "No detailed description provided." },
                                fontSize = 14.sp,
                                color = Color(0xFFD4D4D8),
                                lineHeight = 20.sp
                            )

                            // Attendees Counter
                            Spacer(modifier = Modifier.height(18.dp))
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFF18181B))
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.People,
                                        contentDescription = null,
                                        tint = DeckKnobYellow,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "${uiState.attendeeCount} ${if (uiState.attendeeCount == 1) "person" else "people"} going",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    )
                                }
                                if (uiState.isAttending) {
                                    Text(
                                        text = "YOU'RE ATTENDING",
                                        color = DeckKnobYellow,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 10.sp,
                                        letterSpacing = 1.sp
                                    )
                                }
                            }

                            // Actions: RSVP & Tickets
                            Spacer(modifier = Modifier.height(24.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                // RSVP Toggle Button
                                Button(
                                    onClick = { viewModel.toggleRsvp() },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(50.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (uiState.isAttending) Color(0xFF27272A) else DeckKnobYellow,
                                        contentColor = if (uiState.isAttending) DeckKnobYellow else Color.Black
                                    ),
                                    border = if (uiState.isAttending) androidx.compose.foundation.BorderStroke(1.dp, DeckKnobYellow) else null,
                                    shape = RoundedCornerShape(12.dp),
                                    enabled = !uiState.isRsvping
                                ) {
                                    if (uiState.isRsvping) {
                                        CircularProgressIndicator(
                                            color = if (uiState.isAttending) DeckKnobYellow else Color.Black,
                                            modifier = Modifier.size(18.dp),
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Icon(
                                            if (uiState.isAttending) Icons.Default.Check else Icons.Default.BookmarkAdd,
                                            contentDescription = null,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = if (uiState.isAttending) "GOING ✓" else "RSVP NOW",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 13.sp,
                                            letterSpacing = 0.5.sp
                                        )
                                    }
                                }

                                // Ticket / External Link Button (if present)
                                val ticketLink = event.ticketUrl.ifBlank { event.url }
                                if (ticketLink.isNotBlank()) {
                                    Button(
                                        onClick = {
                                            try {
                                                val uri = if (!ticketLink.startsWith("http://") && !ticketLink.startsWith("https://")) {
                                                    Uri.parse("https://$ticketLink")
                                                } else {
                                                    Uri.parse(ticketLink)
                                                }
                                                val browserIntent = Intent(Intent.ACTION_VIEW, uri)
                                                context.startActivity(browserIntent)
                                            } catch (_: Exception) {}
                                        },
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(50.dp),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = Color(0xFF1E1E22),
                                            contentColor = Color.White
                                        ),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, DeckKnobBorder),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.ConfirmationNumber,
                                            contentDescription = null,
                                            tint = DeckKnobYellow,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "TICKETS",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 13.sp,
                                            letterSpacing = 0.5.sp
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(32.dp))
                        }
                    }
                }
            }
        }
    }
}

