package com.elitec.abaco_launcher.feature.orchestrator.domain.models

/**
 * Una línea de log del proceso backend con timestamp y nivel de severidad.
 */
data class LogLine(
    val timestamp: String,
    val text: String,
    val level: LogLevel,
)
