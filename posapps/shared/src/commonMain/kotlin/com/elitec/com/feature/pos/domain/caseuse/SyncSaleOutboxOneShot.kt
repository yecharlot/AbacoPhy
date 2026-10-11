package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.outbox.domain.entities.OutboxEntry
import com.elitec.com.feature.outbox.domain.entities.OutboxOpType
import com.elitec.com.feature.outbox.domain.usecases.MarkOutboxConfirmed
import com.elitec.com.feature.outbox.domain.usecases.MarkOutboxFailedRetry
import com.elitec.com.feature.outbox.domain.usecases.MarkOutboxInFlight
import com.elitec.com.feature.outbox.domain.usecases.MarkOutboxRejected
import com.elitec.com.feature.pos.data.mappers.SaleMapper
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import com.elitec.com.infraestructure.network.ServerConnectivityGuard

/**
 * Intento único de enviar una entrada SALE_CREATE al servidor.
 * Éxito → CONFIRMED + cache local (vía repository).
 * Red → PENDING (reintento futuro).
 * Negocio 4xx → REJECTED.
 */
class SyncSaleOutboxOneShot(
    private val repository: SalesRepository,
    private val markInFlight: MarkOutboxInFlight,
    private val markConfirmed: MarkOutboxConfirmed,
    private val markRejected: MarkOutboxRejected,
    private val markFailedRetry: MarkOutboxFailedRetry,
) {
    /**
     * @return Sale confirmada del servidor, o null si quedó en cola (transporte).
     * @throws IllegalStateException si el servidor rechaza la operación de negocio.
     */
    suspend fun execute(entry: OutboxEntry): Sale? {
        require(entry.type == OutboxOpType.SALE_CREATE) {
            "SyncSaleOutboxOneShot solo aplica a SALE_CREATE"
        }
        markInFlight.execute(entry.id)
        val input = SaleMapper.createSaleInputFromPayloadJson(entry.payloadJson)
        return try {
            val sale = repository.createSale(input)
            markConfirmed.execute(entry.id, serverId = sale.id)
            AbacoLog.i(
                LogCategory.POS,
                "Outbox SALE confirmada clientOpId=${entry.clientOpId} serverId=${sale.id}",
            )
            sale
        } catch (t: Throwable) {
            if (ServerConnectivityGuard.isTransportFailure(t)) {
                markFailedRetry.execute(entry.id, t.message ?: t::class.simpleName.orEmpty())
                AbacoLog.w(
                    LogCategory.POS,
                    "Outbox SALE queda PENDING (red) clientOpId=${entry.clientOpId}: ${t.message}",
                )
                null
            } else {
                markRejected.execute(entry.id, t.message ?: "Rechazo del servidor")
                AbacoLog.e(
                    LogCategory.POS,
                    "Outbox SALE REJECTED clientOpId=${entry.clientOpId}: ${t.message}",
                    t,
                )
                throw t
            }
        }
    }
}
