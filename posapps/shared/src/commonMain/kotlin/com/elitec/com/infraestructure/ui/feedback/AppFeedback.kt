package com.elitec.com.infraestructure.ui.feedback

/**
 * Feedback global de la app (conectividad, cola, sync).
 * No acoplado a una pantalla concreta: el host se monta en el shell.
 */
enum class FeedbackTone {
    Info,
    Success,
    Warning,
    Error,
    Progress,
}

data class AppFeedbackEvent(
    val id: Long,
    val tone: FeedbackTone,
    val title: String,
    val message: String? = null,
    /** Ms visibles; 0 = permanece hasta el siguiente evento (p.ej. Progress). */
    val durationMs: Long = 3_800,
)
