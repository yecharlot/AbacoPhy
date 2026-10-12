package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.outbox.domain.entities.OutboxOpType
import com.elitec.com.feature.outbox.domain.usecases.ListRetryableOutboxOps
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory

/** Drena la cola PENDING de ventas (FIFO). Sin UI. */
class SyncPendingOutboxOps(
    private val listRetryable: ListRetryableOutboxOps,
    private val syncSaleOneShot: SyncSaleOutboxOneShot,
) {
    data class Report(
        val attempted: Int,
        val confirmed: Int,
        val stillPending: Int,
        val rejected: Int,
    )

    suspend fun execute(limit: Int = 50): Report {
        val batch = listRetryable.execute(limit)
            .filter { it.type == OutboxOpType.SALE_CREATE }
        if (batch.isEmpty()) return Report(0, 0, 0, 0)
        AbacoLog.step(LogCategory.POS, "OutboxSync", "drain_start", "count=${batch.size}")
        var confirmed = 0
        var stillPending = 0
        var rejected = 0
        for (entry in batch) {
            try {
                val sale = syncSaleOneShot.execute(entry)
                if (sale != null) confirmed++ else stillPending++
            } catch (t: Throwable) {
                rejected++
                AbacoLog.w(LogCategory.POS, "OutboxSync reject ${entry.clientOpId}: ${t.message}")
            }
        }
        AbacoLog.step(
            LogCategory.POS,
            "OutboxSync",
            "drain_done",
            "confirmed=$confirmed stillPending=$stillPending rejected=$rejected",
        )
        return Report(batch.size, confirmed, stillPending, rejected)
    }
}
