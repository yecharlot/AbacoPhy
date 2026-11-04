package com.elitec.abaco_launcher.feature.orchestrator.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.LocalScrollbarStyle
import androidx.compose.foundation.VerticalScrollbar
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollbarAdapter
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Computer
import androidx.compose.material.icons.rounded.DeleteSweep
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Group
import androidx.compose.material.icons.rounded.KeyboardDoubleArrowDown
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.OpenInNew
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.PowerSettingsNew
import androidx.compose.material.icons.rounded.Router
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material.icons.rounded.Terminal
import androidx.compose.material.icons.rounded.Timeline
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material.icons.rounded.WarningAmber
import androidx.compose.material.icons.rounded.WifiTethering
import androidx.compose.material.icons.rounded.Key
import androidx.compose.material.icons.rounded.Dns
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Button
import androidx.compose.material3.TextButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.PointerIcon
import androidx.compose.ui.input.pointer.pointerHoverIcon
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.LogLevel
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.LogLine
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.OrchestratorState
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.TaskStep
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.TaskStepStatus
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch
import java.time.LocalTime
import java.time.format.DateTimeFormatter

private data class CorsRuleEntry(val value: String, val enabled: Boolean = true)

private fun parseCorsRuleEntries(raw: String): List<CorsRuleEntry> {
    if (raw.isBlank()) return emptyList()
    if (raw.startsWith("v2\n")) {
        return raw.lineSequence().drop(1).mapNotNull { line ->
            val separator = line.indexOf("|")
            if (separator <= 0) null else {
                val value = line.substring(separator + 1).trim()
                value.takeIf { it.isNotEmpty() }?.let { CorsRuleEntry(it, line.substring(0, separator) == "1") }
            }
        }.distinctBy { it.value.lowercase() }.toList()
    }
    return raw.split(",", ";", "\n").map { it.trim() }.filter { it.isNotEmpty() }
        .distinctBy { it.lowercase() }.map { CorsRuleEntry(it) }
}

private fun serializeCorsRuleEntries(entries: List<CorsRuleEntry>): String = buildString {
    append("v2\n")
    entries.forEach { append(if (it.enabled) "1" else "0").append("|").append(it.value).append("\n") }
}

private fun isValidCorsRule(raw: String): Boolean {
    val value = raw.trim()
    if (value.isEmpty() || value.contains("://") || value.contains("*") || value.any { it.isWhitespace() }) return false
    val colon = value.lastIndexOf(':')
    val hasPort = colon > 0
    val host = if (hasPort) value.substring(0, colon) else value
    val port = if (hasPort) value.substring(colon + 1).toIntOrNull() else null
    if (hasPort && (port == null || port !in 1..65535)) return false
    val cidr = host.substringAfter("/", "")
    val ip = host.substringBefore("/")
    val octets = ip.split(".")
    val ipv4 = octets.size == 4 && octets.all { it.toIntOrNull()?.let { n -> n in 0..255 } == true }
    if (ipv4) return cidr.isEmpty() || cidr.toIntOrNull()?.let { it in 0..32 } == true
    if (cidr.isNotEmpty()) return false
    val labels = host.split(".")
    return labels.size >= 2 && host.length <= 253 && labels.all { label ->
        label.isNotEmpty() && label.length <= 63 && label.first().isLetterOrDigit() &&
            label.last().isLetterOrDigit() && label.all { it.isLetterOrDigit() || it == '-' }
    }
}

private const val MAX_LOG_LINES = 5_000
private const val COMPACT_BREAKPOINT_DP = 860

private val timeFmt: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss")
private fun nowTs() = LocalTime.now().format(timeFmt)

private val levelRegex = Regex("""\[(\d{2}:\d{2}:\d{2})]\[(INFO|WARN|ERROR|DEBUG)](.*)""")

/** Parsea una línea raw "[HH:mm:ss][LEVEL] texto" → LogLine. */
private fun parseLogLine(raw: String): LogLine {
    val match = levelRegex.matchEntire(raw.trim())
    return if (match != null) {
        val (ts, lvl, msg) = match.destructured
        LogLine(timestamp = ts, text = msg.trimStart(), level = LogLevel.valueOf(lvl))
    } else {
        LogLine(
            timestamp = nowTs(),
            text = raw,
            level = if (raw.startsWith("ERROR", ignoreCase = true)) LogLevel.ERROR else LogLevel.INFO,
        )
    }
}

private fun formatUptime(ms: Long): String {
    val s = ms / 1000
    return "%02d:%02d:%02d".format(s / 3600, (s % 3600) / 60, s % 60)
}

private enum class RunStatus(val label: String, val color: Color, val icon: ImageVector) {
    Starting("Iniciando", Ide.Yellow, Icons.Rounded.Timeline),
    Running("Activo", Ide.Green, Icons.Rounded.WifiTethering),
    Error("Error", Ide.Red, Icons.Rounded.ErrorOutline),
    Stopped("Detenido", Ide.Subtle, Icons.Rounded.PowerSettingsNew),
}

