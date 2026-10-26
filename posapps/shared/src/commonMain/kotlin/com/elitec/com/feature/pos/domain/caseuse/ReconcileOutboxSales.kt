package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.outbox.domain.entities.OutboxOpType
import com.elitec.com.feature.outbox.domain.usecases.ListRetryableOutboxOps
import com.elitec.com.feature.outbox.domain.usecases.MarkOutboxConfirmed
import com.elitec.com.feature.pos.domain.repository.SalesRepository
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory

/**
 * Roadmap 01.K3 — barrido de reconciliación:
 * pendientes de outbox × ventas en servidor por [client_op_id].
 *
 * Cierra como CONFIRMED las que ya existen en el servidor (p.ej. 201 previo
 * con fallo de parse, o POST idempotente) y deja solo las realmente pendientes.
 *
 * Se invoca al recuperar conectividad / SSE Connected, antes del drain de envío.
 */
class ReconcileOutboxSales(
    private val listRetryable: ListRetryableOutboxOps,
    private val sales: SalesRepository,
    private val markConfirmed: MarkOutboxConfirmed,
) {
    data class Report(
        val scanned: Int,
        val closed: Int,
        val stillPending: Int,
    )

    suspend fun execute(limit: Int = 100): Report {
        val pending = listRetryable.execute(limit)
            .filter { it.type == OutboxOpType.SALE_CREATE }
        if (pending.isEmpty()) {
            return Report(scanned = 0, closed = 0, stillPending = 0)
        }

        val remote = try {
            sales.getSales()
        } catch (t: Throwable) {
            AbacoLog.w(
                LogCategory.POS,
                "ReconcileOutboxSales: no se pudo listar ventas remotas: ${t.message}",
            )
            return Report(scanned = pending.size, closed = 0, stillPending = pending.size)
        }

        var closed = 0
        for (entry in pending) {
            val match = remote.firstOrNull { it.matchesClientOpId(entry.clientOpId) } ?: continue
            try {
                sales.replaceProvisional(entry.clientOpId, match)
                markConfirmed.execute(entry.id, serverId = match.id)
                closed++
                AbacoLog.i(
                    LogCategory.POS,
                    "Reconcile: outbox ${entry.clientOpId} → server ${match.id}",
                )
            } catch (t: Throwable) {
                AbacoLog.w(
                    LogCategory.POS,
                    "Reconcile falló clientOpId=${entry.clientOpId}: ${t.message}",
                )
            }
        }

        val still = pending.size - closed
        AbacoLog.step(
            LogCategory.POS,
            "OutboxReconcile",
            "done",
            "scanned=${pending.size} closed=$closed stillPending=$still",
        )
        return Report(scanned = pending.size, closed = closed, stillPending = still)
    }
}
