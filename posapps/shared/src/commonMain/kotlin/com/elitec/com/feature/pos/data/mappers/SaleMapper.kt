package com.elitec.com.feature.pos.data.mappers

import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import com.elitec.com.feature.pos.domain.entities.CreateSaleLineInput
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

/**
 * Body POST /pos/sales alineado con web createSaleInputToDto.
 * Incluye metadata.client_op_id para idempotencia (outbox / sync).
 */
object SaleMapper {
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    fun createSaleInputToJsonObject(
        input: CreateSaleInput,
        clientOpId: String? = null,
    ): JsonObject = buildJsonObject {
        put(
            "lines",
            buildJsonArray {
                input.lines.forEach { line ->
                    add(
                        buildJsonObject {
                            put("product_id", line.productId)
                            put("qty", line.qty)
                            line.unitPrice?.let { put("unit_price", it) }
                            line.discountPct?.let { put("discount_pct", it) }
                        },
                    )
                }
            },
        )
        input.unitId?.takeIf { it.isNotBlank() }?.let { put("unit_id", it) }
        input.seller?.takeIf { it.isNotBlank() }?.let { put("seller", it) }
        input.date?.takeIf { it.isNotBlank() }?.let { put("date", it) }
        input.note?.takeIf { it.isNotBlank() }?.let { put("note", it) }

        val meta = buildMetadataObject(input.metadata, clientOpId)
        if (meta.isNotEmpty()) {
            put("metadata", meta)
        }
    }

    fun createSaleInputToPayloadJson(
        input: CreateSaleInput,
        clientOpId: String,
    ): String = json.encodeToString(JsonObject.serializer(), createSaleInputToJsonObject(input, clientOpId))

    fun createSaleInputFromPayloadJson(payloadJson: String): CreateSaleInput {
        val root = json.parseToJsonElement(payloadJson).jsonObject
        val lines = root["lines"]?.jsonArray.orEmpty().map { el ->
            val o = el.jsonObject
            CreateSaleLineInput(
                productId = o["product_id"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                qty = o["qty"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
                unitPrice = o["unit_price"]?.jsonPrimitive?.doubleOrNull,
                discountPct = o["discount_pct"]?.jsonPrimitive?.doubleOrNull,
            )
        }
        val meta = root["metadata"]
        val metaStr = when (meta) {
            is JsonObject -> json.encodeToString(JsonObject.serializer(), meta)
            is JsonPrimitive -> meta.contentOrNull
            else -> null
        }
        return CreateSaleInput(
            unitId = root["unit_id"]?.jsonPrimitive?.contentOrNull,
            seller = root["seller"]?.jsonPrimitive?.contentOrNull,
            date = root["date"]?.jsonPrimitive?.contentOrNull,
            note = root["note"]?.jsonPrimitive?.contentOrNull,
            lines = lines,
            metadata = metaStr,
        )
    }

    private fun buildMetadataObject(
        existing: String?,
        clientOpId: String?,
    ): JsonObject = buildJsonObject {
        if (!existing.isNullOrBlank()) {
            runCatching {
                val el = json.parseToJsonElement(existing)
                if (el is JsonObject) {
                    el.forEach { (k, v) -> put(k, v) }
                }
            }
        }
        clientOpId?.takeIf { it.isNotBlank() }?.let {
            put("client_op_id", it)
        }
    }

    /** Variante Map para clientes que serializan Map/Any. */
    fun createSaleInputToMap(input: CreateSaleInput): Map<String, Any?> {
        val lines = input.lines.map { line ->
            buildMap<String, Any?> {
                put("product_id", line.productId)
                put("qty", line.qty)
                line.unitPrice?.let { put("unit_price", it) }
                line.discountPct?.let { put("discount_pct", it) }
            }
        }
        return buildMap {
            put("lines", lines)
            input.unitId?.takeIf { it.isNotBlank() }?.let { put("unit_id", it) }
            input.seller?.takeIf { it.isNotBlank() }?.let { put("seller", it) }
            input.date?.takeIf { it.isNotBlank() }?.let { put("date", it) }
            input.note?.takeIf { it.isNotBlank() }?.let { put("note", it) }
        }
    }
}
