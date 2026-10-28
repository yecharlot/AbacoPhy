package com.elitec.abaco_launcher.feature.orchestrator.domain.models

/**
 * Estado visual de un paso del orquestador (UI F3 consumirá esto).
 * Sin lógica de orquestación en F0.
 */
enum class TaskStepStatus {
    Pending,
    Running,
    Success,
    Failed,
}
