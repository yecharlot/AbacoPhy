package com.elitec.abaco_launcher.feature.orchestrator.domain.models

/**
 * Paso de la secuencia: puerto → Go → health → navegador.
 */
data class TaskStep(
    val id: String,
    val label: String,
    val status: TaskStepStatus = TaskStepStatus.Pending,
    val detail: String? = null,
)
