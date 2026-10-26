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
 *
 * - Éxito (201/200) → CONFIRMED + [SalesRepository.replaceProvisional]
 * - Transporte / parse recuperable → PENDING (reintento) o reconciliación por client_op_id
 * - Negocio 4xx claro → REJECTED
 *
 * Roadmap 01.K1: un 201 con fallo de deserialización **no** debe marcar REJECTED
 * (el servidor ya aplicó la venta; re-fetch por client_op_id).
 */
class SyncSaleOutboxOneShot(
    private val repository: SalesRepository,
    private val markInFlight: MarkOutboxInFlight,
    private val markConfirmed: MarkOutboxConfirmed,
    private val markRejected: MarkOutboxRejected,
    private val markFailedRetry: MarkOutboxFailedRetry,
) {
    /**
     * @return Sale confirmada del servidor, o null si quedó en cola (transporte / recuperar después).
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
            confirmLocal(entry, sale)
            sale
        } catch (t: Throwable) {
            when {
                ServerConnectivityGuard.isTransportFailure(t) -> {
                    markFailedRetry.execute(entry.id, t.message ?: t::class.simpleName.orEmpty())
                    AbacoLog.w(
                        LogCategory.POS,
                        "Outbox SALE queda PENDING (red) clientOpId=${entry.clientOpId}: ${t.message}",
                    )
                    null
                }
                isRecoverableClientSideError(t) -> {
                    val recovered = recoverConfirmedSale(entry.clientOpId)
                    if (recovered != null) {
                        confirmLocal(entry, recovered)
                        AbacoLog.i(
                            LogCategory.POS,
                            "Outbox SALE recuperada tras error de parse clientOpId=${entry.clientOpId} serverId=${recovered.id}",
                        )
                        recovered
                    } else {
                        // Puede ser 201 ya aplicado o fallo transitorio de body: reintentar, no REJECTED.
                        markFailedRetry.execute(
                            entry.id,
                            "recoverable: ${t.message ?: t::class.simpleName.orEmpty()}",
                        )
                        AbacoLog.w(
                            LogCategory.POS,
                            "Outbox SALE reintento (parse/recover) clientOpId=${entry.clientOpId}: ${t.message}",
                        )
                        null
                    }
                }
                else -> {
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

    private suspend fun confirmLocal(entry: OutboxEntry, sale: Sale) {
        repository.replaceProvisional(entry.clientOpId, sale)
        markConfirmed.execute(entry.id, serverId = sale.id)
        AbacoLog.i(
            LogCategory.POS,
            "Outbox SALE confirmada clientOpId=${entry.clientOpId} serverId=${sale.id}",
        )
    }

    /**
     * Tras posible éxito en servidor con fallo local: listar ventas y localizar por client_op_id.
     * Aprovecha idempotencia backend (POST repetido también devolvería la misma venta).
     */
    private suspend fun recoverConfirmedSale(clientOpId: String): Sale? {
        if (clientOpId.isBlank()) return null
        return try {
            // Solo servidor: getSales() mergea pending_local y matchearía el provisional.
            repository.getServerSales()
                .filter { it.isServerConfirmed() }
                .firstOrNull { it.matchesClientOpId(clientOpId) }
        } catch (t: Throwable) {
            AbacoLog.w(LogCategory.POS, "recoverConfirmedSale falló: ${t.message}")
            null
        }
    }

    companion object {
        /**
         * Errores del cliente (serialización, body inesperado, etc.) donde el servidor
         * pudo haber aceptado la venta. No son rechazo de negocio.
         */
        fun isRecoverableClientSideError(t: Throwable): Boolean {
            var cur: Throwable? = t
            while (cur != null) {
                val name = cur::class.simpleName.orEmpty()
                val msg = (cur.message ?: "").lowercase()
                if (
                    name.contains("Json", ignoreCase = true) ||
                    name.contains("Serialization", ignoreCase = true) ||
                    name.contains("JsonConvert", ignoreCase = true) ||
                    msg.contains("json") ||
                    msg.contains("unexpected json") ||
                    msg.contains("respuesta de venta vacía") ||
                    msg.contains("illegal input")
                ) {
                    return true
                }
                // HTTP 5xx genérico en mensaje
                if (Regex("""http 5\d\d""").containsMatchIn(msg)) return true
                cur = cur.cause
            }
            return false
        }

        fun Sale.matchesClientOpId(clientOpId: String): Boolean {
            val m = metadata?.trim().orEmpty()
            if (m.isEmpty()) return false
            if (m == clientOpId) return true
            // metadata puede ser JSON string u objeto serializado
            return m.contains("\"client_op_id\"") && m.contains(clientOpId) ||
                m.contains("\"clientOpId\"") && m.contains(clientOpId) ||
                m.contains(clientOpId)
        }
    }
}
