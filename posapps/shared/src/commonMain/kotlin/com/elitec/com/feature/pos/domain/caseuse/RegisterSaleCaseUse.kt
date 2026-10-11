package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.outbox.domain.entities.OutboxIds
import com.elitec.com.feature.outbox.domain.entities.OutboxOpType
import com.elitec.com.feature.outbox.domain.usecases.EnqueueOutboxOp
import com.elitec.com.feature.pos.data.mappers.SaleMapper
import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.entities.SaleLine
import com.elitec.com.feature.pos.domain.entities.effectiveLineTotal
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlin.time.Clock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * 1. Valida el ticket (mismas reglas que web).
 * 2. Encola en outbox (PENDING) con client_op_id.
 * 3. Si hay red, sync one-shot → CONFIRMED o queda en cola.
 *
 * Sin red: devuelve venta provisional status=pending_local (no es verdad de servidor).
 * Con rechazo de negocio: Result.failure (outbox REJECTED).
 */
class RegisterSaleCaseUse(
    private val enqueue: EnqueueOutboxOp,
    private val syncOneShot: SyncSaleOutboxOneShot,
) {
    suspend operator fun invoke(input: CreateSaleInput): Result<Sale> = runCatching {
        validate(input)

        val clientOpId = OutboxIds.newClientOpId()
        val payloadJson = SaleMapper.createSaleInputToPayloadJson(input, clientOpId)
        val contextJson = Json.encodeToString(
            JsonObject.serializer(),
            buildJsonObject {
                input.unitId?.let { put("unit_id", it) }
                input.seller?.let { put("seller", it) }
            },
        )

        val entry = enqueue.execute(
            EnqueueOutboxOp.Input(
                type = OutboxOpType.SALE_CREATE,
                payloadJson = payloadJson,
                clientOpId = clientOpId,
                contextJson = contextJson,
            ),
        )
        AbacoLog.step(
            LogCategory.POS,
            "RegisterSale",
            "enqueued",
            "outboxId=${entry.id} clientOpId=$clientOpId",
        )

        val confirmed = syncOneShot.execute(entry)
        if (confirmed != null) {
            AbacoLog.step(LogCategory.POS, "RegisterSale", "confirmed", "saleId=${confirmed.id}")
            return@runCatching confirmed
        }

        val provisional = provisionalSale(input, clientOpId, entry.id)
        AbacoLog.step(
            LogCategory.POS,
            "RegisterSale",
            "queued_offline",
            "clientOpId=$clientOpId",
        )
        provisional
    }

    private fun validate(input: CreateSaleInput) {
        if (input.lines.isEmpty()) {
            error("La venta necesita al menos una línea")
        }
        for (line in input.lines) {
            if (line.productId.isBlank()) {
                error("Cada línea necesita un producto")
            }
            if (line.qty <= 0.0) {
                error("La cantidad debe ser mayor que cero")
            }
            line.unitPrice?.let {
                if (it < 0.0) error("El precio no puede ser negativo")
            }
            line.discountPct?.let {
                if (it < 0.0 || it > 100.0) error("La rebaja debe estar entre 0 y 100 %")
            }
        }
    }

    private fun provisionalSale(
        input: CreateSaleInput,
        clientOpId: String,
        outboxId: String,
    ): Sale {
        val lines = input.lines.map { line ->
            val price = line.unitPrice ?: 0.0
            val disc = line.discountPct ?: 0.0
            val lineTotal = price * line.qty * (1.0 - disc / 100.0)
            SaleLine(
                productId = line.productId,
                productCode = "",
                productName = line.productId,
                qty = line.qty,
                unitPrice = price,
                discountPct = disc,
                discountAmt = price * line.qty * (disc / 100.0),
                lineTotal = lineTotal,
            )
        }
        val sub = lines.sumOf { it.effectiveLineTotal() }
        val meta = buildJsonObject {
            put("client_op_id", clientOpId)
            put("outbox_id", outboxId)
            put("sync_status", "pending_local")
        }
        val now = Clock.System.now().toString()
        return Sale(
            id = "local-$clientOpId",
            number = "PENDIENTE",
            date = input.date?.takeIf { it.isNotBlank() } ?: now,
            unitId = input.unitId.orEmpty(),
            unitName = "",
            seller = input.seller.orEmpty(),
            lines = lines,
            subtotal = sub,
            discount = 0.0,
            total = sub,
            costTotal = 0.0,
            currency = "",
            status = "pending_local",
            note = input.note.orEmpty(),
            metadata = Json.encodeToString(JsonObject.serializer(), meta),
        )
    }
}
