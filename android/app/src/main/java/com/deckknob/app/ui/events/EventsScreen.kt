package com.deckknob.app.ui.events

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.deckknob.app.data.model.EventDto
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

@Composable
fun EventsScreen(
    viewModel: EventsViewModel = hiltViewModel(),
    onOpenEventDetails: (String) -> Unit = {}
) {
    Scaffold(
        containerColor = Color(0xFF09090B),
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.showCreateEventDialog = true },
                containerColor = Color(0xFFDFE104),
                contentColor = Color.Black,
                shape = CircleShape,
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Host Event", tint = Color.Black)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "HOST EVENT",
                        color = Color.Black,
                        fontWeight = FontWeight.Black,
                        fontSize = 13.sp,
                        letterSpacing = 0.5.sp
                    )
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .statusBarsPadding()
        ) {
            // Screen Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "LIVE EVENTS",
                        fontWeight = FontWeight.Black,
                        fontSize = 22.sp,
                        letterSpacing = 1.sp,
                        color = Color.White
                    )
                    Text(
                        text = "Club nights, festivals & boiler rooms",
                        color = Color.Gray,
                        fontSize = 12.sp
                    )
                }
                IconButton(onClick = { viewModel.loadEvents() }) {
                    Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Color(0xFFDFE104))
                }
            }

            if (viewModel.isLoading && viewModel.events.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFFDFE104))
                }
            } else if (viewModel.events.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.ConfirmationNumber,
                            contentDescription = null,
                            tint = Color(0xFF27272A),
                            modifier = Modifier.size(56.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "NO EVENTS SCHEDULED YET",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 15.sp,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            "Be the first to list a underground set, rave, or vinyl session.",
                            color = Color.Gray,
                            fontSize = 12.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = { viewModel.showCreateEventDialog = true },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFDFE104),
                                contentColor = Color.Black
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("HOST AN EVENT", color = Color.Black, fontWeight = FontWeight.Black)
                        }
                    }
                }
            } else {
                val carouselScrollState = rememberLazyListState()
                val tonightGigs = remember(viewModel.events) {
                    val tonightMatches = viewModel.events.filter {
                        it.date.contains("TONIGHT", ignoreCase = true) || it.date.isBlank()
                    }
                    if (tonightMatches.isNotEmpty()) tonightMatches else viewModel.events.take(5)
                }

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 80.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // 1. TONIGHT'S GIGS Carousel Section
                    if (tonightGigs.isNotEmpty()) {
                        item(key = "tonight_gigs_section") {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = "TONIGHT'S GIGS",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Black,
                                            letterSpacing = 1.5.sp,
                                            color = Color(0xFFDFE104)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(text = "🔥", fontSize = 12.sp)
                                    }
                                    Text(
                                        text = "${tonightGigs.size} gigs",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.Gray
                                    )
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                LazyRow(
                                    state = carouselScrollState,
                                    contentPadding = PaddingValues(horizontal = 16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    items(tonightGigs, key = { "carousel_${it.id}" }) { gig ->
                                        TonightGigCarouselCard(
                                            event = gig,
                                            isAttending = gig.attendees.contains(viewModel.currentUid),
                                            onCardClick = { onOpenEventDetails(gig.id) },
                                            onRsvpClick = { viewModel.toggleRsvp(gig) }
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))
                                HorizontalDivider(color = Color(0xFF27272A).copy(alpha = 0.6f), thickness = 1.dp)
                            }
                        }
                    }

                    // 2. All Events Section Header
                    item(key = "all_events_header") {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "UPCOMING EVENTS",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.5.sp,
                                color = Color.White
                            )
                            Text(
                                text = "${viewModel.events.size} total",
                                fontSize = 11.sp,
                                color = Color.Gray
                            )
                        }
                    }

                    // 3. Full Event Cards
                    items(viewModel.events, key = { it.id }) { event ->
                        Box(modifier = Modifier.padding(horizontal = 16.dp)) {
                            EventCard(
                                event = event,
                                isOwner = event.authorId == viewModel.currentUid,
                                onCardClick = { onOpenEventDetails(event.id) },
                                onEdit = { viewModel.openEditEvent(event) },
                                onDelete = { viewModel.openDeleteDialog(event) }
                            )
                        }
                    }
                }
            }
        }

        if (viewModel.showCreateEventDialog) {
            CreateEventSheet(
                viewModel = viewModel,
                onDismiss = { viewModel.showCreateEventDialog = false }
            )
        }

        if (viewModel.showEditEventDialog) {
            EditEventSheet(
                viewModel = viewModel,
                onDismiss = { viewModel.showEditEventDialog = false }
            )
        }

        if (viewModel.showDeleteEventDialog) {
            DeleteEventConfirmationDialog(
                event = viewModel.deletingEvent,
                isDeleting = viewModel.isDeleting,
                onConfirm = { viewModel.confirmDeleteEvent() },
                onDismiss = { viewModel.showDeleteEventDialog = false }
            )
        }
    }
}

