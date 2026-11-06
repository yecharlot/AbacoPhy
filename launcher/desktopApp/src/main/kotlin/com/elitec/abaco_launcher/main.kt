package com.elitec.abaco_launcher

import java.io.File
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.elitec.abaco_launcher.feature.orchestrator.data.DesktopBrowserLauncher
import com.elitec.abaco_launcher.feature.orchestrator.data.SystemLanInterfaceResolver
import com.elitec.abaco_launcher.feature.orchestrator.di.OrchestratorModule
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.LanInterfaceOption
import com.elitec.abaco_launcher.infrastructure.lifecycle.ProcessShutdown
import com.elitec.abaco_launcher.infrastructure.lifecycle.SingleInstanceLock
import com.elitec.abaco_launcher.infrastructure.config.LauncherPaths
import javax.swing.JOptionPane
import java.util.prefs.Preferences
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.res.loadImageBitmap
import androidx.compose.ui.res.useResource

private object LauncherPreferenceNode

private val launcherPreferences = Preferences.userNodeForPackage(LauncherPreferenceNode::class.java)
private const val NETWORK_SCOPE_KEY = "networkScope"
private const val CORS_RULES_KEY = "corsAllowedOrigins"
private const val LAN_INTERFACE_KEY = "lanInterfaceName"

private fun loadSelectedLanInterfaceName(options: List<LanInterfaceOption>): String? {
    val saved = launcherPreferences.get(LAN_INTERFACE_KEY, "").takeIf { it.isNotBlank() }
    return saved?.takeIf { name -> options.any { it.interfaceName == name } }
        ?: options.firstOrNull()?.interfaceName
}

private fun saveSelectedLanInterfaceName(value: String) {
    runCatching {
        launcherPreferences.put(LAN_INTERFACE_KEY, value)
        launcherPreferences.flush()
    }.onFailure { persistLauncherLog("No se pudo guardar la interfaz LAN: ${it.message}") }
}

private fun loadNetworkScope(): String =
    launcherPreferences.get(NETWORK_SCOPE_KEY, "LOCAL")
        .uppercase()
        .takeIf { it == "LOCAL" || it == "LAN" } ?: "LOCAL"

private fun loadCorsRules(): String = launcherPreferences.get(CORS_RULES_KEY, "")

private fun saveCorsRules(value: String) {
    runCatching {
        launcherPreferences.put(CORS_RULES_KEY, value)
        launcherPreferences.flush()
    }.onFailure { persistLauncherLog("No se pudo guardar la lista CORS: ${it.message}") }
}

private fun saveNetworkScope(value: String) {
    val normalized = value.uppercase().takeIf { it == "LOCAL" || it == "LAN" } ?: "LOCAL"
    runCatching {
        launcherPreferences.put(NETWORK_SCOPE_KEY, normalized)
        launcherPreferences.flush()
    }.onFailure { persistLauncherLog("No se pudo guardar el alcance de red: ${it.message}") }
}
private val launcherLogLock = Any()
private val launcherLogTimestamp = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS")

private fun persistLauncherLog(line: String) {
    runCatching {
        val dataDir = LauncherPaths.resolveDataDir()
        if (!dataDir.exists()) dataDir.mkdirs()
        val logFile = File(dataDir, "launcher.log")
        synchronized(launcherLogLock) {
            logFile.appendText("${LocalDateTime.now().format(launcherLogTimestamp)} $line\n", Charsets.UTF_8)
        }
    }
}


private fun loadWindowIcon(): Painter? = runCatching {
    BitmapPainter(useResource("app-icon.png") { loadImageBitmap(it) })
}.getOrNull()

fun main() = application {
    if (!SingleInstanceLock.tryAcquire()) {
        JOptionPane.showMessageDialog(
            null,
            "Ya hay una instancia del Orquestador ÁbacoPhy en ejecución.",
            "ÁbacoPhy Orquestador",
            JOptionPane.WARNING_MESSAGE,
        )
        exitApplication()
        return@application
    }

    val useCase = OrchestratorModule.provideUseCase()
    val lanInterfaceResolver = SystemLanInterfaceResolver()
    ProcessShutdown.register(useCase.backendProcess())

    val browser = DesktopBrowserLauncher()
    val windowState = rememberWindowState(size = DpSize(980.dp, 680.dp))
    val initialLanInterfaces = lanInterfaceResolver.list()
    val initialSelectedLanInterfaceName = loadSelectedLanInterfaceName(initialLanInterfaces)

    Window(
        onCloseRequest = {
            try {
                useCase.stopBackend()
            } finally {
                SingleInstanceLock.release()
                exitApplication()
            }
        },
        title = "ÁbacoPhy Orquestador",
        icon = loadWindowIcon(),
        state = windowState,
    ) {
        App(
            onRun = { preferredPort, networkScope, corsAllowedOrigins, selectedLanInterfaceName, onState, onLog ->
                useCase.run(
                    preferredPort = preferredPort,
                    networkScope = networkScope,
                    corsAllowedOrigins = corsAllowedOrigins,
                    selectedLanInterfaceName = selectedLanInterfaceName,
                    onState = onState,
                    onLog = { line ->
                        persistLauncherLog(line)
                        onLog(line)
                    },
                )
            },
            onStop = { useCase.stopBackend() },
            onOpenBrowser = { url -> browser.open(url) },
            initialNetworkScope = loadNetworkScope(),
            onNetworkScopeChange = ::saveNetworkScope,
            initialCorsRules = loadCorsRules(),
            onCorsRulesChange = ::saveCorsRules,
            initialLanInterfaces = initialLanInterfaces,
            initialSelectedLanInterfaceName = initialSelectedLanInterfaceName,
            onSelectedLanInterfaceChange = ::saveSelectedLanInterfaceName,
            onRefreshLanInterfaces = { lanInterfaceResolver.list() },
        )
    }
}
