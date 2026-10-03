package com.elitec.com.infraestructure.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.identity.domain.entities.SessionControl
import com.elitec.com.feature.identity.ui.screens.LoginScreen
import com.elitec.com.feature.identity.ui.screens.SplashScreen
import com.elitec.com.feature.identity.ui.viewmodel.SessionViewModel
import com.elitec.com.feature.pos.ui.screens.HomeScreen
import org.koin.compose.viewmodel.koinViewModel

/**
 * Navegación reactiva a [SessionControl]:
 * Reading  → Splash
 * NoSession → Login
 * Active    → Home
 *
 * Sin callbacks onGoHome / onLoginSuccess / onLoggedOut.
 */
@Composable
fun AppNavHost(
    sessionVm: SessionViewModel = koinViewModel(),
) {
    val session by sessionVm.sessionState.collectAsStateWithLifecycle()

    when (session) {
        is SessionControl.Reading -> SplashScreen()
        is SessionControl.NoSession -> LoginScreen()
        is SessionControl.Active -> HomeScreen()
    }
}
