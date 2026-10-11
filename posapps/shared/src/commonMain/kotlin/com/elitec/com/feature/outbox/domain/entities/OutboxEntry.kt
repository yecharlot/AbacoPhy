package com.elitec.com.feature.outbox.domain.entities

/**
 * Operación pendiente de confirmación por el backend.
 * El dispositivo **propone**; el servidor **confirma**.
 *
 * [clientOpId] es la clave de idempotencia (metadata / sync).
 * [payloadJson] es el body serializado del contrato remoto (p.ej. CreateSale).
 * [serverId] se rellena al confirmar (id de venta VT-… en servidor).
 */
data class OutboxEntry(
    val id: String,
    val clientOpId: String,
    val type: OutboxOpType,
    val payloadJson: String,
    val status: OutboxStatus,
    val createdAtEpochMs: Long,
    val updatedAtEpochMs: Long,
    val attempts: Int = 0,
    val lastError: String? = null,
    val serverId: String? = null,
    /** Contexto opcional (unitId, seller) para UI/filtros sin parsear payload. */
    val contextJson: String? = null,
) {
    init {
        require(id.isNotBlank()) { "OutboxEntry.id requerido" }
        require(clientOpId.isNotBlank()) { "OutboxEntry.clientOpId requerido" }
        require(payloadJson.isNotBlank()) { "OutboxEntry.payloadJson requerido" }
        require(attempts >= 0) { "attempts no puede ser negativo" }
    }
}
