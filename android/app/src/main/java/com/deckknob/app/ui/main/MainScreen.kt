package com.deckknob.app.ui.main

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.*
import com.deckknob.app.Greeting
import com.deckknob.app.ui.navigation.Screen
import com.deckknob.app.ui.navigation.bottomNavItems
import com.deckknob.app.ui.settings.SettingsScreen

@Composable
fun MainScreen(onLogout: () -> Unit) {
    val navController = rememberNavController()

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = Color.Black) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                
                bottomNavItems.forEach { screen ->
                    val selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true
                    NavigationBarItem(
                        icon = { Icon(screen.icon, contentDescription = screen.title) },
                        label = { Text(screen.title) },
                        selected = selected,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.startDestinationId) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Color(0xFFDFE104),
                            selectedTextColor = Color(0xFFDFE104),
                            indicatorColor = Color.Transparent,
                            unselectedIconColor = Color.Gray,
                            unselectedTextColor = Color.Gray
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(navController, startDestination = Screen.Feed.route, modifier = Modifier.padding(innerPadding)) {
            composable(Screen.Feed.route) { Greeting("Feed") }
            composable(Screen.Explore.route) { Greeting("Explore") }
            composable(Screen.Events.route) { Greeting("Events") }
            composable(Screen.Profile.route) { 
                ProfileScreen(onSettingsClick = { navController.navigate(Screen.Settings.route) }) 
            }
            composable(Screen.Settings.route) { 
                SettingsScreen(onBack = { navController.popBackStack() }, onLogout = onLogout) 
            }
        }
    }
}

@Composable
fun ProfileScreen(onSettingsClick: () -> Unit) {
    Surface {
        Column {
            Text("Profile Screen")
            Button(onClick = onSettingsClick) {
                Text("Go to Settings")
            }
        }
    }
}
