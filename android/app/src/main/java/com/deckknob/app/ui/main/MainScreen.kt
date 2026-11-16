package com.deckknob.app.ui.main

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteType
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.deckknob.app.ui.camera.CameraScreen
import com.deckknob.app.ui.chat.ChatConversationScreen
import com.deckknob.app.ui.chat.CreateGroupScreen
import com.deckknob.app.ui.chat.GroupChatScreen
import com.deckknob.app.ui.chat.GroupDetailsScreen
import com.deckknob.app.ui.chat.InboxScreen
import com.deckknob.app.ui.events.EventDetailsScreen
import com.deckknob.app.ui.events.EventsScreen
import com.deckknob.app.ui.feed.FeedScreen
import com.deckknob.app.ui.navigation.Screen
import com.deckknob.app.ui.navigation.bottomNavItems
import com.deckknob.app.ui.profile.ProfileScreen
import com.deckknob.app.ui.reels.ReelsScreen
import com.deckknob.app.ui.search.SearchScreen
import com.deckknob.app.ui.settings.SettingsScreen
import com.deckknob.app.ui.settings.UpdateCenterScreen

@Composable
fun MainScreen(
    windowSizeClass: WindowSizeClass,
    onLogout: () -> Unit
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    val bottomNavRoutes = remember {
        setOf(
            Screen.Feed.route,
            Screen.Reels.route,
            Screen.Events.route,
            Screen.Profile.route
        )
    }

    val currentRoute = currentDestination?.route
    val shouldShowBottomBar = currentRoute in bottomNavRoutes

    NavigationSuiteScaffold(
        layoutType = if (shouldShowBottomBar) {
            NavigationSuiteType.NavigationBar
        } else {
            NavigationSuiteType.None
        },
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
                    onNavigateToEvents = { navController.navigate(Screen.Events.route) },
                    onOpenMessages = { navController.navigate(Screen.Messages.route) },
                    onOpenSearch = { navController.navigate(Screen.Search.route) }
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
                    onSettingsClick = { navController.navigate(Screen.Settings.route) },
                    onOpenChat = { targetUid ->
                        navController.navigate(Screen.Chat.createRoute(targetUid))
                    },
                    onOpenUserProfile = { uid ->
                        navController.navigate(Screen.UserProfile.createRoute(uid))
                    }
                )
            }

            composable(
                route = Screen.Chat.route,
                arguments = listOf(navArgument("targetUid") {
                    type = NavType.StringType
                    nullable = false
                    defaultValue = ""
                })
            ) { backStackEntry ->
                val targetUid = backStackEntry.arguments?.getString("targetUid").orEmpty()
                ChatConversationScreen(
                    targetUid = targetUid,
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

            composable(Screen.Messages.route) {
                InboxScreen(
                    onBack = { navController.popBackStack() },
                    onOpenChat = { targetUid ->
                        navController.navigate(Screen.Chat.createRoute(targetUid))
                    },
                    onOpenGroupChat = { groupId ->
                        navController.navigate(Screen.GroupChat.createRoute(groupId))
                    },
                    onOpenCreateGroup = {
                        navController.navigate(Screen.CreateGroup.route)
                    },
                    onOpenSearch = {
                        navController.navigate(Screen.Search.route)
                    }
                )
            }

            composable(Screen.CreateGroup.route) {
                CreateGroupScreen(
                    onBack = { navController.popBackStack() },
                    onGroupCreated = { newGroupId ->
                        navController.navigate(Screen.GroupChat.createRoute(newGroupId)) {
                            popUpTo(Screen.Messages.route)
                        }
                    }
                )
            }

            composable(
                route = Screen.GroupChat.route,
                arguments = listOf(navArgument("groupId") {
                    type = NavType.StringType
                    nullable = false
                    defaultValue = ""
                })
            ) { backStackEntry ->
                val groupId = backStackEntry.arguments?.getString("groupId").orEmpty()
                GroupChatScreen(
                    groupId = groupId,
                    onBack = {
                        if (navController.previousBackStackEntry != null) {
                            navController.popBackStack()
                        }
                    },
                    onOpenGroupDetails = { gId ->
                        navController.navigate(Screen.GroupDetails.createRoute(gId))
                    },
                    onOpenUserProfile = { uid ->
                        navController.navigate(Screen.UserProfile.createRoute(uid))
                    }
                )
            }

            composable(
                route = Screen.GroupDetails.route,
                arguments = listOf(navArgument("groupId") {
                    type = NavType.StringType
                    nullable = false
                    defaultValue = ""
                })
            ) { backStackEntry ->
                val groupId = backStackEntry.arguments?.getString("groupId").orEmpty()
                GroupDetailsScreen(
                    groupId = groupId,
                    onBack = {
                        if (navController.previousBackStackEntry != null) {
                            navController.popBackStack()
                        }
                    },
                    onGroupExited = {
                        navController.popBackStack(Screen.Messages.route, inclusive = false)
                    },
                    onOpenUserProfile = { uid ->
                        navController.navigate(Screen.UserProfile.createRoute(uid))
                    }
                )
            }

            composable(Screen.Settings.route) {
                SettingsScreen(
                    onBack = { navController.popBackStack() },
                    onLogout = onLogout,
                    onNavigateToUpdates = { navController.navigate(Screen.UpdateCenter.route) }
                )
            }

            composable(Screen.UpdateCenter.route) {
                UpdateCenterScreen(
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Search.route) {
                SearchScreen(
                    onBack = { navController.popBackStack() },
                    onOpenUserProfile = { uid -> navController.navigate(Screen.UserProfile.createRoute(uid)) }
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
                    onSettingsClick = { navController.navigate(Screen.Settings.route) },
                    onOpenChat = { targetUid ->
                        navController.navigate(Screen.Chat.createRoute(targetUid))
                    },
                    onOpenUserProfile = { targetUid ->
                        navController.navigate(Screen.UserProfile.createRoute(targetUid))
                    }
                )
            }
        }
    }
}
