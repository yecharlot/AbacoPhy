package com.elitec.abaco_launcher.feature.orchestrator.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.foundation.BorderStroke
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.LogLevel
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.LogLine
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.OrchestratorState
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.TaskStep
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.TaskStepStatus
import kotlinx.coroutines.launch
import java.time.LocalTime
import java.time.format.DateTimeFormatter

// ── Paleta Catppuccin Macchiato ──────────────────────────────────────────────
private val BgBase       = Color(0xFF1E2030)   // base oscura
private val BgMantle     = Color(0xFF181926)   // más oscura: paneles
private val BgCrust      = Color(0xFF13141F)   // consola
private val BgSurface0   = Color(0xFF1E2030)
private val BgSurface1   = Color(0xFF252638)
private val BgSurface2   = Color(0xFF2E2F45)   // hover / separadores
private val BorderColor  = Color(0xFF363850)
private val TextMain     = Color(0xFFCDD6F4)   // texto principal
private val TextSubtle   = Color(0xFF7F849C)   // texto secundario
private val Accent       = Color(0xFF89B4FA)   // azul
private val AccentGreen  = Color(0xFFA6E3A1)   // verde
private val AccentYellow = Color(0xFFF9E2AF)   // amarillo
private val AccentRed    = Color(0xFFF38BA8)   // rojo
private val AccentPurple = Color(0xFFCBA6F7)   // morado

private val timeFmt: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss")
private fun nowTs() = LocalTime.now().format(timeFmt)

/** Parsea una línea raw "[HH:mm:ss][LEVEL] texto" → LogLine. */
private fun parseLogLine(raw: String): LogLine {
    val levelRegex = Regex("""\[(\d{2}:\d{2}:\d{2})]\[(INFO|WARN|ERROR|DEBUG)](.*)""")
    val match = levelRegex.matchEntire(raw.trim())
    return if (match != null) {
        val (ts, lvl, msg) = match.destructured
        LogLine(
            timestamp = ts,
            text = msg.trimStart(),
            level = LogLevel.valueOf(lvl),
        )
    } else {
        LogLine(
            timestamp = nowTs(),
            text = raw,
            level = if (raw.startsWith("ERROR", ignoreCase = true)) LogLevel.ERROR
            else LogLevel.INFO,
        )
    }
}