// ════════════════════════════════════════════════════════════════════════════
//  Pantalla principal
// ════════════════════════════════════════════════════════════════════════════

@Composable
fun OrchestratorScreen(
    onRun: suspend (
        preferredPort: Int?,
        networkScope: String,
        corsAllowedOrigins: List<String>,
        onState: (OrchestratorState) -> Unit,
        onLog: (String) -> Unit,
    ) -> OrchestratorState,
    onStop: () -> Unit,
    onOpenBrowser: (url: String) -> Unit,
    initialNetworkScope: String = "LOCAL",
    onNetworkScopeChange: (String) -> Unit = {},
    initialCorsRules: String = "",
    onCorsRulesChange: (String) -> Unit = {},
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
    var networkScope by remember { mutableStateOf(initialNetworkScope) }
    var corsRules by remember { mutableStateOf(parseCorsRuleEntries(initialCorsRules)) }
    var corsInput by remember { mutableStateOf("") }
    var editingCorsIndex by remember { mutableStateOf<Int?>(null) }
    var corsInputError by remember { mutableStateOf<String?>(null) }
    var query by remember { mutableStateOf("") }
    var enabledLevels by remember { mutableStateOf(LogLevel.values().toSet()) }
    val scope = rememberCoroutineScope()

    // Uptime
    var startedAt by remember { mutableStateOf<Long?>(null) }
    var nowMs by remember { mutableLongStateOf(0L) }
    LaunchedEffect(state.backendRunning) {
        startedAt = if (state.backendRunning) System.currentTimeMillis() else null
    }
    LaunchedEffect(startedAt) {
        while (startedAt != null) {
            nowMs = System.currentTimeMillis()
            delay(1000)
        }
    }
    val uptimeMs = startedAt?.let { (nowMs - it).coerceAtLeast(0) }

    fun appendLog(line: LogLine) {
        logLines = (logLines + line).takeLast(MAX_LOG_LINES)
    }

    fun parsePreferredPort(): Int? {
        val raw = portText.trim()
        if (raw.isEmpty()) return null
        val n = raw.toIntOrNull() ?: throw IllegalArgumentException("Puerto no numérico: «$raw»")
        if (n !in 1..65535) throw IllegalArgumentException("Puerto fuera de rango: $n")
        return n
    }

    fun handleRawLog(raw: String) {
        appendLog(parseLogLine(raw))
        when {
            (raw.contains("Discovery:") && raw.contains("_abacophy._tcp")) ||
                    raw.contains("EVENT=discovery.advertised") -> {
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

            raw.contains("EVENT=discovery.disabled") -> {
                val localOnly = raw.contains("local_only_bind") || raw.contains("bind_mode=\"LOCAL\"")
                state = state.copy(
                    discoveryActive = false,
                    steps = state.steps.map {
                        if (it.id == "discovery") it.copy(
                            status = if (localOnly) TaskStepStatus.Success else TaskStepStatus.Failed,
                            detail = if (localOnly) "Desactivado: servidor solo local" else "mDNS desactivado para este modo",
                        ) else it
                    },
                )
            }

            raw.contains("mDNS discovery unavailable", ignoreCase = true) ||
                    raw.contains("EVENT=discovery.register_failed") -> {
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
    }

    fun start() {
        busy = true
        logLines = emptyList()
        scope.launch {
            try {
                val preferred = parsePreferredPort()
                val activeCorsRules = corsRules.filter { it.enabled }.map { it.value }
                val result = onRun(preferred, networkScope, activeCorsRules, { s -> state = s }, { raw -> handleRawLog(raw) })
                state = result.copy(
                    discoveryActive = state.discoveryActive,
                    connectedClients = state.connectedClients,
                    steps = result.steps.map { resultStep ->
                        val observed = state.steps.firstOrNull { it.id == resultStep.id }
                        if (
                            resultStep.id == "discovery" &&
                            observed?.status in listOf(TaskStepStatus.Success, TaskStepStatus.Failed)
                        ) observed ?: resultStep else resultStep
                    },
                )
            } catch (e: Exception) {
                appendLog(LogLine(nowTs(), e.message ?: e.toString(), LogLevel.ERROR))
                state = state.copy(lastError = e.message)
            } finally {
                busy = false
            }
        }
    }

    fun stop() {
        onStop()
        appendLog(LogLine(nowTs(), "Backend detenido por el usuario.", LogLevel.WARN))
        state = state.copy(backendRunning = false, discoveryActive = false, connectedClients = 0, lastError = null)
    }

    val canStop = !busy && (state.backendRunning || state.steps.any {
        it.status == TaskStepStatus.Running || it.status == TaskStepStatus.Success
    })
    val canOpenBrowser = !busy && !state.baseUrl.isNullOrBlank() && state.backendRunning

    val status = when {
        busy -> RunStatus.Starting
        state.backendRunning -> RunStatus.Running
        state.lastError != null -> RunStatus.Error
        else -> RunStatus.Stopped
    }

    val counts = remember(logLines) { logLines.groupingBy { it.level }.eachCount() }

    Surface(modifier = modifier.fillMaxSize(), color = Ide.Base) {
        Column(Modifier.fillMaxSize()) {
            BoxWithConstraints(Modifier.fillMaxWidth()) {
                HeaderBar(
                    status = status,
                    state = state,
                    compact = maxWidth < COMPACT_BREAKPOINT_DP.dp,
                    onOpenBrowser = onOpenBrowser,
                )
            }

            BoxWithConstraints(
                Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(12.dp),
            ) {
                val availableWidth = maxWidth
                val availableHeight = maxHeight
                val compact = maxWidth < COMPACT_BREAKPOINT_DP.dp
                val side: @Composable (Modifier) -> Unit = { mod ->
                    SidePanel(
                        modifier = mod,
                        state = state,
                        busy = busy,
                        compact = compact,
                        portText = portText,
                        networkScope = networkScope,
                        corsRules = corsRules,
                        corsInput = corsInput,
                        editingCorsIndex = editingCorsIndex,
                        corsInputError = corsInputError,
                        onCorsInputChange = { corsInput = it; corsInputError = null },
                        onAddCorsRule = {
                            val candidate = corsInput.trim()
                            val duplicate = corsRules.withIndex().any { (i, rule) ->
                                i != editingCorsIndex && rule.value.equals(candidate, ignoreCase = true)
                            }
                            when {
                                !isValidCorsRule(candidate) -> corsInputError = "Formato no válido. Usa una IP, CIDR o dominio con puerto opcional."
                                duplicate -> corsInputError = "Esta regla ya está registrada."
                                editingCorsIndex != null -> {
                                    val updated = corsRules.toMutableList()
                                    updated[editingCorsIndex!!] = updated[editingCorsIndex!!].copy(value = candidate)
                                    corsRules = updated
                                    onCorsRulesChange(serializeCorsRuleEntries(updated))
                                    corsInput = ""; editingCorsIndex = null; corsInputError = null
                                }
                                else -> {
                                    val updated = corsRules + CorsRuleEntry(candidate)
                                    corsRules = updated
                                    onCorsRulesChange(serializeCorsRuleEntries(updated))
                                    corsInput = ""; corsInputError = null
                                }
                            }
                        },
                        onEditCorsRule = { index ->
                            corsInput = corsRules[index].value
                            editingCorsIndex = index
                            corsInputError = null
                        },
                        onCancelCorsEdit = { corsInput = ""; editingCorsIndex = null; corsInputError = null },
                        onToggleCorsRule = { index ->
                            val updated = corsRules.toMutableList()
                            updated[index] = updated[index].copy(enabled = !updated[index].enabled)
                            corsRules = updated
                            onCorsRulesChange(serializeCorsRuleEntries(updated))
                        },
                        onDeleteCorsRule = { index ->
                            val updated = corsRules.toMutableList().also { it.removeAt(index) }
                            corsRules = updated
                            onCorsRulesChange(serializeCorsRuleEntries(updated))
                            if (editingCorsIndex == index) { corsInput = ""; editingCorsIndex = null }
                            else if (editingCorsIndex != null && editingCorsIndex!! > index) editingCorsIndex = editingCorsIndex!! - 1
                        },
                        onNetworkScopeChange = { selected ->
                            networkScope = selected
                            onNetworkScopeChange(selected)
                        },
                        onPortChange = { portText = it.filter { ch -> ch.isDigit() }.take(5) },
                        canStop = canStop,
                        canOpenBrowser = canOpenBrowser,
                        onStart = ::start,
                        onStop = ::stop,
                        onOpenBrowser = {
                            val url = state.baseUrl?.trimEnd('/')?.plus("/")
                            if (url != null) {
                                onOpenBrowser(url)
                                appendLog(LogLine(nowTs(), "Reabriendo navegador: $url", LogLevel.INFO))
                            }
                        },
                    )
                }
                val console: @Composable (Modifier) -> Unit = { mod ->
                    ConsolePanel(
                        modifier = mod,
                        logLines = logLines,
                        counts = counts,
                        enabledLevels = enabledLevels,
                        onToggleLevel = { lvl ->
                            enabledLevels = if (lvl in enabledLevels && enabledLevels.size > 1) enabledLevels - lvl
                            else enabledLevels + lvl
                        },
                        query = query,
                        onQueryChange = { query = it },
                        onClear = { logLines = emptyList() },
                    )
                }

                if (compact) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        side(
                            Modifier
                                .fillMaxWidth()
                                .heightIn(max = availableHeight * 0.55f)
                        )
                        console(
                            Modifier
                                .weight(1f)
                                .fillMaxWidth()
                        )
                    }
                } else {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        side(
                            Modifier
                                .width(
                                    (availableWidth * 0.28f)
                                        .coerceIn(300.dp, 380.dp)
                                )
                                .fillMaxHeight()
                        )
                        console(
                            Modifier
                                .weight(1f)
                                .fillMaxHeight()
                        )
                    }
                }
            }

            BoxWithConstraints(Modifier.fillMaxWidth()) {
                StatusBar(
                    status = status,
                    state = state,
                    uptimeMs = uptimeMs,
                    warn = counts[LogLevel.WARN] ?: 0,
                    err = counts[LogLevel.ERROR] ?: 0,
                    total = logLines.size,
                    compact = maxWidth < COMPACT_BREAKPOINT_DP.dp,
                )
            }
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
//  Header
// ════════════════════════════════════════════════════════════════════════════

@Composable
private fun HeaderBar(
    status: RunStatus,
    state: OrchestratorState,
    compact: Boolean,
    onOpenBrowser: (String) -> Unit,
) {
    val clipboard = LocalClipboardManager.current
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Ide.Mantle)
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                Modifier
                    .size(30.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Brush.linearGradient(listOf(Ide.Blue, Ide.Purple))),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.Terminal, null, tint = Ide.Mantle, modifier = Modifier.size(18.dp))
            }
            Text("ÁbacoPhy", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ide.Fg, maxLines = 1)
            Text("/", fontSize = 15.sp, color = Ide.Overlay)
            Text("Orquestador", fontSize = 15.sp, color = Ide.Subtle, maxLines = 1)

            Spacer(Modifier.weight(1f))

            if (!compact) {
                AnimatedVisibility(
                    visible = state.backendRunning && !state.baseUrl.isNullOrBlank(),
                    enter = fadeIn(tween(250)) + slideInVertically { -it / 2 },
                    exit = fadeOut(tween(150)),
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        state.baseUrl?.let { url ->
                            UrlChip(Icons.Rounded.Language, url, Ide.Blue) { onOpenBrowser(url.trimEnd('/') + "/") }
                        }
                        state.lanUrls.firstOrNull()?.let { lan ->
                            UrlChip(Icons.Rounded.Router, lan, Ide.Green) { clipboard.setText(AnnotatedString(lan)) }
                        }
                    }
                }
            }
            StatusChip(status)
        }
        HorizontalDivider(color = Ide.Border)
    }
}

