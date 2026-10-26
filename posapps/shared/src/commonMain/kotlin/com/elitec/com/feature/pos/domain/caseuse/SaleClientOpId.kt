package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.pos.domain.entities.Sale

/**
 * ¿La venta del servidor corresponde a un client_op_id de outbox?
 * metadata puede ser JSON string u objeto serializado a string.
 */
fun Sale.matchesClientOpId(clientOpId: String): Boolean {
    if (clientOpId.isBlank()) return false
    val m = metadata?.trim().orEmpty()
    if (m.isEmpty()) return false
    if (m == clientOpId) return true
    return m.contains(clientOpId)
}

/**
 * Venta confirmada por backend (no provisional de outbox local).
 * Las provisionales usan id local-*, status pending_local, number PENDIENTE.
 */
fun Sale.isServerConfirmed(): Boolean {
    if (id.startsWith("local-")) return false
    if (status.equals("pending_local", ignoreCase = true)) return false
    if (number.equals("PENDIENTE", ignoreCase = true)) return false
    return id.isNotBlank()
}
