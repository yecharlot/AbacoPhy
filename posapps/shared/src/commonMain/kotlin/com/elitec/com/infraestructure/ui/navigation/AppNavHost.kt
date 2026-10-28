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
import com.elitec.com.infraestructure.network.ServerConnectivityGuard
import com.elitec.com.infraestructure.network.ServerConnectivityState
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

/**
 * Arranque seguro:
 * 1. Splash de bootstrap: comprueba el servidor antes de crear/restaurar la sesión.
 * 2. Solo con health + identidad/API válidos se entra al flujo Login/Home.
 * 3. Si no conecta, el splash muestra diagnóstico y opciones para reintentar/cambiar URL.
 *
 * En sesión activa + backend caído (transporte): no se muestra el modal;
 * el rail «Sin conexión» + outbox mantienen la operatividad.
 */
@Composable
fun AppNavHost(
    modifier: Modifier = Modifier,
) {
    val connectivity: ServerConnectivityGuard = koinInject()
    // Se valida en cada arranque, aunque exista una URL guardada.
    var serverConfigured by remember { mutableStateOf(false) }
    var forceReconfigureUrl by remember { mutableStateOf(false) }

    val reachability by connectivity.state.collectAsStateWithLifecycle()

    if (!serverConfigured || forceReconfigureUrl) {
        InitialSetupScreen(
            splashMode = !forceReconfigureUrl,
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
        val sessionActive = session is SessionControl.Active

        /**
         * Modal bloqueante:
         * - Fuera de sesión (login): sí.
         * - En sesión: SOLO misconfig de URL (requiresBlockingUi).
         * - Corte de red/energía de horas en caja: NUNCA modal (chip + outbox).
         *   Contexto: PDV con respaldo eléctrico debe vender aunque el ISP/backend caigan.
         */
        val showBlockingDialog = unreachable != null && when {
            !sessionActive -> true
            unreachable.requiresBlockingUi -> true
            else -> false
        }

        if (showBlockingDialog && unreachable != null) {
            AlertDialog(
                onDismissRequest = { connectivity.dismiss() },
                title = {
                    Text("No se puede contactar el servidor")
                },
                text = {
                    Text(
                        buildString {
                            if (!sessionActive) {
                                append(
                                    "Compruebe que el backend está en marcha y que la URL es correcta.\n\n",
                                )
                            } else {
                                append(
                                    "Hay un problema de configuración con el servidor.\n\n",
                                )
                            }
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
                            if (!sessionActive || unreachable.suggestUpdateUrl) {
                                forceReconfigureUrl = true
                                serverConfigured = true
                            }
                        },
                    ) {
                        Text("Cambiar URL")
                    }
                },
            )
        }
    }
}
