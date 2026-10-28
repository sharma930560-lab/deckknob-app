package com.deckknob.app.ui.main

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.deckknob.app.ui.camera.CameraScreen
import com.deckknob.app.ui.events.EventDetailsScreen
import com.deckknob.app.ui.events.EventsScreen
import com.deckknob.app.ui.feed.FeedScreen
import com.deckknob.app.ui.navigation.Screen
import com.deckknob.app.ui.navigation.bottomNavItems
import com.deckknob.app.ui.profile.ProfileScreen
import com.deckknob.app.ui.reels.ReelsScreen
import com.deckknob.app.ui.settings.SettingsScreen

@Composable
fun MainScreen(
    windowSizeClass: WindowSizeClass,
    onLogout: () -> Unit
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    NavigationSuiteScaffold(
        navigationSuiteItems = {
            bottomNavItems.forEach { screen ->
                item(
                    icon = { Icon(screen.icon, contentDescription = screen.title) },
                    label = { Text(screen.title) },
                    selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                    onClick = {
                        navController.navigate(screen.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) {
        NavHost(
            navController = navController,
            startDestination = Screen.Feed.route,
            modifier = Modifier.fillMaxSize()
        ) {
            composable(Screen.Feed.route) {
                FeedScreen(
                    onOpenCamera = { navController.navigate(Screen.Camera.route) },
                    onOpenUserProfile = { uid -> navController.navigate(Screen.UserProfile.createRoute(uid)) },
                    onOpenEventDetails = { eventId -> navController.navigate(Screen.EventDetails.createRoute(eventId)) },
                    onNavigateToEvents = { navController.navigate(Screen.Events.route) }
                )
            }
            composable(Screen.Reels.route) {
                ReelsScreen(
                    onOpenUserProfile = { uid -> navController.navigate(Screen.UserProfile.createRoute(uid)) }
                )
            }
            composable(Screen.Events.route) {
                EventsScreen(
                    onOpenEventDetails = { eventId -> navController.navigate(Screen.EventDetails.createRoute(eventId)) }
                )
            }
            composable(
                route = Screen.EventDetails.route,
                arguments = listOf(navArgument("eventId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = ""
                })
            ) { backStackEntry ->
                val eventId = backStackEntry.arguments?.getString("eventId").orEmpty()
                EventDetailsScreen(
                    eventId = eventId,
                    onBack = {
                        if (navController.previousBackStackEntry != null) {
                            navController.popBackStack()
                        }
                    },
                    onOpenUserProfile = { uid ->
                        navController.navigate(Screen.UserProfile.createRoute(uid))
                    }
                )
            }
            composable(Screen.Profile.route) {
                ProfileScreen(
                    onSettingsClick = { navController.navigate(Screen.Settings.route) }
                )
            }
            composable(Screen.Settings.route) {
                SettingsScreen(
                    onBack = { navController.popBackStack() },
                    onLogout = onLogout
                )
            }
            composable(Screen.Camera.route) {
                CameraScreen(
                    onClose = { navController.popBackStack() },
                    onMediaPublished = { navController.popBackStack() },
                    onNavigateToEvents = { navController.navigate(Screen.Events.route) }
                )
            }
            composable(
                route = Screen.UserProfile.route,
                arguments = listOf(navArgument("uid") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = ""
                })
            ) { backStackEntry ->
                val uid = backStackEntry.arguments?.getString("uid").orEmpty()
                ProfileScreen(
                    targetUid = uid.ifBlank { null },
                    onBack = {
                        if (navController.previousBackStackEntry != null) {
                            navController.popBackStack()
                        }
                    },
                    onSettingsClick = { navController.navigate(Screen.Settings.route) }
                )
            }
        }
    }
}
