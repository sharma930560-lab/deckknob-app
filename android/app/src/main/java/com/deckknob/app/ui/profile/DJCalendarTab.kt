package com.deckknob.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.deckknob.app.data.model.CalendarAccessResult
import com.deckknob.app.data.model.DJCalendarEntry
import com.deckknob.app.ui.theme.DeckKnobBlack
import com.deckknob.app.ui.theme.DeckKnobDarkCard
import com.deckknob.app.ui.theme.DeckKnobYellow

@Composable
fun DJCalendarTabContent(
    viewModel: ProfileViewModel,
    isOwner: Boolean = true
) {
    val accessResult = viewModel.calendarAccessResult
    val settings = viewModel.calendarSettings

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        // Top Banner & Controls
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Color(0xFF18181B))
                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                .padding(14.dp)
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "DJ CALENDAR",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp,
                            color = DeckKnobYellow
                        )
                        Spacer(modifier = Modifier.width(8.dp))

                        val (badgeText, badgeBg, badgeColor) = when (settings.privacy) {
                            "followers" -> Triple("👥 FOLLOWERS ONLY", Color(0xFFF59E0B).copy(alpha = 0.15f), Color(0xFFFBBF24))
                            "public" -> Triple("🌐 PUBLIC", Color(0xFF10B981).copy(alpha = 0.15f), Color(0xFF34D399))
                            else -> Triple("🔒 ONLY ME", Color(0xFFEF4444).copy(alpha = 0.15f), Color(0xFFF87171))
                        }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(badgeBg)
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = badgeText,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black,
                                color = badgeColor
                            )
                        }
                    }

                    if (isOwner) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            // Privacy Button
                            OutlinedButton(
                                onClick = { viewModel.showCalendarPrivacyDialog = true },
                                modifier = Modifier.height(32.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = Color.White
                                ),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.2f)),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Lock, contentDescription = "Privacy", modifier = Modifier.size(13.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Privacy", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }

                            // Add Entry Button
                            Button(
                                onClick = { viewModel.openAddCalendarEntry() },
                                modifier = Modifier.height(32.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = DeckKnobYellow,
                                    contentColor = Color.Black
                               ),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = "Add", modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(2.dp))
                                Text("+ Entry", fontSize = 10.sp, fontWeight = FontWeight.Black)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (isOwner) "Your private schedule, confirmed gigs, and booking holds."
                    else "Confirmed tour dates and gig schedule.",
                    fontSize = 11.sp,
                    color = Color.Gray
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Content States
        when (accessResult) {
            is CalendarAccessResult.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = DeckKnobYellow, modifier = Modifier.size(28.dp))
                }
            }

            is CalendarAccessResult.Restricted -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color(0xFF121214))
                        .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                        .padding(28.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.06f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (accessResult.reason == "private") Icons.Default.Lock else Icons.Default.Person,
                                contentDescription = null,
                                tint = if (accessResult.reason == "private") Color.Gray else DeckKnobYellow,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = if (accessResult.reason == "private") "Personal Calendar Is Private"
                            else "Followers-Only Schedule",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (accessResult.reason == "private")
                                "This DJ has kept their personal calendar confidential. Only public events are visible."
                            else
                                "This DJ only shares their tour dates and personal schedule with active followers.",
                            fontSize = 11.sp,
                            color = Color.Gray,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            is CalendarAccessResult.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = accessResult.message, color = Color.Red, fontSize = 12.sp)
                }
            }

            is CalendarAccessResult.Authorized -> {
                if (accessResult.entries.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = "📅", fontSize = 28.sp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "NO SCHEDULED ENTRIES YET",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                letterSpacing = 1.sp,
                                color = Color.LightGray
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = if (isOwner) "Tap '+ Entry' to record your upcoming gigs, holds, or studio sessions."
                                else "No tour dates currently listed on this calendar.",
                                fontSize = 11.sp,
                                color = Color.Gray,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        accessResult.entries.forEach { entry ->
                            DJCalendarEntryCard(
                                entry = entry,
                                isOwner = isOwner,
                                onEdit = { viewModel.openEditCalendarEntry(entry) },
                                onDelete = { viewModel.deletingCalendarEntryId = entry.id }
                            )
                        }
                    }
                }
            }
        }
    }

    // Privacy Dialog
    if (viewModel.showCalendarPrivacyDialog) {
        DJCalendarPrivacyDialog(
            currentPrivacy = settings.privacy,
            onDismiss = { viewModel.showCalendarPrivacyDialog = false },
            onSelectPrivacy = { viewModel.updateCalendarPrivacy(it) }
        )
    }

    // Add / Edit Entry Dialog
    if (viewModel.showAddCalendarEntryDialog) {
        AddCalendarEntryDialog(
            viewModel = viewModel,
            onDismiss = { viewModel.showAddCalendarEntryDialog = false },
            onSave = { viewModel.saveCalendarEntry() }
        )
    }

    // Delete Confirmation Dialog
    if (viewModel.deletingCalendarEntryId != null) {
        val entryId = viewModel.deletingCalendarEntryId ?: ""
        DeleteCalendarEntryDialog(
            onDismiss = { viewModel.deletingCalendarEntryId = null },
            onConfirm = { viewModel.deleteCalendarEntry(entryId) }
        )
    }
}

