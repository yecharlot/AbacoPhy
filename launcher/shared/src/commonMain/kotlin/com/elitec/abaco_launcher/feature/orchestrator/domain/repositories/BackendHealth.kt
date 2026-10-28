package com.elitec.abaco_launcher.feature.orchestrator.domain.repositories

/**
 * Contrato: esperar a que el API local responda (health/info).
 */
interface BackendHealth {
    /**
     * @param isProcessAlive si devuelve false, se aborta el wait (crash del hijo)
     * @return true si el backend respondió a tiempo
     */
    suspend fun waitUntilReady(
        baseUrl: String,
        timeoutMs: Long = 60_000L,
        isProcessAlive: () -> Boolean = { true },
    ): Boolean
}
