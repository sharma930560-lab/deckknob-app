package com.deckknob.app.ui.onboarding

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage

@Composable
fun OnboardingScreen(
    onFinished: () -> Unit,
    viewModel: OnboardingViewModel = hiltViewModel()
) {
    if (viewModel.onboardingFinished) {
        onFinished()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Progress Bar
        Row(modifier = Modifier.fillMaxWidth().padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            for (i in 0..3) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(if (i <= viewModel.currentStep) Color(0xFFDFE104) else Color.White.copy(alpha = 0.1f))
                )
            }
        }

        Spacer(modifier = Modifier.height(40.dp))

        Crossfade(targetState = viewModel.currentStep, label = "OnboardingSteps") { step ->
            when (step) {
                0 -> AvatarStep(viewModel)
                1 -> CityStep(viewModel)
                2 -> GenreStep(viewModel)
                3 -> BioStep(viewModel)
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            if (viewModel.currentStep > 0) {
                OutlinedButton(
                    onClick = { viewModel.prevStep() },
                    modifier = Modifier.weight(1f).height(56.dp),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text("BACK")
                }
            }
            Button(
                onClick = { viewModel.nextStep() },
                modifier = Modifier.weight(2f).height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDFE104), contentColor = Color.Black),
                shape = RoundedCornerShape(16.dp),
                enabled = !viewModel.isLoading
            ) {
                Text(if (viewModel.currentStep == 3) "FINISH" else "CONTINUE", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun AvatarStep(viewModel: OnboardingViewModel) {
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let { viewModel.profilePic = it.toString() }
    }

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text("SET YOUR AVATAR", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
        Text("Give your profile a face.", color = Color.Gray, fontSize = 14.sp)
        
        Spacer(modifier = Modifier.height(48.dp))

        Box(
            modifier = Modifier
                .size(160.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.05f))
                .clickable { launcher.launch("image/*") },
            contentAlignment = Alignment.Center
        ) {
            if (viewModel.profilePic != null) {
                AsyncImage(
                    model = viewModel.profilePic,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Cover
                )
            } else {
                Text("TAP TO UPLOAD", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun CityStep(viewModel: OnboardingViewModel) {
    Column {
        Text("WHERE DO YOU PLAY?", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
        Text("Let the scene know your city.", color = Color.Gray, fontSize = 14.sp)
        
        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = viewModel.city,
            onValueChange = { viewModel.city = it },
            placeholder = { Text("Mumbai, Berlin, Tokyo...") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        )
    }
}

@Composable
fun GenreStep(viewModel: OnboardingViewModel) {
    Column {
        Text("YOUR SOUND", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
        Text("Pick your primary genre.", color = Color.Gray, fontSize = 14.sp)
        
        Spacer(modifier = Modifier.height(32.dp))

        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            viewModel.genres.forEach { genre ->
                FilterChip(
                    selected = viewModel.genre == genre,
                    onClick = { viewModel.genre = genre },
                    label = { Text(genre) },
                    shape = RoundedCornerShape(12.dp),
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Color(0xFFDFE104),
                        selectedLabelColor = Color.Black
                    )
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FlowRow(
    modifier: Modifier = Modifier,
    horizontalArrangement: Arrangement.Horizontal = Arrangement.Start,
    verticalArrangement: Arrangement.Vertical = Arrangement.Top,
    content: @Composable () -> Unit
) {
    androidx.compose.foundation.layout.FlowRow(
        modifier = modifier,
        horizontalArrangement = horizontalArrangement,
        verticalArrangement = verticalArrangement,
        content = { content() }
    )
}

@Composable
fun BioStep(viewModel: OnboardingViewModel) {
    Column {
        Text("WRITE YOUR BIO", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
        Text("A line or two about yourself.", color = Color.Gray, fontSize = 14.sp)
        
        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = viewModel.bio,
            onValueChange = { if (it.length <= 200) viewModel.bio = it },
            modifier = Modifier.fillMaxWidth().height(160.dp),
            placeholder = { Text("Warehouse selector. Acid pressure...") },
            shape = RoundedCornerShape(16.dp)
        )
        Text(
            "${viewModel.bio.length}/200",
            modifier = Modifier.align(Alignment.End).padding(top = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = Color.Gray
        )
    }
}