@Composable
fun DJCalendarEntryCard(
    entry: DJCalendarEntry,
    isOwner: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val (typeLabel, typeBg, typeColor) = when (entry.entryType) {
        "tentative" -> Triple("HOLD", Color(0xFFF59E0B).copy(alpha = 0.2f), Color(0xFFFBBF24))
        "personal" -> Triple("PERSONAL", Color(0xFF3F3F46), Color.LightGray)
        else -> Triple("GIG", DeckKnobYellow, Color.Black)
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0xFF141416))
            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(14.dp))
            .padding(12.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Date Pill
                    Box(
                        modifier = Modifier
                            .size(width = 46.dp, height = 46.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color.White.copy(alpha = 0.05f))
                            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        val dateParts = entry.date.split("-")
                        val day = if (dateParts.size == 3) dateParts[2] else "--"
                        val month = if (dateParts.size == 3) {
                            when (dateParts[1]) {
                                "01" -> "JAN"; "02" -> "FEB"; "03" -> "MAR"; "04" -> "APR"
                                "05" -> "MAY"; "06" -> "JUN"; "07" -> "JUL"; "08" -> "AUG"
                                "09" -> "SEP"; "10" -> "OCT"; "11" -> "NOV"; "12" -> "DEC"
                                else -> dateParts[1]
                            }
                        } else "TBD"

                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = month, fontSize = 9.sp, fontWeight = FontWeight.Black, color = DeckKnobYellow)
                            Text(text = day, fontSize = 14.sp, fontWeight = FontWeight.Black, color = Color.White)
                        }
                    }

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = entry.title,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(typeBg)
                                    .padding(horizontal = 6.dp, vertical = 1.dp)
                            ) {
                                Text(
                                    text = typeLabel,
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.Black,
                                    color = typeColor
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(2.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (entry.venue.isNotBlank()) {
                                Text(text = entry.venue, fontSize = 11.sp, color = Color.LightGray, fontWeight = FontWeight.SemiBold)
                            }
                            if (entry.city.isNotBlank()) {
                                Text(text = " • ${entry.city}", fontSize = 11.sp, color = Color.Gray)
                            }
                            if (entry.startTime.isNotBlank()) {
                                Text(text = " (${entry.startTime}${if (entry.endTime.isNotBlank()) " - " + entry.endTime else ""})", fontSize = 10.sp, color = Color.Gray)
                            }
                        }
                    }
                }

                // Owner Edit/Delete Actions
                if (isOwner) {
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        IconButton(onClick = onEdit, modifier = Modifier.size(28.dp)) {
                            Icon(Icons.Default.Edit, contentDescription = "Edit", tint = Color.LightGray, modifier = Modifier.size(14.dp))
                        }
                        IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color(0xFFEF4444), modifier = Modifier.size(14.dp))
                        }
                    }
                }
            }

            // Private Notes (Visible ONLY to owner)
            if (isOwner && entry.notes.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.4f))
                        .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "🔒 Rider Note: ${entry.notes}",
                        fontSize = 10.sp,
                        color = Color(0xFFA1A1AA)
                    )
                }
            }
        }
    }
}

