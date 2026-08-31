package com.deckknob.app.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.deckknob.app.ui.auth.LoginViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onLogout: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel() // Using LoginViewModel for user context if needed
) {
    var showAccountSwitcher by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SETTINGS", fontWeight = FontWeight.Black) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Black)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
        ) {
            SectionHeader("Your Account")
            SettingsRow(Icons.Default.Lock, "Account Privacy", "Control who can see your content") {}
            SettingsRow(Icons.Default.Person, "Account Type", "Switch between DJ, Producer, Fan") {}
            SettingsRow(Icons.Default.Refresh, "Switch Account", "Add or swap between accounts") {
                showAccountSwitcher = true
            }

            SectionHeader("What You See")
            SettingsRow(Icons.Default.Notifications, "Notifications", "Manage app alerts") {}
            SettingsRow(Icons.Default.Favorite, "Like Counts", "Hide or show metrics") {}

            SectionHeader("Support")
            SettingsRow(Icons.Default.Info, "Help Center", "Guides and troubleshooting") {}
            SettingsRow(Icons.Default.Warning, "Report a Problem", "Alert our team to bugs") {}

            Spacer(modifier = Modifier.height(32.dp))

            TextButton(
                onClick = onLogout,
                modifier = Modifier.padding(horizontal = 8.dp)
            ) {
                Text("Log Out", color = Color.Red, fontWeight = FontWeight.Bold)
            }
            
            Spacer(modifier = Modifier.height(32.dp))
        }

        if (showAccountSwitcher) {
            AccountSwitcherDialog(onDismiss = { showAccountSwitcher = false })
        }
    }
}

@Composable
fun AccountSwitcherDialog(onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Switch Account", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Account selection logic goes here.")
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("CLOSE") }
        }
    )
}