@Composable
fun TonightGigCarouselCard(
    event: EventDto,
    isAttending: Boolean = false,
    onCardClick: () -> Unit = {},
    onRsvpClick: () -> Unit = {}
) {
    Card(
        modifier = Modifier
            .width(230.dp)
            .clip(RoundedCornerShape(16.dp))
            .clickable { onCardClick() },
        colors = CardDefaults.cardColors(containerColor = Color(0xFF141416)),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column {
            val flyer = event.bannerImage
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(115.dp)
                    .background(Color.Black)
            ) {
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
                            .background(Color(0xFF1F1F23)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.ConfirmationNumber,
                            contentDescription = null,
                            tint = Color.Gray,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }

                // Date badge pill
                Box(
                    modifier = Modifier
                        .padding(8.dp)
                        .align(Alignment.TopEnd)
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color.Black.copy(alpha = 0.85f))
                        .border(1.dp, Color(0xFFDFE104), RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = event.date.ifBlank { "TONIGHT" }.uppercase(),
                        color = Color(0xFFDFE104),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.5.sp
                    )
                }
            }

            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = event.title.ifBlank { "Untitled Event" },
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = "${event.venue.ifBlank { "Venue TBA" }}${if (event.city.isNotBlank()) " • " + event.city else ""}",
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
                        text = event.time.ifBlank { "10:00 PM" },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFA1A1AA)
                    )

                    // Dedicated RSVP button with isolated click
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isAttending) Color(0xFF27272A) else Color(0xFFDFE104))
                            .border(
                                1.dp,
                                if (isAttending) Color(0xFFDFE104) else Color.Transparent,
                                RoundedCornerShape(8.dp)
                            )
                            .clickable { onRsvpClick() }
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = if (isAttending) "GOING ✓" else "RSVP",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.5.sp,
                            color = if (isAttending) Color(0xFFDFE104) else Color.Black
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun EventCard(
    event: EventDto,
    isOwner: Boolean = false,
    onCardClick: () -> Unit = {},
    onEdit: () -> Unit = {},
    onDelete: () -> Unit = {}
) {
    var menuExpanded by remember { mutableStateOf(false) }
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .clickable { onCardClick() },
        colors = CardDefaults.cardColors(containerColor = Color(0xFF141416)),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A)),
        shape = RoundedCornerShape(18.dp)
    ) {
        Column {
            val banner = event.bannerImage
            if (banner.isNotEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp))
                        .background(Color.Black)
                ) {
                    AsyncImage(
                        model = banner,
                        contentDescription = event.title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                    // Gradient overlay
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    listOf(Color.Transparent, Color(0xFF141416).copy(alpha = 0.9f))
                                )
                            )
                    )
                    // Date pill badge & Owner 3-dot Menu
                    Row(
                        modifier = Modifier
                            .padding(12.dp)
                            .align(Alignment.TopEnd),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color.Black.copy(alpha = 0.8f))
                                .border(1.dp, Color(0xFFDFE104), RoundedCornerShape(8.dp))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = event.date.ifEmpty { "UPCOMING" }.uppercase(),
                                color = Color(0xFFDFE104),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black
                            )
                        }

                        if (isOwner) {
                            Box {
                                IconButton(
                                    onClick = { menuExpanded = true },
                                    modifier = Modifier
                                        .size(32.dp)
                                        .background(Color.Black.copy(alpha = 0.7f), CircleShape)
                                ) {
                                    Icon(
                                        Icons.Default.MoreVert,
                                        contentDescription = "Event Options",
                                        tint = Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                                DropdownMenu(
                                    expanded = menuExpanded,
                                    onDismissRequest = { menuExpanded = false },
                                    modifier = Modifier.background(Color(0xFF18181B))
                                ) {
                                    DropdownMenuItem(
                                        text = { Text("Edit Event", color = Color.White, fontWeight = FontWeight.Bold) },
                                        onClick = {
                                            menuExpanded = false
                                            onEdit()
                                        },
                                        leadingIcon = {
                                            Icon(Icons.Default.Edit, contentDescription = null, tint = Color(0xFFDFE104))
                                        }
                                    )
                                    DropdownMenuItem(
                                        text = { Text("Delete Event", color = Color(0xFFFF4D4D), fontWeight = FontWeight.Bold) },
                                        onClick = {
                                            menuExpanded = false
                                            onDelete()
                                        },
                                        leadingIcon = {
                                            Icon(Icons.Default.Delete, contentDescription = null, tint = Color(0xFFFF4D4D))
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = event.title,
                    fontWeight = FontWeight.Black,
                    fontSize = 19.sp,
                    color = Color.White
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = Color(0xFFDFE104),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${event.venue} • ${event.city}",
                        fontSize = 13.sp,
                        color = Color(0xFFE4E4E7),
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Schedule,
                        contentDescription = null,
                        tint = Color.Gray,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${event.date} at ${event.time}",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                }

                if (event.description.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = event.description,
                        color = Color(0xFFA1A1AA),
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                }
            }
        }
    }
}

@Composable
fun CreateEventSheet(
    viewModel: EventsViewModel,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) viewModel.bannerUri = uri
    }

    var validationError by remember { mutableStateOf<String?>(null) }

    // Date Picker Dialog setup
    val calendar = Calendar.getInstance()
    val datePickerDialog = DatePickerDialog(
        context,
        { _, year, month, dayOfMonth ->
            val selCal = Calendar.getInstance()
            selCal.set(year, month, dayOfMonth)
            val format = SimpleDateFormat("MMM dd, yyyy", Locale.US)
            viewModel.date = format.format(selCal.time).uppercase()
        },
        calendar.get(Calendar.YEAR),
        calendar.get(Calendar.MONTH),
        calendar.get(Calendar.DAY_OF_MONTH)
    )

    // Time Picker Dialog setup
    val timePickerDialog = TimePickerDialog(
        context,
        { _, hourOfDay, minute ->
            val amPm = if (hourOfDay < 12) "AM" else "PM"
            val displayHour = if (hourOfDay % 12 == 0) 12 else hourOfDay % 12
            viewModel.time = String.format(Locale.US, "%02d:%02d %s", displayHour, minute, amPm)
        },
        calendar.get(Calendar.HOUR_OF_DAY),
        calendar.get(Calendar.MINUTE),
        false
    )

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF09090B))
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "HOST AN EVENT",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp,
                            letterSpacing = 1.sp
                        )
                        Text(
                            text = "Post your club night or festival listing",
                            color = Color.Gray,
                            fontSize = 12.sp
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                    }
                }

                HorizontalDivider(color = Color(0xFF27272A), modifier = Modifier.padding(vertical = 12.dp))

                // Validation or Error Banner
                val currentError = validationError ?: viewModel.error
                if (currentError != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color.Red.copy(alpha = 0.15f))
                            .border(1.dp, Color.Red, RoundedCornerShape(10.dp))
                            .padding(12.dp)
                    ) {
                        Text(
                            text = "⚠ $currentError",
                            color = Color(0xFFFF6B6B),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }

                // Banner Image Card
                Text(
                    text = "EVENT BANNER / FLYER",
                    color = Color(0xFFDFE104),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.5.sp
                )
                Spacer(modifier = Modifier.height(10.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF141416))
                        .border(1.dp, Color(0xFF27272A), RoundedCornerShape(14.dp))
                        .clickable { launcher.launch("image/*") },
                    contentAlignment = Alignment.Center
                ) {
                    if (viewModel.bannerUri != null) {
                        AsyncImage(
                            model = viewModel.bannerUri,
                            contentDescription = "Event Banner Preview",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(10.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color.Black.copy(alpha = 0.8f))
                                .border(1.dp, Color(0xFFDFE104), RoundedCornerShape(8.dp))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text("TAP TO CHANGE", color = Color(0xFFDFE104), fontSize = 11.sp, fontWeight = FontWeight.Black)
                        }
                    } else {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.AddPhotoAlternate,
                                contentDescription = null,
                                tint = Color(0xFFDFE104),
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "UPLOAD EVENT BANNER",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 13.sp,
                                letterSpacing = 0.5.sp
                            )
                            Text("PNG, JPG or WEBP recommended", color = Color.Gray, fontSize = 11.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // Basic Details
                Text(
                    text = "EVENT DETAILS",
                    color = Color(0xFFDFE104),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.5.sp
                )
                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = viewModel.title,
                    onValueChange = {
                        viewModel.title = it
                        validationError = null
                    },
                    label = { Text("Event Title *", color = Color.Gray) },
                    placeholder = { Text("e.g. DARK MATTER: 12-Hour Techno Marathon") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFDFE104),
                        unfocusedBorderColor = Color(0xFF3F3F46),
                        focusedContainerColor = Color(0xFF141416),
                        unfocusedContainerColor = Color(0xFF141416)
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = viewModel.venue,
                        onValueChange = {
                            viewModel.venue = it
                            validationError = null
                        },
                        label = { Text("Venue *", color = Color.Gray) },
                        placeholder = { Text("e.g. Tresor Club") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFFDFE104),
                            unfocusedBorderColor = Color(0xFF3F3F46),
                            focusedContainerColor = Color(0xFF141416),
                            unfocusedContainerColor = Color(0xFF141416)
                        ),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    )

                    OutlinedTextField(
                        value = viewModel.city,
                        onValueChange = { viewModel.city = it },
                        label = { Text("City", color = Color.Gray) },
                        placeholder = { Text("e.g. Berlin") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFFDFE104),
                            unfocusedBorderColor = Color(0xFF3F3F46),
                            focusedContainerColor = Color(0xFF141416),
                            unfocusedContainerColor = Color(0xFF141416)
                        ),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                // Date & Time Picker Section
                Text(
                    text = "DATE & TIME",
                    color = Color(0xFFDFE104),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.5.sp
                )
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Date Button
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF141416))
                            .border(1.dp, Color(0xFF3F3F46), RoundedCornerShape(10.dp))
                            .clickable { datePickerDialog.show() }
                            .padding(14.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.DateRange, contentDescription = null, tint = Color(0xFFDFE104), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = viewModel.date.ifEmpty { "Pick Date" },
                                color = if (viewModel.date.isNotEmpty()) Color.White else Color.Gray,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }

                    // Time Button
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF141416))
                            .border(1.dp, Color(0xFF3F3F46), RoundedCornerShape(10.dp))
                            .clickable { timePickerDialog.show() }
                            .padding(14.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Schedule, contentDescription = null, tint = Color(0xFFDFE104), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = viewModel.time.ifEmpty { "Pick Time" },
                                color = if (viewModel.time.isNotEmpty()) Color.White else Color.Gray,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // Description & Ticket URL
                Text(
                    text = "LINEUP & TICKETS",
                    color = Color(0xFFDFE104),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.5.sp
                )
                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = viewModel.description,
                    onValueChange = { viewModel.description = it },
                    label = { Text("Lineup & Description", color = Color.Gray) },
                    placeholder = { Text("Full lineup, entry policy, age restrictions...") },
                    minLines = 3,
                    maxLines = 6,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFDFE104),
                        unfocusedBorderColor = Color(0xFF3F3F46),
                        focusedContainerColor = Color(0xFF141416),
                        unfocusedContainerColor = Color(0xFF141416)
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = viewModel.url,
                    onValueChange = { viewModel.url = it },
                    label = { Text("Ticket / RSVP URL (Optional)", color = Color.Gray) },
                    placeholder = { Text("https://ra.co/events/...") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFDFE104),
                        unfocusedBorderColor = Color(0xFF3F3F46),
                        focusedContainerColor = Color(0xFF141416),
                        unfocusedContainerColor = Color(0xFF141416)
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(modifier = Modifier.height(28.dp))

                // HIGH CONTRAST YELLOW PUBLISH BUTTON
                Button(
                    onClick = {
                        if (viewModel.title.isBlank()) {
                            validationError = "Please enter an event title."
                            return@Button
                        }
                        if (viewModel.venue.isBlank()) {
                            validationError = "Please specify the venue."
                            return@Button
                        }
                        viewModel.submitEvent()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFDFE104),
                        contentColor = Color.Black
                    ),
                    enabled = !viewModel.isPublishing,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (viewModel.isPublishing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            color = Color.Black,
                            strokeWidth = 2.5.dp
                        )
                    } else {
                        Text(
                            text = "PUBLISH EVENT",
                            color = Color.Black,
                            fontWeight = FontWeight.Black,
                            fontSize = 15.sp,
                            letterSpacing = 1.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedButton(
                    onClick = onDismiss,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.LightGray),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(Color(0xFF3F3F46))
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("CANCEL", color = Color.LightGray, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditEventSheet(
    viewModel: EventsViewModel,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    var validationError by remember { mutableStateOf<String?>(null) }

    val bannerPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) viewModel.editBannerUri = uri
    }

    val calendar = Calendar.getInstance()
    val datePickerDialog = DatePickerDialog(
        context,
        { _, year, month, dayOfMonth ->
            val selCal = Calendar.getInstance()
            selCal.set(year, month, dayOfMonth)
            val format = SimpleDateFormat("MMM dd, yyyy", Locale.US)
            viewModel.editDate = format.format(selCal.time).uppercase()
        },
        calendar.get(Calendar.YEAR),
        calendar.get(Calendar.MONTH),
        calendar.get(Calendar.DAY_OF_MONTH)
    )

    val timePickerDialog = TimePickerDialog(
        context,
        { _, hourOfDay, minute ->
            val amPm = if (hourOfDay < 12) "AM" else "PM"
            val displayHour = if (hourOfDay % 12 == 0) 12 else hourOfDay % 12
            viewModel.editTime = String.format(Locale.US, "%02d:%02d %s", displayHour, minute, amPm)
        },
        calendar.get(Calendar.HOUR_OF_DAY),
        calendar.get(Calendar.MINUTE),
        false
    )

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF09090B))
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("EDIT EVENT", color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp, letterSpacing = 1.sp)
                        Text("Update your event listings and details", color = Color.Gray, fontSize = 12.sp)
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                    }
                }

                HorizontalDivider(color = Color(0xFF27272A), modifier = Modifier.padding(vertical = 12.dp))

                val currentError = validationError ?: viewModel.error
                if (currentError != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color.Red.copy(alpha = 0.15f))
                            .border(1.dp, Color.Red, RoundedCornerShape(10.dp))
                            .padding(12.dp)
                    ) {
                        Text("⚠ $currentError", color = Color(0xFFFF6B6B), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                }

                Text("EVENT COVER POSTER", color = Color(0xFFDFE104), fontSize = 11.sp, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(170.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF141416))
                        .border(1.dp, Color(0xFF27272A), RoundedCornerShape(14.dp))
                        .clickable { bannerPicker.launch("image/*") }
                ) {
                    val displayModel = viewModel.editBannerUri ?: viewModel.editingEvent?.bannerImage
                    if (displayModel != null && displayModel.toString().isNotEmpty()) {
                        AsyncImage(model = displayModel, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    } else {
                        Column(modifier = Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Image, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(36.dp))
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("TAP TO SELECT FLYER", color = Color.LightGray, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                OutlinedTextField(
                    value = viewModel.editTitle,
                    onValueChange = { viewModel.editTitle = it; validationError = null },
                    label = { Text("Event Title *") },
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedBorderColor = Color(0xFFDFE104), unfocusedBorderColor = Color(0xFF27272A)),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = viewModel.editVenue,
                    onValueChange = { viewModel.editVenue = it; validationError = null },
                    label = { Text("Venue / Club *") },
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedBorderColor = Color(0xFFDFE104), unfocusedBorderColor = Color(0xFF27272A)),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = viewModel.editCity,
                    onValueChange = { viewModel.editCity = it },
                    label = { Text("City (e.g. Berlin, Amsterdam)") },
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedBorderColor = Color(0xFFDFE104), unfocusedBorderColor = Color(0xFF27272A)),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = viewModel.editDate,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Date *") },
                        trailingIcon = { IconButton(onClick = { datePickerDialog.show() }) { Icon(Icons.Default.CalendarToday, contentDescription = null, tint = Color(0xFFDFE104)) } },
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedBorderColor = Color(0xFFDFE104), unfocusedBorderColor = Color(0xFF27272A)),
                        modifier = Modifier.weight(1f).clickable { datePickerDialog.show() }
                    )

                    OutlinedTextField(
                        value = viewModel.editTime,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Time *") },
                        trailingIcon = { IconButton(onClick = { timePickerDialog.show() }) { Icon(Icons.Default.AccessTime, contentDescription = null, tint = Color(0xFFDFE104)) } },
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedBorderColor = Color(0xFFDFE104), unfocusedBorderColor = Color(0xFF27272A)),
                        modifier = Modifier.weight(1f).clickable { timePickerDialog.show() }
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = viewModel.editDescription,
                    onValueChange = { viewModel.editDescription = it },
                    label = { Text("Description & Lineup") },
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedBorderColor = Color(0xFFDFE104), unfocusedBorderColor = Color(0xFF27272A)),
                    modifier = Modifier.fillMaxWidth().height(100.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = viewModel.editUrl,
                    onValueChange = { viewModel.editUrl = it },
                    label = { Text("Ticket or Booking URL") },
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedBorderColor = Color(0xFFDFE104), unfocusedBorderColor = Color(0xFF27272A)),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (viewModel.editTitle.isBlank()) {
                            validationError = "Event title is required."
                            return@Button
                        }
                        if (viewModel.editVenue.isBlank()) {
                            validationError = "Venue name is required."
                            return@Button
                        }
                        viewModel.submitEditEvent()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDFE104), contentColor = Color.Black),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    enabled = !viewModel.isSavingEdit
                ) {
                    if (viewModel.isSavingEdit) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.Black)
                    } else {
                        Text("UPDATE EVENT", color = Color.Black, fontWeight = FontWeight.Black, fontSize = 14.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun DeleteEventConfirmationDialog(
    event: EventDto?,
    isDeleting: Boolean,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    if (event == null) return
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF141416),
        title = {
            Text("DELETE EVENT", color = Color.White, fontWeight = FontWeight.Black)
        },
        text = {
            Column {
                Text(
                    text = "Are you sure you want to delete \"${event.title}\"?",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "This will permanently remove the event from DECKKNOB's event listings and live radar. This action cannot be undone.",
                    color = Color.Gray,
                    fontSize = 13.sp
                )
            }
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(containerColor = Color.Red, contentColor = Color.White),
                enabled = !isDeleting
            ) {
                if (isDeleting) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                } else {
                    Text("DELETE EVENT", fontWeight = FontWeight.Black)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isDeleting) {
                Text("CANCEL", color = Color.LightGray)
            }
        }
    )
}
