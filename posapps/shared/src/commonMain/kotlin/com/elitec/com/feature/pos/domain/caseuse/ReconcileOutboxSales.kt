package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.outbox.domain.entities.OutboxOpType
import com.elitec.com.feature.outbox.domain.usecases.ListRetryableOutboxOps
import com.elitec.com.feature.outbox.domain.usecases.MarkOutboxConfirmed
import com.elitec.com.feature.pos.domain.repository.SalesRepository
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory

/**
 * Roadmap 01.K3 — barrido de reconciliación:
 * pendientes de outbox × ventas **solo de servidor** por [client_op_id].
 *
 * IMPORTANTE: no usar [SalesRepository.getSales] (mergea pending_local).
 * Un provisional local lleva el mismo client_op_id y matchearía a sí mismo,
 * marcando CONFIRMED sin haber enviado nunca la venta al backend.
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

        val serverSales = try {
            sales.getServerSales()
                .filter { it.isServerConfirmed() }
        } catch (t: Throwable) {
            AbacoLog.w(
                LogCategory.POS,
                "ReconcileOutboxSales: no se pudo listar ventas de servidor: ${t.message}",
            )
            return Report(scanned = pending.size, closed = 0, stillPending = pending.size)
        }

        var closed = 0
        for (entry in pending) {
            val match = serverSales.firstOrNull { it.matchesClientOpId(entry.clientOpId) }
                ?: continue
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
