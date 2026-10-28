package com.elitec.com.feature.settings.ui.screens

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.settings.ui.viewmodel.InitialSetupViewModel
import com.elitec.com.feature.settings.ui.viewmodel.SetupConnectionPhase
import com.elitec.com.infraestructure.ui.theme.AbacoColors
import org.jetbrains.compose.resources.painterResource
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun InitialSetupScreen(
    onConfigured: () -> Unit,
    splashMode: Boolean = false,
    viewModel: InitialSetupViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showManualUrl by remember { mutableStateOf(false) }
    val busy = state.testing || state.discovering
    val failed = state.phase == SetupConnectionPhase.FAILED

    val statusContainer = when (state.phase) {
        SetupConnectionPhase.READY -> MaterialTheme.colorScheme.primaryContainer
        SetupConnectionPhase.FAILED -> MaterialTheme.colorScheme.errorContainer
        SetupConnectionPhase.SEARCHING,
        SetupConnectionPhase.SERVER_FOUND,
        SetupConnectionPhase.CONNECTING -> MaterialTheme.colorScheme.secondaryContainer
        SetupConnectionPhase.IDLE -> MaterialTheme.colorScheme.surfaceVariant
    }
    val statusForeground = when (state.phase) {
        SetupConnectionPhase.FAILED -> MaterialTheme.colorScheme.onErrorContainer
        SetupConnectionPhase.READY -> MaterialTheme.colorScheme.onPrimaryContainer
        SetupConnectionPhase.SEARCHING,
        SetupConnectionPhase.SERVER_FOUND,
        SetupConnectionPhase.CONNECTING -> MaterialTheme.colorScheme.onSecondaryContainer
        SetupConnectionPhase.IDLE -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    val statusSymbol = when (state.phase) {
        SetupConnectionPhase.SEARCHING -> "⌕"
        SetupConnectionPhase.SERVER_FOUND -> "⌖"
        SetupConnectionPhase.CONNECTING -> "↔"
        SetupConnectionPhase.READY -> "✓"
        SetupConnectionPhase.FAILED -> "!"
        SetupConnectionPhase.IDLE -> "●"
    }
    val inProgress = state.phase == SetupConnectionPhase.SEARCHING ||
        state.phase == SetupConnectionPhase.SERVER_FOUND ||
        state.phase == SetupConnectionPhase.CONNECTING

    // La comprobación ocurre antes de crear la sesión y mostrar Login.
    LaunchedEffect(Unit) {
        if (splashMode) viewModel.connectUsingCacheOrDiscover(onConfigured)
        else viewModel.connectUsingCacheOrDiscover(onConfigured)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        AbacoColors.Cyan.copy(alpha = if (splashMode) 0.12f else 0.05f),
                        MaterialTheme.colorScheme.background,
                    ),
                ),
            )
            .padding(if (splashMode) 24.dp else 24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (splashMode) {
            Image(
                painter = painterResource(Res.drawable.abacus_color_icon),
                contentDescription = "Logotipo de Ábaco POS",
                modifier = Modifier.size(94.dp),
                contentScale = ContentScale.Fit,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                "Ábaco POS",
                style = MaterialTheme.typography.headlineMedium,
                color = AbacoColors.Cyan,
                fontWeight = FontWeight.Bold,
            )
            Text(
                "Preparando el punto de venta",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp, bottom = 22.dp),
            )
        } else {
            Text("Conectar con AbacoPhy", style = MaterialTheme.typography.headlineSmall)
            Text(
                "Recuperaremos el último servidor conocido y solo buscaremos en la red si es necesario.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
            )
        }

        Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp),
            colors = CardDefaults.cardColors(containerColor = statusContainer),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = statusSymbol,
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = statusForeground,
                        modifier = Modifier.padding(end = 14.dp),
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            state.statusTitle,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = statusForeground,
                        )
                        Text(
                            state.statusDetail,
                            style = MaterialTheme.typography.bodyMedium,
                            color = statusForeground,
                            modifier = Modifier.padding(top = 5.dp),
                        )
                    }
                }
                if (inProgress) {
                    LinearProgressIndicator(
                        modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                    )
                }
            }
        }

        if (splashMode && !failed && state.phase != SetupConnectionPhase.READY) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                BootstrapStep(
                    icon = "①",
                    title = "Recuperar servidor",
                    detail = "Primero probamos la última dirección guardada.",
                    active = state.statusTitle.contains("último", ignoreCase = true) ||
                        state.statusTitle.contains("servidor", ignoreCase = true),
                )
                BootstrapStep(
                    icon = "②",
                    title = "Verificar disponibilidad",
                    detail = "Comprobamos /health y la compatibilidad de la API.",
                    active = state.phase == SetupConnectionPhase.CONNECTING,
                )
                BootstrapStep(
                    icon = "③",
                    title = "Buscar en la red",
                    detail = "Si no responde, localizamos otra instancia automáticamente.",
                    active = state.phase == SetupConnectionPhase.SEARCHING,
                )
            }
            Spacer(Modifier.height(16.dp))
            Text(
                "No cierres la aplicación. Esto suele tardar unos segundos; si el servidor no está disponible, te mostraremos cómo continuar.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        // En modo splash los controles solo aparecen cuando hace falta intervención.
        if (!splashMode || failed) {
            Button(
                onClick = { viewModel.connectUsingCacheOrDiscover(onConfigured) },
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (busy) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp).padding(end = 4.dp),
                        strokeWidth = 2.dp,
                    )
                }
                Text(if (busy) "Comprobando conexión…" else "Reintentar conexión automática")
            }

            if (state.discoveredServers.isNotEmpty()) {
                Text(
                    "Servidores encontrados",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 18.dp, bottom = 8.dp),
                )
                state.discoveredServers.forEach { server ->
                    Button(
                        onClick = { viewModel.selectServer(server, onConfigured) },
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
                    ) {
                        Text("▣  ${server.name} · ${server.host}:${server.port}")
                    }
                }
            }

            state.error?.let {
                Text(
                    it,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 12.dp).fillMaxWidth(),
                )
            }

            TextButton(
                onClick = { showManualUrl = !showManualUrl },
                modifier = Modifier.padding(top = 12.dp),
            ) {
                Text(if (showManualUrl) "Ocultar configuración manual" else "⚙  Cambiar o introducir URL")
            }

            if (showManualUrl) {
                Text(
                    "Úsalo si cambió la IP/puerto o la red bloquea el descubrimiento automático.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
                OutlinedTextField(
                    value = state.urlInput,
                    onValueChange = viewModel::onUrlChange,
                    label = { Text("URL base de la API") },
                    placeholder = { Text("http://192.168.x.x:8090/api/v1") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !busy,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Uri,
                        imeAction = ImeAction.Done,
                    ),
                )
                Button(
                    onClick = { viewModel.testAndSave(onConfigured) },
                    enabled = !busy && state.urlInput.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                ) {
                    Text(if (state.testing) "Conectando…" else "Probar URL y conectar")
                }
            }
        }
    }
}

@Composable
private fun BootstrapStep(
    icon: String,
    title: String,
    detail: String,
    active: Boolean,
) {
    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text = if (active) "●" else icon,
            color = if (active) AbacoColors.Cyan else MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
        )
        Column {
            Text(
                title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
            )
            Text(
                detail,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
