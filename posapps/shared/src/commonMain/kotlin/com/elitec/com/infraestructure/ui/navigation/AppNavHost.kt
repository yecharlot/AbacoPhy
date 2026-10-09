package com.elitec.com.infraestructure.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.identity.domain.entities.SessionControl
import com.elitec.com.feature.identity.ui.screens.LoginScreen
import com.elitec.com.feature.identity.ui.screens.SplashScreen
import com.elitec.com.feature.identity.ui.viewmodel.HomeSessionViewModel
import com.elitec.com.feature.identity.ui.viewmodel.SessionViewModel
import com.elitec.com.feature.settings.ui.screens.InitialSetupScreen
import com.elitec.com.infraestructure.network.ApiConfig
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

/**
 * Flujo:
 * 1. Sin URL persistida → InitialSetupScreen
 * 2. Con URL → sesión: Reading→Splash · NoSession→Login · Active→Home
 */
@Composable
fun AppNavHost(
    modifier: Modifier = Modifier,
) {
    val apiConfig: ApiConfig = koinInject()
    var serverConfigured by remember { mutableStateOf(apiConfig.hasBaseUrl()) }

    if (!serverConfigured) {
        InitialSetupScreen(
            onConfigured = { serverConfigured = true },
        )
        return
    }

    val sessionVm: SessionViewModel = koinViewModel()
    val logoutViewModel: HomeSessionViewModel = koinViewModel()
    val session by sessionVm.sessionState.collectAsStateWithLifecycle()

    Box(modifier = modifier) {
        when (session) {
            is SessionControl.Reading -> SplashScreen()
            is SessionControl.NoSession -> LoginScreen()
            is SessionControl.Active -> HomeNavHost(
                sessionState = (session as SessionControl.Active).session,
                onLogout = { logoutViewModel.logout() },
            )
        }
    }
}