@Composable
fun DJCalendarPrivacyDialog(
    currentPrivacy: String,
    onDismiss: () -> Unit,
    onSelectPrivacy: (String) -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF18181B)),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(20.dp))
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "CALENDAR PRIVACY",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Control who can access your schedule and tour dates.",
                    fontSize = 11.sp,
                    color = Color.Gray
                )

                Spacer(modifier = Modifier.height(16.dp))

                val options = listOf(
                    Triple("private", "Private — Only Me", "Maximum privacy. Fully hidden from all users and followers."),
                    Triple("followers", "Followers Only", "Visible only to users who actively follow your profile. Non-followers cannot see entries."),
                    Triple("public", "Public Calendar", "Opt-in: Visible to all DECKKNOB users. Private notes always remain hidden.")
                )

                options.forEach { (key, title, desc) ->
                    val isSelected = currentPrivacy == key
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) DeckKnobYellow.copy(alpha = 0.12f) else Color.White.copy(alpha = 0.03f))
                            .border(
                                1.dp,
                                if (isSelected) DeckKnobYellow else Color.White.copy(alpha = 0.08f),
                                RoundedCornerShape(12.dp)
                            )
                            .clickable { onSelectPrivacy(key) }
                            .padding(12.dp)
                    ) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = title,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = if (isSelected) DeckKnobYellow else Color.White
                                )
                                if (isSelected) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = DeckKnobYellow, modifier = Modifier.size(16.dp))
                                }
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(text = desc, fontSize = 10.sp, color = Color.Gray)
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.1f)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Close", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun AddCalendarEntryDialog(
    viewModel: ProfileViewModel,
    onDismiss: () -> Unit,
    onSave: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF141416)),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(20.dp))
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = if (viewModel.editingCalendarEntry != null) "EDIT CALENDAR ENTRY" else "NEW CALENDAR ENTRY",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(14.dp))

                // Title
                OutlinedTextField(
                    value = viewModel.calEntryTitle,
                    onValueChange = { viewModel.calEntryTitle = it },
                    label = { Text("Event / Gig Title *") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = DeckKnobYellow,
                        unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                        focusedLabelColor = DeckKnobYellow,
                        unfocusedLabelColor = Color.Gray,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Entry Type Selector
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("gig" to "Gig", "tentative" to "Hold", "personal" to "Personal").forEach { (type, label) ->
                        val isSel = viewModel.calEntryType == type
                        Button(
                            onClick = { viewModel.calEntryType = type },
                            modifier = Modifier
                                .weight(1f)
                                .height(34.dp),
                            contentPadding = PaddingValues(0.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isSel) DeckKnobYellow else Color.White.copy(alpha = 0.05f),
                                contentColor = if (isSel) Color.Black else Color.Gray
                            ),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Date & Time
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = viewModel.calEntryDate,
                        onValueChange = { viewModel.calEntryDate = it },
                        label = { Text("Date (YYYY-MM-DD)") },
                        modifier = Modifier.weight(1.4f),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = DeckKnobYellow,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                    OutlinedTextField(
                        value = viewModel.calEntryStartTime,
                        onValueChange = { viewModel.calEntryStartTime = it },
                        label = { Text("Start") },
                        modifier = Modifier.weight(1f),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = DeckKnobYellow,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Venue & City
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = viewModel.calEntryVenue,
                        onValueChange = { viewModel.calEntryVenue = it },
                        label = { Text("Venue / Club") },
                        modifier = Modifier.weight(1.2f),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = DeckKnobYellow,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                    OutlinedTextField(
                        value = viewModel.calEntryCity,
                        onValueChange = { viewModel.calEntryCity = it },
                        label = { Text("City") },
                        modifier = Modifier.weight(1f),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = DeckKnobYellow,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Private Notes
                OutlinedTextField(
                    value = viewModel.calEntryNotes,
                    onValueChange = { viewModel.calEntryNotes = it },
                    label = { Text("Private Notes (Rider, Soundcheck) 🔒") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = DeckKnobYellow,
                        unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                    ) {
                        Text("Cancel")
                    }

                    Button(
                        onClick = onSave,
                        enabled = !viewModel.isSavingCalendarEntry,
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = DeckKnobYellow,
                            contentColor = Color.Black
                        )
                    ) {
                        Text(
                            text = if (viewModel.isSavingCalendarEntry) "Saving..." else "Save Entry",
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DeleteCalendarEntryDialog(
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF18181B)),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color(0xFFEF4444).copy(alpha = 0.3f), RoundedCornerShape(20.dp))
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = null,
                    tint = Color(0xFFEF4444),
                    modifier = Modifier.size(36.dp)
                )
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "DELETE ENTRY?",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "This will remove the entry from your personal schedule. Any separately published public event will NOT be deleted.",
                    fontSize = 11.sp,
                    color = Color.Gray,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier
                            .weight(1f)
                            .height(40.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                    ) {
                        Text("Cancel", fontSize = 12.sp)
                    }
                    Button(
                        onClick = onConfirm,
                        modifier = Modifier
                            .weight(1f)
                            .height(40.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFEF4444),
                            contentColor = Color.White
                        )
                    ) {
                        Text("Delete", fontSize = 12.sp, fontWeight = FontWeight.Black)
                    }
                }
            }
        }
    }
}

