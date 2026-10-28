package com.elitec.com.feature.settings.ui.screens

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
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
        SetupConnectionPhase.IDLE -> "•"
    }
    val inProgress = state.phase == SetupConnectionPhase.SEARCHING ||
        state.phase == SetupConnectionPhase.SERVER_FOUND ||
        state.phase == SetupConnectionPhase.CONNECTING

    LaunchedEffect(splashMode) {
        if (splashMode) {
            viewModel.connectUsingCacheOrDiscover(onConfigured)
        } else {
            showManualUrl = true
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        AbacoColors.Cyan.copy(alpha = if (splashMode) 0.10f else 0.04f),
                        MaterialTheme.colorScheme.background,
                        MaterialTheme.colorScheme.background,
                    ),
                ),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 560.dp)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            if (splashMode) {
                Surface(
                    modifier = Modifier.size(92.dp),
                    shape = RoundedCornerShape(28.dp),
                    color = MaterialTheme.colorScheme.surface,
                    tonalElevation = 4.dp,
                    shadowElevation = 3.dp,
                ) {
                    Image(
                        painter = painterResource(Res.drawable.abacus_color_icon),
                        contentDescription = "Logotipo de Ábaco POS",
                        modifier = Modifier.padding(14.dp),
                        contentScale = ContentScale.Fit,
                    )
                }
                Spacer(Modifier.height(18.dp))
                Text(
                    "Ábaco POS",
                    style = MaterialTheme.typography.headlineMedium,
                    color = AbacoColors.Cyan,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "Preparando tu punto de venta",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 6.dp, bottom = 24.dp),
                )
            } else {
                Text(
                    "Conectar con AbacoPhy",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "Configura el servidor de tu red. Validaremos la conexión antes de continuar.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp, bottom = 20.dp),
                )
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = statusContainer),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = statusForeground.copy(alpha = 0.10f),
                            modifier = Modifier.size(48.dp),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                if (inProgress) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(24.dp),
                                        strokeWidth = 2.5.dp,
                                        color = statusForeground,
                                    )
                                } else {
                                    Text(
                                        statusSymbol,
                                        style = MaterialTheme.typography.headlineSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = statusForeground,
                                    )
                                }
                            }
                        }
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
                                color = statusForeground.copy(alpha = 0.90f),
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                    }
                    if (inProgress) {
                        LinearProgressIndicator(
                            modifier = Modifier.fillMaxWidth(),
                            color = statusForeground,
                            trackColor = statusForeground.copy(alpha = 0.12f),
                        )
                    }
                    state.successMessage?.let { message ->
                        Text(
                            message,
                            style = MaterialTheme.typography.labelMedium,
                            color = statusForeground,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }

            if (splashMode && !failed && state.phase != SetupConnectionPhase.READY) {
                Spacer(Modifier.height(20.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.88f),
                    ),
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(18.dp),
                    ) {
                        Text(
                            "QUÉ ESTAMOS HACIENDO",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Bold,
                        )
                        BootstrapStep(
                            number = "1",
                            title = "Recuperar servidor",
                            detail = "Probamos la última dirección guardada.",
                            active = state.phase == SetupConnectionPhase.CONNECTING &&
                                state.statusTitle.contains("servidor", ignoreCase = true),
                            complete = state.phase == SetupConnectionPhase.SEARCHING ||
                                state.phase == SetupConnectionPhase.SERVER_FOUND ||
                                state.phase == SetupConnectionPhase.READY,
                        )
                        BootstrapStep(
                            number = "2",
                            title = "Verificar conexión",
                            detail = "Comprobamos disponibilidad e identidad de la API.",
                            active = state.phase == SetupConnectionPhase.CONNECTING &&
                                (state.statusTitle.contains("health", ignoreCase = true) ||
                                    state.statusTitle.contains("disponible", ignoreCase = true) ||
                                    state.statusTitle.contains("encontrado", ignoreCase = true)),
                            complete = state.phase == SetupConnectionPhase.READY,
                        )
                        BootstrapStep(
                            number = "3",
                            title = "Buscar en la red local",
                            detail = "Si el servidor guardado no responde, buscamos otra instancia.",
                            active = state.phase == SetupConnectionPhase.SEARCHING,
                            complete = false,
                        )
                    }
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    "Puedes dejar esta pantalla abierta. Si no logramos conectar, te ofreceremos otras opciones.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            if (!splashMode || failed || state.discoveredServers.isNotEmpty()) {
                Spacer(Modifier.height(18.dp))
                Button(
                    onClick = { viewModel.connectUsingCacheOrDiscover(onConfigured) },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    if (busy) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                        )
                        Spacer(Modifier.size(10.dp))
                    }
                    Text(
                        if (busy) "Comprobando conexión…" else "Reintentar conexión automática",
                        fontWeight = FontWeight.SemiBold,
                    )
                }

                if (state.discoveredServers.isNotEmpty()) {
                    Spacer(Modifier.height(20.dp))
                    Text(
                        "Servidores disponibles",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                    )
                    state.discoveredServers.forEach { server ->
                        OutlinedButton(
                            onClick = { viewModel.selectServer(server, onConfigured) },
                            enabled = !busy,
                            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                            shape = RoundedCornerShape(14.dp),
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                horizontalAlignment = Alignment.Start,
                            ) {
                                Text(server.name, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "${server.host}:${server.port}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }

                state.error?.let { message ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.Top,
                        ) {
                            Text(
                                "!",
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                message,
                                modifier = Modifier.weight(1f),
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                }

                TextButton(
                    onClick = { showManualUrl = !showManualUrl },
                    modifier = Modifier.padding(top = 8.dp),
                ) {
                    Text(
                        if (showManualUrl) "Ocultar configuración manual"
                        else "Introducir dirección manualmente",
                    )
                }

                if (showManualUrl) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface,
                        ),
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Text(
                                "Dirección del servidor",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                "Úsalo si conoces la IP del equipo donde se ejecuta AbacoPhy o si el descubrimiento automático está bloqueado.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            OutlinedTextField(
                                value = state.urlInput,
                                onValueChange = viewModel::onUrlChange,
                                label = { Text("URL base de la API") },
                                placeholder = { Text("http://192.168.1.10:8090/api/v1") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !busy,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Uri,
                                    imeAction = ImeAction.Done,
                                ),
                                shape = RoundedCornerShape(14.dp),
                            )
                            Button(
                                onClick = { viewModel.testAndSave(onConfigured) },
                                enabled = !busy && state.urlInput.isNotBlank(),
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                shape = RoundedCornerShape(14.dp),
                            ) {
                                Text(
                                    if (state.testing) "Validando dirección…" else "Validar y conectar",
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BootstrapStep(
    number: String,
    title: String,
    detail: String,
    active: Boolean,
    complete: Boolean,
) {
    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Surface(
            shape = CircleShape,
            color = when {
                complete -> MaterialTheme.colorScheme.primary
                active -> AbacoColors.Cyan.copy(alpha = 0.16f)
                else -> MaterialTheme.colorScheme.surfaceVariant
            },
            modifier = Modifier.size(30.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    if (complete) "✓" else number,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = when {
                        complete -> MaterialTheme.colorScheme.onPrimary
                        active -> AbacoColors.Cyan
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (active || complete) FontWeight.SemiBold else FontWeight.Medium,
            )
            Text(
                detail,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
