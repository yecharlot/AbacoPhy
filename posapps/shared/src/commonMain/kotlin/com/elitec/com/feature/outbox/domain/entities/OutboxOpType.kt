package com.elitec.com.feature.outbox.domain.entities

/**
 * Tipos de operación que el POS puede encolar para envío diferido.
 * Ampliar solo cuando exista contrato de sync en backend.
 */
enum class OutboxOpType {
    /** Alta de venta de mostrador (POST /pos/sales). */
    SALE_CREATE,
    ;

    companion object {
        fun fromStorage(raw: String): OutboxOpType =
            entries.find { it.name == raw } ?: error("OutboxOpType desconocido: $raw")
    }
}
