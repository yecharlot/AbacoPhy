package com.elitec.abaco_launcher.infrastructure.lifecycle

import com.elitec.abaco_launcher.feature.orchestrator.domain.repositories.BackendProcess

/**
 * Registra shutdown hook JVM para no dejar procesos Go huérfanos.
 */
object ProcessShutdown {
    @Volatile
    private var registered = false

    fun register(backend: BackendProcess) {
        if (registered) return
        registered = true
        Runtime.getRuntime().addShutdownHook(
            Thread({
                try {
                    backend.stop()
                } catch (_: Exception) {
                }
                SingleInstanceLock.release()
            }, "abacophy-orchestrator-shutdown"),
        )
    }
}
