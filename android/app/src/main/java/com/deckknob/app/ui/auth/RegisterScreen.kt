package com.deckknob.app.ui.auth

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onBackToLogin: () -> Unit,
    viewModel: RegisterViewModel = hiltViewModel()
) {
    if (viewModel.registerSuccess) {
        onRegisterSuccess()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.Start,
        verticalArrangement = Arrangement.Top
    ) {
        Text(
            text = "JOIN THE UNDERGROUND",
            style = MaterialTheme.typography.labelSmall,
            color = Color(0xFFDFE104),
            fontWeight = FontWeight.Bold,
            letterSpacing = 2.sp
        )
        Text(
            text = "BUILD YOUR SIGNAL",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Black,
            lineHeight = 40.sp
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Username Field with Status
        Text("Username", style = MaterialTheme.typography.labelMedium, color = Color.Gray)
        OutlinedTextField(
            value = viewModel.username,
            onValueChange = { viewModel.onUsernameChange(it) },
            modifier = Modifier.fillMaxWidth(),
            trailingIcon = {
                if (viewModel.isCheckingUsername) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else if (viewModel.isUsernameAvailable == true) {
                    Icon(Icons.Default.CheckCircle, "Available", tint = Color.Green)
                } else if (viewModel.isUsernameAvailable == false) {
                    Icon(Icons.Default.Warning, "Taken", tint = Color.Red)
                }
            },
            isError = viewModel.isUsernameAvailable == false,
            shape = RoundedCornerShape(16.dp)
        )
        
        if (viewModel.isUsernameAvailable == false) {
            Text("Username taken. Try these:", color = Color.Red, style = MaterialTheme.typography.bodySmall)
            LazyRow(modifier = Modifier.padding(vertical = 8.dp)) {
                items(viewModel.suggestions) { suggestion ->
                    SuggestionChip(text = suggestion) {
                        viewModel.onUsernameChange(suggestion)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text("Email", style = MaterialTheme.typography.labelMedium, color = Color.Gray)
        OutlinedTextField(
            value = viewModel.email,
            onValueChange = { viewModel.email = it },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text("Password", style = MaterialTheme.typography.labelMedium, color = Color.Gray)
        OutlinedTextField(
            value = viewModel.password,
            onValueChange = { viewModel.password = it },
            modifier = Modifier.fillMaxWidth(),
            visualTransformation = PasswordVisualTransformation(),
            shape = RoundedCornerShape(16.dp)
        )

        Spacer(modifier = Modifier.height(32.dp))

        if (viewModel.error != null) {
            Text(text = viewModel.error!!, color = MaterialTheme.colorScheme.error)
            Spacer(modifier = Modifier.height(16.dp))
        }

        Button(
            onClick = { viewModel.onRegisterClick() },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDFE104), contentColor = Color.Black),
            shape = RoundedCornerShape(16.dp),
            enabled = !viewModel.isLoading
        ) {
            if (viewModel.isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.Black)
            } else {
                Text("CREATE ACCOUNT", fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        
        TextButton(onClick = onBackToLogin, modifier = Modifier.align(Alignment.CenterHorizontally)) {
            Text("Already in? Login", color = Color.Gray)
        }
    }
}

@Composable
fun SuggestionChip(text: String, onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .padding(end = 8.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFFDFE104).copy(alpha = 0.1f),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFDFE104).copy(alpha = 0.4f))
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFFDFE104),
            fontWeight = FontWeight.Bold
        )
    }
}
