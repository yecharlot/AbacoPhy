package com.elitec.abaco_launcher.feature.orchestrator.data

import com.elitec.abaco_launcher.feature.orchestrator.domain.repositories.BrowserLauncher
import java.awt.Desktop
import java.net.URI

/**
 * Abre la URL con el navegador del sistema (AWT Desktop).
 */
class DesktopBrowserLauncher : BrowserLauncher {
    override fun open(url: String) {
        if (Desktop.isDesktopSupported()) {
            val desktop = Desktop.getDesktop()
            if (desktop.isSupported(Desktop.Action.BROWSE)) {
                desktop.browse(URI(url))
                return
            }
        }
        // Fallbacks comunes
        val os = System.getProperty("os.name").orEmpty().lowercase()
        val cmd = when {
            os.contains("win") -> arrayOf("rundll32", "url.dll,FileProtocolHandler", url)
            os.contains("mac") -> arrayOf("open", url)
            else -> arrayOf("xdg-open", url)
        }
        ProcessBuilder(*cmd).start()
    }
}
