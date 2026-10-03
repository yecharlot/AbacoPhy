package com.elitec.com.feature.pos.data.mappers

import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Body POST /pos/sales alineado con web createSaleInputToDto.
 * Solo envía campos que el backend acepta en el alta.
 */
object SaleMapper {
    fun createSaleInputToJsonObject(input: CreateSaleInput): JsonObject = buildJsonObject {
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
