package com.elitec.abaco_launcher.feature.orchestrator.domain.models

/**
 * Estado agregado del orquestador.
 * La secuencia real se implementa en F1 (use cases + data).
 */
data class OrchestratorState(
    val steps: List<TaskStep> = emptyList(),
    val port: Int? = null,
    val baseUrl: String? = null,
    val backendRunning: Boolean = false,
    val lastError: String? = null,
    val logLines: List<LogLine> = emptyList(),
    val lanUrls: List<String> = emptyList(),
)
