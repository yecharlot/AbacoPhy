package com.elitec.com.feature.outbox.domain.entities

/**
 * Ciclo de vida de una entrada en la cola saliente.
 *
 * PENDING → IN_FLIGHT → CONFIRMED | REJECTED
 *                ↓ (red)
 *            PENDING (reintento) o FAILED_NEEDS_ATTENTION
 */
enum class OutboxStatus {
    /** En cola, aún no enviada o a reintentar. */
    PENDING,
    /** Envío en curso (evitar doble POST concurrente). */
    IN_FLIGHT,
    /** Servidor aceptó; opId ↔ id de servidor. */
    CONFIRMED,
    /** Rechazo de negocio (4xx); no reintentar a ciegas. */
    REJECTED,
    /** Agotados reintentos de red o error no recuperable. */
    FAILED_NEEDS_ATTENTION,
    ;

    val isPendingWork: Boolean
        get() = this == PENDING || this == IN_FLIGHT

    val isTerminal: Boolean
        get() = this == CONFIRMED || this == REJECTED || this == FAILED_NEEDS_ATTENTION

    companion object {
        fun fromStorage(raw: String): OutboxStatus =
            entries.find { it.name == raw } ?: PENDING
    }
}