@Composable
fun OrchestratorScreen(
    onRun: suspend (
        preferredPort: Int?,
        onState: (OrchestratorState) -> Unit,
        onLog: (String) -> Unit,
    ) -> OrchestratorState,
    onStop: () -> Unit,
    onOpenBrowser: (url: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var state by remember {
        mutableStateOf(
            OrchestratorState(
                steps = listOf(
                    TaskStep("port", "Resolver puerto libre"),
                    TaskStep("backend", "Lanzar backend Go"),
                    TaskStep("health", "Esperar health del API"),
                    TaskStep("discovery", "Anunciar servidor en la red (mDNS)"),
                    TaskStep("browser", "Abrir navegador"),
                ),
            ),
        )
    }
    var logLines by remember { mutableStateOf(listOf<LogLine>()) }
    var busy by remember { mutableStateOf(false) }
    var portText by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    // Auto-scroll al final cuando llegan nuevos logs
    LaunchedEffect(logLines.size) {
        if (logLines.isNotEmpty()) {
            listState.animateScrollToItem(logLines.size - 1)
        }
    }

    val canOpenBrowser = !state.baseUrl.isNullOrBlank() && state.backendRunning

    fun parsePreferredPort(): Int? {
        val raw = portText.trim()
        if (raw.isEmpty()) return null
        val n = raw.toIntOrNull()
            ?: throw IllegalArgumentException("Puerto no numérico: «$raw»")
        if (n !in 1..65535) throw IllegalArgumentException("Puerto fuera de rango: $n")
        return n
    }

    val panelShape = RoundedCornerShape(10.dp)

    Surface(
        modifier = modifier.fillMaxSize(),
        color = BgBase,
    ) {
        Column(modifier = Modifier.fillMaxSize()) {

            // ── Header ──────────────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(BgMantle)
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                // Dot de estado
                val dotColor = when {
                    busy -> AccentYellow
                    state.backendRunning -> AccentGreen
                    state.lastError != null -> AccentRed
                    else -> Color(0xFF585B70)
                }
                StatusDot(
                    isRunning = busy,
                    color = dotColor,
                    size = 10.dp,
                )
                Text(
                    "ÁbacoPhy",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMain,
                )
                Text("·", color = TextSubtle, fontSize = 16.sp)
                Text(
                    "Orquestador",
                    fontSize = 16.sp,
                    color = TextSubtle,
                    fontWeight = FontWeight.Normal,
                )
                Spacer(Modifier.weight(1f))
                // Pill de estado
                val (pillText, pillColor) = when {
                    busy -> "Iniciando…" to AccentYellow
                    state.backendRunning -> "Activo" to AccentGreen
                    state.lastError != null -> "Error" to AccentRed
                    else -> "Detenido" to TextSubtle
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(pillColor.copy(alpha = 0.15f))
                        .border(1.dp, pillColor.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                        .padding(horizontal = 10.dp, vertical = 3.dp),
                ) {
                    Text(pillText, fontSize = 11.sp, color = pillColor, fontWeight = FontWeight.SemiBold)
                }
                if (state.backendRunning) {
                    if (!state.baseUrl.isNullOrBlank()) {
                        Spacer(Modifier.width(8.dp))
                        Text(
                            state.baseUrl ?: "",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = Accent.copy(alpha = 0.8f),
                        )
                    }
                    val lan = state.lanUrls.firstOrNull()
                    if (lan != null) {
                        Spacer(Modifier.width(8.dp))
                        Text("·", color = TextSubtle, fontSize = 11.sp)
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "LAN: $lan",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = AccentGreen.copy(alpha = 0.85f),
                        )
                    }
                }
            }

            // ── Body: dos paneles ────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {

                // ── Panel izquierdo: Controles + Pasos ──────────────────────
                Column(
                    modifier = Modifier
                        .width(300.dp)
                        .fillMaxHeight()
                        .clip(panelShape)
                        .background(BgMantle)
                        .border(1.dp, BorderColor, panelShape)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(0.dp),
                ) {
                    // Sección: Puerto
                    Text(
                        "CONFIGURACIÓN",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextSubtle,
                        letterSpacing = 1.sp,
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = portText,
                        onValueChange = { portText = it.filter { ch -> ch.isDigit() }.take(5) },
                        enabled = !busy && !state.backendRunning,
                        label = {
                            Text(
                                "Puerto",
                                fontSize = 12.sp,
                                color = TextSubtle,
                            )
                        },
                        placeholder = {
                            Text(
                                "Auto",
                                fontSize = 12.sp,
                                color = TextSubtle.copy(alpha = 0.5f),
                            )
                        },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextMain,
                            unfocusedTextColor = TextMain,
                            focusedBorderColor = Accent,
                            unfocusedBorderColor = BorderColor,
                            focusedLabelColor = Accent,
                            unfocusedLabelColor = TextSubtle,
                            cursorColor = Accent,
                            disabledTextColor = TextSubtle,
                            disabledBorderColor = BorderColor.copy(alpha = 0.5f),
                        ),
                        supportingText = {
                            Text(
                                "Vacío = puerto libre automático",
                                fontSize = 10.sp,
                                color = TextSubtle.copy(alpha = 0.6f),
                            )
                        },
                    )

                    Spacer(Modifier.height(16.dp))
                    HorizontalDivider(color = BorderColor)
                    Spacer(Modifier.height(16.dp))

                    // Sección: Pasos del pipeline
                    Text(
                        "PIPELINE",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextSubtle,
                        letterSpacing = 1.sp,
                    )
                    Spacer(Modifier.height(10.dp))
                    Column {
                        state.steps.forEachIndexed { index, step ->
                            TaskStepRow(
                                step = step,
                                isLast = index == state.steps.lastIndex,
                            )
                        }
                    }
                    if (state.backendRunning) {
                        Spacer(Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(BgSurface2.copy(alpha = 0.6f))
                                .border(1.dp, if (state.discoveryActive) AccentGreen.copy(alpha = 0.35f) else AccentYellow.copy(alpha = 0.35f), RoundedCornerShape(8.dp))
                                .padding(10.dp),
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    if (state.discoveryActive) "● DISCOVERY mDNS ACTIVO" else "◌ DISCOVERY mDNS PENDIENTE",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (state.discoveryActive) AccentGreen else AccentYellow,
                                )
                                Text("Servicio: _abacophy._tcp.local", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = TextMain)
                                Text(
                                    "Clientes conectados desde LAN: ${state.connectedClients}",
                                    fontSize = 10.sp,
                                    color = if (state.connectedClients > 0) AccentGreen else TextSubtle,
                                )
                            }
                        }
                    }

                    // URLs de acceso (Local + LAN)
                    if (state.backendRunning) {
                        Spacer(Modifier.height(10.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(BgSurface2.copy(alpha = 0.6f))
                                .border(1.dp, Accent.copy(alpha = 0.25f), RoundedCornerShape(8.dp))
                                .padding(10.dp),
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    "DIRECCIONES DE ACCESO (0.0.0.0)",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Accent.copy(alpha = 0.9f),
                                    letterSpacing = 1.sp,
                                )
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    "Local: ${state.baseUrl}/",
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = TextMain,
                                )
                                state.lanUrls.forEach { lan ->
                                    Text(
                                        "Red:   $lan/",
                                        fontSize = 11.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = AccentGreen,
                                    )
                                }
                            }
                        }
                    }

                    // Credenciales bootstrap
                    if (state.backendRunning) {
                        Spacer(Modifier.height(8.dp))
                        HorizontalDivider(color = BorderColor)
                        Spacer(Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(BgSurface2.copy(alpha = 0.6f))
                                .border(1.dp, AccentGreen.copy(alpha = 0.25f), RoundedCornerShape(8.dp))
                                .padding(10.dp),
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    "ACCESO INICIAL",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = AccentGreen.copy(alpha = 0.8f),
                                    letterSpacing = 1.sp,
                                )
                                Spacer(Modifier.height(2.dp))
                                listOf(
                                    "master" to "AbacoPhy#Master1",
                                    "admin" to "admin123",
                                ).forEach { (user, pass) ->
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    ) {
                                        Text(
                                            user,
                                            fontSize = 11.sp,
                                            fontFamily = FontFamily.Monospace,
                                            color = Accent,
                                            fontWeight = FontWeight.Bold,
                                        )
                                        Text("/", fontSize = 11.sp, color = TextSubtle)
                                        Text(
                                            pass,
                                            fontSize = 11.sp,
                                            fontFamily = FontFamily.Monospace,
                                            color = AccentPurple,
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Error
                    if (state.lastError != null) {
                        Spacer(Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(AccentRed.copy(alpha = 0.08f))
                                .border(1.dp, AccentRed.copy(alpha = 0.35f), RoundedCornerShape(8.dp))
                                .padding(10.dp),
                        ) {
                            Text(
                                state.lastError ?: "",
                                fontSize = 11.sp,
                                color = AccentRed,
                                fontFamily = FontFamily.Monospace,
                            )
                        }
                    }

                    Spacer(Modifier.weight(1f))
                    HorizontalDivider(color = BorderColor)
                    Spacer(Modifier.height(10.dp))

                    // Botones de acción
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Button(
                            enabled = !busy,
                            onClick = {
                                busy = true
                                logLines = emptyList()
                                scope.launch {
                                    try {
                                        val preferred = parsePreferredPort()
                                        val result = onRun(
                                            preferred,
                                            { s -> state = s },
                                            { raw ->
                                                logLines = logLines + parseLogLine(raw)
                                                when {
                                                    raw.contains("Discovery:") && raw.contains("_abacophy._tcp") -> {
                                                        state = state.copy(
                                                            discoveryActive = true,
                                                            steps = state.steps.map {
                                                                if (it.id == "discovery") it.copy(
                                                                    status = TaskStepStatus.Success,
                                                                    detail = "Anuncio mDNS registrado",
                                                                ) else it
                                                            },
                                                        )
                                                    }
                                                    raw.contains("mDNS discovery unavailable", ignoreCase = true) ||
                                                        raw.contains("discovery disabled", ignoreCase = true) -> {
                                                        state = state.copy(
                                                            discoveryActive = false,
                                                            steps = state.steps.map {
                                                                if (it.id == "discovery") it.copy(
                                                                    status = TaskStepStatus.Failed,
                                                                    detail = "No se pudo activar mDNS; revisar consola",
                                                                ) else it
                                                            },
                                                        )
                                                    }
                                                    raw.contains("CLIENT_CONNECTED") -> {
                                                        state = state.copy(connectedClients = state.connectedClients + 1)
                                                    }
                                                }
                                            },
                                        )
                                        state = result.copy(
                                            discoveryActive = state.discoveryActive,
                                            connectedClients = state.connectedClients,
                                            steps = result.steps.map { resultStep ->
                                                val observed = state.steps.firstOrNull { it.id == resultStep.id }
                                                if (resultStep.id == "discovery" &&
                                                    observed?.status in listOf(TaskStepStatus.Success, TaskStepStatus.Failed)
                                                ) observed else resultStep
                                            },
                                        )
                                    } catch (e: Exception) {
                                        logLines = logLines + LogLine(
                                            timestamp = nowTs(),
                                            text = e.message ?: e.toString(),
                                            level = LogLevel.ERROR,
                                        )
                                        state = state.copy(lastError = e.message)
                                    } finally {
                                        busy = false
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Accent,
                                contentColor = BgMantle,
                                disabledContainerColor = BgSurface2,
                                disabledContentColor = TextSubtle,
                            ),
                            shape = RoundedCornerShape(8.dp),
                        ) {
                            Text(
                                if (busy) "Iniciando…" else "▶  Iniciar",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                            )
                        }
                        OutlinedButton(
                            enabled = !busy && (state.backendRunning || state.steps.any {
                                it.status == TaskStepStatus.Running || it.status == TaskStepStatus.Success
                            }),
                            onClick = {
                                onStop()
                                logLines = logLines + LogLine(nowTs(), "Backend detenido por el usuario.", LogLevel.WARN)
                                state = state.copy(backendRunning = false, discoveryActive = false, connectedClients = 0, lastError = null)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = AccentRed,
                                disabledContentColor = TextSubtle,
                            ),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (!busy && (state.backendRunning || state.steps.any {
                                    it.status == TaskStepStatus.Running || it.status == TaskStepStatus.Success
                                })) AccentRed.copy(alpha = 0.5f) else BorderColor,
                            ),
                            shape = RoundedCornerShape(8.dp),
                        ) {
                            Text("■  Detener", fontSize = 13.sp)
                        }
                        TextButton(
                            enabled = !busy && canOpenBrowser,
                            onClick = {
                                val url = state.baseUrl?.trimEnd('/')?.plus("/") ?: return@TextButton
                                onOpenBrowser(url)
                                logLines = logLines + LogLine(nowTs(), "Reabriendo navegador: $url", LogLevel.INFO)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                        ) {
                            Text(
                                "↗  Abrir navegador",
                                fontSize = 12.sp,
                                color = if (!busy && canOpenBrowser) Accent else TextSubtle,
                            )
                        }
                    }
                }

                // ── Panel derecho: Consola de logs ──────────────────────────
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clip(panelShape)
                        .background(BgCrust)
                        .border(1.dp, BorderColor, panelShape),
                ) {
                    // Header de la consola
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(BgMantle)
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            // Dots decorativos tipo macOS
                            listOf(AccentRed, AccentYellow, AccentGreen).forEach { c ->
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .clip(CircleShape)
                                        .background(c.copy(alpha = 0.7f)),
                                )
                            }
                            Spacer(Modifier.width(6.dp))
                            Text(
                                "CONSOLA",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextSubtle,
                                letterSpacing = 1.sp,
                            )
                            if (logLines.isNotEmpty()) {
                                Text(
                                    "· ${logLines.size} líneas",
                                    fontSize = 10.sp,
                                    color = TextSubtle.copy(alpha = 0.5f),
                                )
                            }
                        }
                        TextButton(
                            onClick = { logLines = emptyList() },
                            enabled = logLines.isNotEmpty(),
                        ) {
                            Text(
                                "Limpiar",
                                fontSize = 11.sp,
                                color = if (logLines.isNotEmpty()) TextSubtle else TextSubtle.copy(alpha = 0.3f),
                            )
                        }
                    }

                    HorizontalDivider(color = BorderColor)

                    // Área de logs
                    if (logLines.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                "— Sin salida todavía. Pulsa ▶ Iniciar —",
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace,
                                color = TextSubtle.copy(alpha = 0.4f),
                            )
                        }
                    } else {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalArrangement = Arrangement.spacedBy(2.dp),
                        ) {
                            items(logLines) { line ->
                                LogLineView(line = line)
                            }
                        }
                    }
                }
            }
        }
    }
}

