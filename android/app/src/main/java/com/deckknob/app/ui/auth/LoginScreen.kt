package com.deckknob.app.ui.auth

import android.app.Activity
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.deckknob.app.R
import com.deckknob.app.ui.components.DeckKnobLogo
import com.deckknob.app.ui.components.LogoVariant
import com.deckknob.app.ui.theme.DeckKnobBlack
import com.deckknob.app.ui.theme.DeckKnobDarkCard
import com.deckknob.app.ui.theme.DeckKnobDarkCardBorder
import com.deckknob.app.ui.theme.DeckKnobYellow
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.auth.api.signin.GoogleSignInStatusCodes
import com.google.android.gms.common.api.ApiException

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onRegisterClick: () -> Unit = {},
    viewModel: LoginViewModel = hiltViewModel()
) {
    val context = LocalContext.current

    val googleSignInLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        Log.d("DeckKnobAuthDiag", "Stage 2: Google activity result received. ResultCode: ${result.resultCode}, hasData: ${result.data != null}")
        if (result.data == null) {
            Log.d("DeckKnobAuthDiag", "Stage 2: Activity result data is null (cancelled without intent)")
            return@rememberLauncherForActivityResult
        }
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            val idToken = account.idToken
            val hasToken = !idToken.isNullOrBlank()
            Log.d("DeckKnobAuthDiag", "Stage 3: Google ID token retrieval completed. Token present: $hasToken")
            if (hasToken) {
                viewModel.onGoogleSignInSuccess(idToken!!)
            } else {
                Log.e("DeckKnobAuthDiag", "Stage 3: Token is null or blank")
                viewModel.onGoogleSignInError("Google account selected, but no ID token was returned.")
            }
        } catch (e: ApiException) {
            Log.e("DeckKnobAuthDiag", "Stage 11: Caught ApiException: statusCode=${e.statusCode}, message=${e.message}")
            when (e.statusCode) {
                GoogleSignInStatusCodes.SIGN_IN_CANCELLED -> {
                    Log.d("DeckKnobAuthDiag", "Google Sign-In cancelled by user")
                }
                GoogleSignInStatusCodes.NETWORK_ERROR -> {
                    viewModel.onGoogleSignInError("Network error connecting to Google. Please check your internet connection.")
                }
                10, 12500 -> {
                    val certType = if (com.deckknob.app.BuildConfig.DEBUG) "debug" else "production release"
                    viewModel.onGoogleSignInError("Google Sign-In configuration required: Add $certType SHA-1 to Firebase Console (Code ${e.statusCode})")
                }
                else -> {
                    viewModel.onGoogleSignInError("Google Sign-In failed (Code ${e.statusCode}): ${e.localizedMessage ?: "Authentication error"}")
                }
            }
        } catch (e: Exception) {
            Log.e("DeckKnobAuthDiag", "Stage 11: Caught exception: ${e::class.java.simpleName}, message=${e.message}")
            viewModel.onGoogleSignInError(e.localizedMessage ?: "Google sign-in failed")
        }
    }

    LaunchedEffect(viewModel.loginSuccess) {
        if (viewModel.loginSuccess) {
            onLoginSuccess()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DeckKnobBlack)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            DeckKnobLogo(variant = LogoVariant.Primary)
            
            Spacer(modifier = Modifier.height(32.dp))
            
            OutlinedTextField(
                value = viewModel.usernameOrEmail,
                onValueChange = { viewModel.usernameOrEmail = it },
                label = { Text("Username or Email") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = DeckKnobYellow,
                    unfocusedBorderColor = Color.Gray.copy(alpha = 0.4f)
                ),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            OutlinedTextField(
                value = viewModel.password,
                onValueChange = { viewModel.password = it },
                label = { Text("Password") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = DeckKnobYellow,
                    unfocusedBorderColor = Color.Gray.copy(alpha = 0.4f)
                ),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(20.dp))
            
            if (viewModel.error != null) {
                Text(
                    text = viewModel.error!!,
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
            }
            
            Button(
                onClick = { viewModel.onLoginClick() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = DeckKnobYellow,
                    contentColor = DeckKnobBlack
                ),
                shape = RoundedCornerShape(16.dp),
                enabled = !viewModel.isLoading && !viewModel.isGoogleLoading
            ) {
                if (viewModel.isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = DeckKnobBlack)
                } else {
                    Text("LOG IN", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Responsive Divider: "OR"
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                HorizontalDivider(
                    modifier = Modifier.weight(1f),
                    color = Color.White.copy(alpha = 0.12f),
                    thickness = 1.dp
                )
                Text(
                    text = "OR",
                    modifier = Modifier.padding(horizontal = 12.dp),
                    color = Color.Gray,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                HorizontalDivider(
                    modifier = Modifier.weight(1f),
                    color = Color.White.copy(alpha = 0.12f),
                    thickness = 1.dp
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Dedicated "Continue with Google" button
            OutlinedButton(
                onClick = {
                    val defaultClientIdRes = context.resources.getIdentifier(
                        "default_web_client_id",
                        "string",
                        context.packageName
                    )
                    val webClientId = if (defaultClientIdRes != 0) {
                        context.getString(defaultClientIdRes)
                    } else {
                        null
                    }

                    val isPlaceholder = webClientId.isNullOrBlank() ||
                        webClientId.contains("placeholder", ignoreCase = true) ||
                        webClientId == "408445559473-web.apps.googleusercontent.com"

                    Log.d("DeckKnobAuthDiag", "Stage 1: Google sign-in button tapped. WebClientId present: ${!webClientId.isNullOrBlank()}, isPlaceholder: $isPlaceholder")

                    if (webClientId.isNullOrBlank() || isPlaceholder) {
                        val certType = if (com.deckknob.app.BuildConfig.DEBUG) "debug" else "production release"
                        viewModel.onGoogleSignInError("Google Sign-In configuration required: Register com.deckknob.app with $certType SHA-1 in Firebase Console and download updated google-services.json (Code 10)")
                        return@OutlinedButton
                    }

                    try {
                        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                            .requestIdToken(webClientId)
                            .requestEmail()
                            .build()
                        val client = GoogleSignIn.getClient(context, gso)
                        client.signOut().addOnCompleteListener {
                            googleSignInLauncher.launch(client.signInIntent)
                        }
                    } catch (e: Exception) {
                        Log.e("DeckKnobAuthDiag", "Stage 11: Error building GoogleSignInOptions: ${e.message}")
                        viewModel.onGoogleSignInError("Failed to initialize Google Sign-In: ${e.localizedMessage}")
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = DeckKnobDarkCard,
                    contentColor = Color.White
                ),
                border = BorderStroke(1.dp, DeckKnobDarkCardBorder),
                enabled = !viewModel.isLoading && !viewModel.isGoogleLoading
            ) {
                if (viewModel.isGoogleLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = DeckKnobYellow,
                        strokeWidth = 2.dp
                    )
                } else {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            painter = painterResource(id = R.drawable.ic_google),
                            contentDescription = "Google Logo",
                            modifier = Modifier.size(20.dp),
                            tint = Color.Unspecified
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Continue with Google",
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            TextButton(
                onClick = onRegisterClick,
                enabled = !viewModel.isLoading && !viewModel.isGoogleLoading
            ) {
                Text(
                    text = "Don't have an account? Join us",
                    color = Color.Gray,
                    fontSize = 14.sp
                )
            }
        }
    }
}
