package com.elitec.com.infraestructure.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import com.elitec.com.infraestructure.network.ServerConnectivityGuard
import com.elitec.com.infraestructure.network.ServerConnectivityState
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

/**
 * 1. Sin URL → InitialSetup (solo guarda tras health OK)
 * 2. Con URL → Splash / Login / Home
 * 3. Health o API mal configurada → diálogo Reintentar / Cambiar URL
 */
@Composable
fun AppNavHost(
    modifier: Modifier = Modifier,
) {
    val apiConfig: ApiConfig = koinInject()
    val connectivity: ServerConnectivityGuard = koinInject()
    var serverConfigured by remember { mutableStateOf(apiConfig.hasBaseUrl()) }
    var forceReconfigureUrl by remember { mutableStateOf(false) }

    val reachability by connectivity.state.collectAsStateWithLifecycle()

    if (!serverConfigured || forceReconfigureUrl) {
        InitialSetupScreen(
            onConfigured = {
                forceReconfigureUrl = false
                serverConfigured = true
                connectivity.markOk()
            },
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

        val unreachable = reachability as? ServerConnectivityState.Unreachable
        if (unreachable != null) {
            AlertDialog(
                onDismissRequest = { connectivity.dismiss() },
                title = { Text("No se puede contactar el servidor") },
                text = {
                    Text(
                        buildString {
                            append("Compruebe que el backend está en marcha y que la URL es correcta.\n\n")
                            append("URL actual:\n${unreachable.baseUrl}\n\n")
                            append(unreachable.reason)
                            if (unreachable.suggestUpdateUrl) {
                                append(
                                    "\n\nSi cambió de red, puerto o la URL no incluye /api/v1, " +
                                        "use «Cambiar URL».",
                                )
                            }
                        },
                    )
                },
                confirmButton = {
                    TextButton(onClick = { connectivity.recheck() }) {
                        Text("Reintentar")
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = {
                            connectivity.dismiss()
                            forceReconfigureUrl = true
                        },
                    ) {
                        Text("Cambiar URL")
                    }
                },
            )
        }
    }
}