@Composable
private fun UrlChip(icon: ImageVector, text: String, color: Color, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(color.copy(alpha = 0.08f))
            .border(1.dp, color.copy(alpha = 0.25f), RoundedCornerShape(6.dp))
            .clickable(onClick = onClick)
            .pointerHoverIcon(PointerIcon.Hand)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(icon, null, tint = color, modifier = Modifier.size(12.dp))
        Text(text, fontSize = 11.sp, fontFamily = Ide.Mono, color = color, maxLines = 1)
    }
}

@OptIn(ExperimentalAnimationApi::class)
@Composable
private fun StatusChip(status: RunStatus) {
    val c by animateColorAsState(status.color, tween(300), label = "chip-color")
    Row(
        modifier = Modifier
            .clip(CircleShape)
            .background(c.copy(alpha = 0.14f))
            .border(1.dp, c.copy(alpha = 0.4f), CircleShape)
            .padding(start = 4.dp, end = 12.dp, top = 1.dp, bottom = 1.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        StatusDot(
            isRunning = status == RunStatus.Starting || status == RunStatus.Running,
            color = c,
            size = 8.dp,
        )
        AnimatedContent(
            targetState = status.label,
            transitionSpec = {
                (fadeIn(tween(200)) + slideInVertically { it / 2 }) togetherWith
                        (fadeOut(tween(120)) + slideOutVertically { -it / 2 })
            },
            label = "chip-label",
        ) { label ->
            Text(label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = c, maxLines = 1)
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
//  Panel izquierdo: configuración + pipeline + acciones
// ════════════════════════════════════════════════════════════════════════════

@Composable
private fun SidePanel(
    modifier: Modifier,
    state: OrchestratorState,
    busy: Boolean,
    compact: Boolean,
    portText: String,
    networkScope: String,
    corsRules: List<CorsRuleEntry>,
    corsInput: String,
    editingCorsIndex: Int?,
    corsInputError: String?,
    onCorsInputChange: (String) -> Unit,
    onAddCorsRule: () -> Unit,
    onEditCorsRule: (Int) -> Unit,
    onCancelCorsEdit: () -> Unit,
    onToggleCorsRule: (Int) -> Unit,
    onDeleteCorsRule: (Int) -> Unit,
    onNetworkScopeChange: (String) -> Unit,
    onPortChange: (String) -> Unit,
    canStop: Boolean,
    canOpenBrowser: Boolean,
    onStart: () -> Unit,
    onStop: () -> Unit,
    onOpenBrowser: () -> Unit,
) {
    val scroll = rememberScrollState()
    val done = state.steps.count { it.status == TaskStepStatus.Success }
    val progress by animateFloatAsState(
        if (state.steps.isEmpty()) 0f else done.toFloat() / state.steps.size,
        tween(500),
        label = "pipeline-progress",
    )

    Column(modifier = modifier.ideCard(Ide.Mantle)) {
        Box(Modifier.weight(1f, fill = !compact)) {
            Column(
                modifier = Modifier
                    .verticalScroll(scroll)
                    .padding(start = 16.dp, top = 16.dp, bottom = 12.dp, end = 20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                SectionLabel(Icons.Rounded.Settings, "CONFIGURACIÓN")
                IdeField(
                    value = portText,
                    onValueChange = onPortChange,
                    placeholder = "Puerto (auto)",
                    leading = Icons.Rounded.Dns,
                    enabled = !busy && !state.backendRunning,
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Number,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(
                    "Vacío = puerto libre automático",
                    fontSize = 10.sp,
                    color = Ide.Subtle.copy(alpha = 0.7f),
                )

                Spacer(Modifier.height(4.dp))
                Text("ALCANCE DEL SERVIDOR", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Ide.Subtle, letterSpacing = 0.7.sp)
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(9.dp)).background(Ide.Surface2).padding(3.dp),
                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                ) {
                    listOf("LOCAL" to "Solo este equipo", "LAN" to "Local + LAN").forEach { (value, label) ->
                        val selected = networkScope == value
                        Column(
                            Modifier.weight(1f)
                                .clip(RoundedCornerShape(7.dp))
                                .background(if (selected) Ide.Blue.copy(alpha = 0.2f) else Color.Transparent)
                                .clickable(enabled = !busy && !state.backendRunning) { onNetworkScopeChange(value) }
                                .padding(horizontal = 7.dp, vertical = 9.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(3.dp),
                        ) {
                            Text(value, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (selected) Ide.Blue else Ide.Fg)
                            Text(label, fontSize = 9.sp, color = Ide.Subtle, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
                Text(
                    if (networkScope == "LAN") "Disponible en localhost para el POS de esta PC y desde otros dispositivos de la red. El firewall sigue aplicándose."
                    else "Disponible únicamente en localhost; los demás equipos no podrán conectarse.",
                    fontSize = 10.sp,
                    color = if (networkScope == "LAN") Ide.Yellow else Ide.Subtle,
                )

                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("ORÍGENES CORS PERMITIDOS", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Ide.Subtle, letterSpacing = 0.7.sp)
                    Spacer(Modifier.weight(1f))
                    Text("${corsRules.count { it.enabled }} activas / ${corsRules.size}", fontSize = 10.sp, color = Ide.Subtle)
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(
                        value = corsInput,
                        onValueChange = onCorsInputChange,
                        modifier = Modifier.weight(1f),
                        enabled = !busy,
                        singleLine = true,
                        placeholder = { Text("IP o dominio[:puerto]", fontSize = 11.sp) },
                        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 11.sp, fontFamily = Ide.Mono, color = Ide.Fg),
                        isError = corsInputError != null,
                    )
                    Button(onClick = onAddCorsRule, enabled = !busy && corsInput.isNotBlank()) {
                        Text(if (editingCorsIndex == null) "Agregar" else "Guardar", fontSize = 11.sp)
                    }
                }
                corsInputError?.let { Text(it, fontSize = 10.sp, color = Ide.Red) }
                if (editingCorsIndex != null) {
                    TextButton(onClick = onCancelCorsEdit, enabled = !busy) { Text("Cancelar edición", fontSize = 10.sp) }
                }
                if (corsRules.isEmpty()) {
                    Text("No hay reglas adicionales. Solo se aceptará el mismo origen.", fontSize = 10.sp, color = Ide.Subtle)
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        corsRules.forEachIndexed { index, rule ->
                            Row(
                                modifier = Modifier.fillMaxWidth()
                                    .ideCard(Ide.Surface2.copy(alpha = 0.55f), Ide.Border)
                                    .padding(horizontal = 8.dp, vertical = 7.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(rule.value, fontSize = 10.sp, fontFamily = Ide.Mono,
                                        color = if (rule.enabled) Ide.Fg else Ide.Subtle,
                                        maxLines = 2, overflow = TextOverflow.Ellipsis)
                                    Text(if (rule.enabled) "Activa" else "Desactivada", fontSize = 9.sp,
                                        color = if (rule.enabled) Ide.Green else Ide.Subtle)
                                }
                                TextButton(onClick = { onToggleCorsRule(index) }, enabled = !busy) {
                                    Text(if (rule.enabled) "Desactivar" else "Activar", fontSize = 9.sp)
                                }
                                TextButton(onClick = { onEditCorsRule(index) }, enabled = !busy) {
                                    Text("Editar", fontSize = 9.sp)
                                }
                                TextButton(onClick = { onDeleteCorsRule(index) }, enabled = !busy) {
                                    Text("Eliminar", fontSize = 9.sp, color = Ide.Red)
                                }
                            }
                        }
                    }
                }
                Text(
                    "Admite IP, subred IPv4 (CIDR) o dominio exacto. El puerto es opcional. Los cambios se guardan y se aplican al próximo inicio del backend.",
                    fontSize = 10.sp, color = Ide.Subtle,
                )

                Spacer(Modifier.height(4.dp))
                HorizontalDivider(color = Ide.Border)
                Spacer(Modifier.height(4.dp))

                SectionLabel(Icons.Rounded.Timeline, "PIPELINE") {
                    Text(
                        "$done/${state.steps.size}",
                        fontSize = 10.sp,
                        fontFamily = Ide.Mono,
                        color = Ide.Subtle,
                    )
                }
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .clip(CircleShape)
                        .background(Ide.Border),
                ) {
                    Box(
                        Modifier
                            .fillMaxWidth(progress)
                            .fillMaxHeight()
                            .background(Brush.horizontalGradient(listOf(Ide.Blue, Ide.Green))),
                    )
                }
                Column {
                    state.steps.forEachIndexed { index, step ->
                        TaskStepRow(step = step, isLast = index == state.steps.lastIndex)
                    }
                }

                CardVisibility(state.backendRunning) { DiscoveryCard(state) }
                CardVisibility(state.backendRunning) { AddressCard(state) }
                CardVisibility(state.backendRunning) { BootstrapInfoCard() }
                CardVisibility(state.lastError != null) { ErrorCard(state.lastError.orEmpty()) }
            }
            VerticalScrollbar(
                adapter = rememberScrollbarAdapter(scroll),
                modifier = Modifier.align(Alignment.CenterEnd).fillMaxHeight().padding(vertical = 4.dp),
                style = LocalScrollbarStyle.current.copy(
                    unhoverColor = Ide.Overlay.copy(alpha = 0.35f),
                    hoverColor = Ide.Overlay,
                ),
            )
        }

        HorizontalDivider(color = Ide.Border)
        Column(
            Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IdeButton(
                    text = if (busy) "Iniciando" else "Iniciar",
                    icon = Icons.Rounded.PlayArrow,
                    onClick = onStart,
                    enabled = !busy && !state.backendRunning,
                    filled = true,
                    loading = busy,
                    tone = Ide.Blue,
                    modifier = Modifier.weight(1f),
                )
                IdeButton(
                    text = "Detener",
                    icon = Icons.Rounded.Stop,
                    onClick = onStop,
                    enabled = canStop,
                    tone = Ide.Red,
                    modifier = Modifier.weight(1f),
                )
            }
            IdeButton(
                text = "Abrir navegador",
                icon = Icons.Rounded.OpenInNew,
                onClick = onOpenBrowser,
                enabled = canOpenBrowser,
                tone = Ide.Blue,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun CardVisibility(visible: Boolean, content: @Composable () -> Unit) {
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(250)) + expandVertically(tween(300)),
        exit = fadeOut(tween(150)) + shrinkVertically(tween(200)),
    ) { content() }
}

@OptIn(ExperimentalAnimationApi::class)
@Composable
private fun DiscoveryCard(state: OrchestratorState) {
    val tone by animateColorAsState(if (state.discoveryActive) Ide.Green else Ide.Yellow, tween(300), label = "disc")
    Column(
        Modifier.fillMaxWidth().ideCard(Ide.Surface2.copy(alpha = 0.5f), tone.copy(alpha = 0.35f)).padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            StatusDot(isRunning = !state.discoveryActive, color = tone, size = 7.dp)
            Text(
                if (state.discoveryActive) "DISCOVERY mDNS ACTIVO" else "DISCOVERY mDNS PENDIENTE",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = tone,
                letterSpacing = 0.6.sp,
            )
        }
        Text("_abacophy._tcp.local", fontSize = 11.sp, fontFamily = Ide.Mono, color = Ide.Fg)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(Icons.Rounded.Group, null, tint = Ide.Subtle, modifier = Modifier.size(13.dp))
            Text("Clientes LAN:", fontSize = 10.sp, color = Ide.Subtle)
            AnimatedContent(
                targetState = state.connectedClients,
                transitionSpec = {
                    (slideInVertically { -it } + fadeIn()) togetherWith (slideOutVertically { it } + fadeOut())
                },
                label = "clients",
            ) { n ->
                Text(
                    n.toString(),
                    fontSize = 11.sp,
                    fontFamily = Ide.Mono,
                    fontWeight = FontWeight.Bold,
                    color = if (n > 0) Ide.Green else Ide.Subtle,
                )
            }
        }
    }
}

@Composable
private fun AddressCard(state: OrchestratorState) {
    Column(
        Modifier.fillMaxWidth().ideCard(Ide.Surface2.copy(alpha = 0.5f), Ide.Blue.copy(alpha = 0.25f)).padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        SectionLabel(Icons.Rounded.Router, "DIRECCIONES DEL SERVIDOR")
        Spacer(Modifier.height(4.dp))
        state.baseUrl?.let { AddressRow(Icons.Rounded.Computer, "Local", "$it/", Ide.Fg) }
        state.lanUrls.forEach { AddressRow(Icons.Rounded.Router, "Red", "$it/", Ide.Green) }
    }
}

@Composable
private fun AddressRow(icon: ImageVector, label: String, url: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Icon(icon, null, tint = Ide.Subtle, modifier = Modifier.size(13.dp))
        Text(label, fontSize = 10.sp, color = Ide.Subtle, modifier = Modifier.width(34.dp))
        Text(
            url,
            fontSize = 11.sp,
            fontFamily = Ide.Mono,
            color = color,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        CopyButton("Copiar URL") { url }
    }
}

@Composable
private fun BootstrapInfoCard() {
    Column(
        Modifier.fillMaxWidth().ideCard(Ide.Surface2.copy(alpha = 0.5f), Ide.Green.copy(alpha = 0.25f)).padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        SectionLabel(Icons.Rounded.Key, "ACCESO INICIAL")
        Text(
            "Las credenciales temporales se generan en el primer arranque y se guardan en bootstrap-credentials.txt dentro del directorio ABACOPHY_DATA. El Launcher no muestra ni registra contraseñas.",
            fontSize = 11.sp,
            color = Ide.Subtle,
        )
    }
}

@Composable
private fun ErrorCard(message: String) {
    Row(
        Modifier.fillMaxWidth().ideCard(Ide.Red.copy(alpha = 0.08f), Ide.Red.copy(alpha = 0.35f)).padding(10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(Icons.Rounded.ErrorOutline, null, tint = Ide.Red, modifier = Modifier.size(16.dp))
        SelectionContainer(Modifier.weight(1f)) {
            Text(message, fontSize = 11.sp, color = Ide.Red, fontFamily = Ide.Mono)
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
//  Panel derecho: consola
// ════════════════════════════════════════════════════════════════════════════

@Composable
private fun ConsolePanel(
    modifier: Modifier,
    logLines: List<LogLine>,
    counts: Map<LogLevel, Int>,
    enabledLevels: Set<LogLevel>,
    onToggleLevel: (LogLevel) -> Unit,
    query: String,
    onQueryChange: (String) -> Unit,
    onClear: () -> Unit,
) {
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    val visible = remember(logLines, enabledLevels, query) {
        val q = query.trim()
        logLines.withIndex().filter { (_, l) ->
            l.level in enabledLevels && (q.isEmpty() || l.text.contains(q, ignoreCase = true))
        }
    }

    // Auto-scroll "pegajoso": sigue al final salvo que el usuario se haya desplazado hacia arriba.
    var stick by remember { mutableStateOf(true) }
    LaunchedEffect(listState) {
        snapshotFlow { listState.isScrollInProgress }
            .filter { !it }
            .collect { stick = !listState.canScrollForward }
    }
    LaunchedEffect(visible.size, stick) {
        if (stick && visible.isNotEmpty()) listState.scrollToItem(visible.lastIndex)
    }

    Column(modifier = modifier.ideCard(Ide.Crust)) {
        // Barra de título
        Row(
            Modifier.fillMaxWidth().background(Ide.Mantle).padding(start = 14.dp, end = 8.dp, top = 6.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(Icons.Rounded.Terminal, null, tint = Ide.Blue, modifier = Modifier.size(15.dp))
            Text("CONSOLA", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Ide.Subtle, letterSpacing = 1.2.sp)
            AnimatedVisibility(visible = logLines.isNotEmpty(), enter = fadeIn(), exit = fadeOut()) {
                Text("· ${logLines.size} líneas", fontSize = 10.sp, color = Ide.Subtle.copy(alpha = 0.6f))
            }
            Spacer(Modifier.weight(1f))
            CopyButton("Copiar logs visibles", enabled = visible.isNotEmpty()) {
                visible.joinToString("\n") { (_, l) -> "[${l.timestamp}][${l.level.name}] ${l.text}" }
            }
            IdeIconButton(
                icon = Icons.Rounded.DeleteSweep,
                description = "Limpiar consola",
                onClick = onClear,
                enabled = logLines.isNotEmpty(),
            )
        }
        HorizontalDivider(color = Ide.Border)

        // Barra de filtros
        Row(
            Modifier.fillMaxWidth().background(Ide.Mantle.copy(alpha = 0.6f)).padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                Modifier.weight(1f, fill = false).horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                listOf(
                    LogLevel.INFO to Ide.Blue,
                    LogLevel.WARN to Ide.Yellow,
                    LogLevel.ERROR to Ide.Red,
                    LogLevel.DEBUG to Ide.Cyan,
                ).forEach { (lvl, color) ->
                    IdeChip(lvl.name, counts[lvl] ?: 0, color, lvl in enabledLevels) { onToggleLevel(lvl) }
                }
            }
            Spacer(Modifier.weight(1f))
            IdeField(
                value = query,
                onValueChange = onQueryChange,
                placeholder = "Filtrar…",
                leading = Icons.Rounded.Search,
                modifier = Modifier.widthIn(min = 140.dp, max = 220.dp),
                trailing = if (query.isNotEmpty()) {
                    {
                        Icon(
                            Icons.Rounded.Close, "Borrar filtro", tint = Ide.Subtle,
                            modifier = Modifier.size(14.dp).clickable { onQueryChange("") }
                                .pointerHoverIcon(PointerIcon.Hand),
                        )
                    }
                } else null,
            )
        }
        HorizontalDivider(color = Ide.Border)

        // Área de logs
        Box(Modifier.weight(1f).fillMaxWidth()) {
            when {
                logLines.isEmpty() -> EmptyConsole()
                visible.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("— Sin coincidencias con el filtro —", fontSize = 12.sp, fontFamily = Ide.Mono, color = Ide.Subtle.copy(alpha = 0.5f))
                }

                else -> {
                    SelectionContainer {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.fillMaxSize().padding(start = 6.dp, end = 14.dp, top = 6.dp, bottom = 6.dp),
                            verticalArrangement = Arrangement.spacedBy(1.dp),
                        ) {
                            items(visible, key = { it.index }) { (idx, line) ->
                                LogLineView(
                                    line = line,
                                    number = idx + 1,
                                    animate = idx == logLines.lastIndex,
                                )
                            }
                        }
                    }
                    VerticalScrollbar(
                        adapter = rememberScrollbarAdapter(listState),
                        modifier = Modifier.align(Alignment.CenterEnd).fillMaxHeight().padding(vertical = 4.dp),
                        style = LocalScrollbarStyle.current.copy(
                            unhoverColor = Ide.Overlay.copy(alpha = 0.35f),
                            hoverColor = Ide.Overlay,
                        ),
                    )
                }
            }

            this@Column.AnimatedVisibility(
                visible = !stick && visible.isNotEmpty(),
                modifier = Modifier.align(Alignment.BottomEnd).padding(end = 22.dp, bottom = 14.dp),
                enter = fadeIn(tween(200)) + slideInVertically { it },
                exit = fadeOut(tween(150)) + slideOutVertically { it },
            ) {
                IdeButton(
                    text = "Ir al final",
                    icon = Icons.Rounded.KeyboardDoubleArrowDown,
                    filled = true,
                    onClick = {
                        stick = true
                        scope.launch { listState.scrollToItem(visible.lastIndex) }
                    },
                )
            }
        }
    }
}

@Composable
private fun EmptyConsole() {
    val transition = rememberInfiniteTransition(label = "cursor")
    val cursorAlpha by transition.animateFloat(
        initialValue = 1f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(tween(550), RepeatMode.Reverse),
        label = "cursor-alpha",
    )
    Column(
        Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Rounded.Terminal, null, tint = Ide.Overlay.copy(alpha = 0.5f), modifier = Modifier.size(36.dp))
        Row {
            Text("$ esperando inicio", fontSize = 12.sp, fontFamily = Ide.Mono, color = Ide.Subtle.copy(alpha = 0.6f))
            Text("▌", fontSize = 12.sp, fontFamily = Ide.Mono, color = Ide.Blue, modifier = Modifier.alpha(cursorAlpha))
        }
        Text("Pulsa Iniciar para lanzar el pipeline", fontSize = 11.sp, color = Ide.Subtle.copy(alpha = 0.4f))
    }
}

// ════════════════════════════════════════════════════════════════════════════
//  Barra de estado inferior (estilo VS Code)
// ════════════════════════════════════════════════════════════════════════════

@Composable
private fun StatusBar(
    status: RunStatus,
    state: OrchestratorState,
    uptimeMs: Long?,
    warn: Int,
    err: Int,
    total: Int,
    compact: Boolean,
) {
    val c by animateColorAsState(status.color, tween(300), label = "bar-color")
    Column {
        HorizontalDivider(color = Ide.Border)
        Row(
            Modifier.fillMaxWidth().height(26.dp).background(Ide.Mantle),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                Modifier.fillMaxHeight().background(c).padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(status.icon, null, tint = Ide.Mantle, modifier = Modifier.size(13.dp))
                Text(status.label.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Ide.Mantle, letterSpacing = 0.8.sp)
            }
            Spacer(Modifier.width(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                if (!compact && state.backendRunning) {
                    state.baseUrl?.let { StatusItem(Icons.Rounded.Language, it, Ide.Blue) }
                }
                if (uptimeMs != null) StatusItem(Icons.Rounded.Schedule, formatUptime(uptimeMs), Ide.Subtle)
                if (state.backendRunning) {
                    StatusItem(Icons.Rounded.Group, state.connectedClients.toString(), if (state.connectedClients > 0) Ide.Green else Ide.Subtle)
                }
            }
            Spacer(Modifier.weight(1f))
            Row(
                Modifier.padding(end = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                StatusItem(Icons.Rounded.WarningAmber, warn.toString(), if (warn > 0) Ide.Yellow else Ide.Subtle)
                StatusItem(Icons.Rounded.ErrorOutline, err.toString(), if (err > 0) Ide.Red else Ide.Subtle)
                if (!compact) Text("$total líneas", fontSize = 10.sp, color = Ide.Subtle)
            }
        }
    }
}

@Composable
private fun StatusItem(icon: ImageVector, text: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        Icon(icon, null, tint = color, modifier = Modifier.size(12.dp))
        Text(text, fontSize = 10.sp, fontFamily = Ide.Mono, color = color, maxLines = 1)
    }
}