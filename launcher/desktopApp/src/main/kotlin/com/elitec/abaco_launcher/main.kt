package com.elitec.abaco_launcher

import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.elitec.abaco_launcher.feature.orchestrator.data.DesktopBrowserLauncher
import com.elitec.abaco_launcher.feature.orchestrator.di.OrchestratorModule
import com.elitec.abaco_launcher.infrastructure.lifecycle.ProcessShutdown
import com.elitec.abaco_launcher.infrastructure.lifecycle.SingleInstanceLock
import javax.swing.JOptionPane

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
    ProcessShutdown.register(useCase.backendProcess())

    val browser = DesktopBrowserLauncher()
    val windowState = rememberWindowState(size = DpSize(980.dp, 680.dp))

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
        state = windowState,
    ) {
        App(
            onRun = { preferredPort, onState, onLog ->
                useCase.run(
                    preferredPort = preferredPort,
                    onState = onState,
                    onLog = onLog,
                )
            },
            onStop = { useCase.stopBackend() },
            onOpenBrowser = { url -> browser.open(url) },
        )
    }
}
