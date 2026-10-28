package com.deckknob.app.ui.navigation

import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.deckknob.app.ui.auth.LoginScreen
import com.deckknob.app.ui.auth.RegisterScreen
import com.deckknob.app.ui.main.MainScreen
import com.deckknob.app.ui.onboarding.OnboardingScreen

@Composable
fun AppNavigation(
    windowSizeClass: WindowSizeClass,
    viewModel: NavigationViewModel = hiltViewModel()
) {
    val navController = rememberNavController()
    val authState by viewModel.authState.collectAsState()

    var wasAuthenticated by remember { mutableStateOf<Boolean?>(null) }

    LaunchedEffect(authState.isAuthenticated) {
        val isAuth = authState.isAuthenticated
        android.util.Log.d("DeckKnobAuthDiag", "Stage 10: Navigation effect evaluated: isAuth=$isAuth, wasAuth=$wasAuthenticated")

        if (wasAuthenticated == true && !isAuth) {
            // Explicit transition from authenticated to unauthenticated (logout)
            android.util.Log.d("DeckKnobAuthDiag", "Stage 10: User logged out -> navigating to login")
            navController.navigate("login") {
                popUpTo(0) { inclusive = true }
            }
        } else if (wasAuthenticated == false && isAuth) {
            // Explicit transition from unauthenticated to authenticated (login success)
            android.util.Log.d("DeckKnobAuthDiag", "Stage 10: User logged in -> navigating to main")
            navController.navigate("main") {
                popUpTo("login") { inclusive = true }
            }
        }
        wasAuthenticated = isAuth
    }

    val startDestination = if (authState.isAuthenticated) "main" else "login"

    NavHost(navController = navController, startDestination = startDestination) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    android.util.Log.d("DeckKnobAuthDiag", "Stage 10: Navigation destination selected from onLoginSuccess: navigating to main")
                    navController.navigate("main") {
                        popUpTo("login") { inclusive = true }
                    }
                },
                onRegisterClick = {
                    navController.navigate("register")
                }
            )
        }
        composable("register") {
            RegisterScreen(
                onRegisterSuccess = {
                    navController.navigate("onboarding") {
                        popUpTo("register") { inclusive = true }
                    }
                },
                onBackToLogin = { navController.popBackStack() }
            )
        }
        composable("onboarding") {
            OnboardingScreen(
                onFinished = {
                    navController.navigate("main") {
                        popUpTo("onboarding") { inclusive = true }
                    }
                }
            )
        }
        composable("main") {
            MainScreen(
                windowSizeClass = windowSizeClass,
                onLogout = {
                    viewModel.logout()
                }
            )
        }
    }
}
