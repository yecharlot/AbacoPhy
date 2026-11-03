package com.elitec.abaco_launcher.feature.orchestrator.domain.repositories

/**
 * Contrato: abrir el navegador del sistema en la URL del backend.
 * Implementación JVM en data (F1).
 */
interface BrowserLauncher {
    fun open(url: String)
}
