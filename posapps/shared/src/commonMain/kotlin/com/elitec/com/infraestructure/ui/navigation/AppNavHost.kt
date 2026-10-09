package com.elitec.com.infraestructure.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.identity.domain.entities.SessionControl
import com.elitec.com.feature.identity.ui.screens.LoginScreen
import com.elitec.com.feature.identity.ui.screens.SplashScreen
import com.elitec.com.feature.identity.ui.viewmodel.HomeSessionViewModel
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
    modifier: Modifier = Modifier,
    sessionVm: SessionViewModel = koinViewModel(),
) {
    val logoutViewModel: HomeSessionViewModel = koinViewModel()

    val session by sessionVm.sessionState.collectAsStateWithLifecycle()


    Box(
        modifier = modifier
    ) {
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
