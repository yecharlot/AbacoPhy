package com.elitec.com.feature.pos.data.dto

import com.elitec.com.feature.pos.domain.entities.SaleLine
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SaleLineDto(
    @SerialName("product_id") val productId: String = "",
    @SerialName("product_code") val productCode: String? = null,
    @SerialName("product_name") val productName: String? = null,
    val qty: Double? = null,
    @SerialName("unit_price") val unitPrice: Double? = null,
    @SerialName("discount_pct") val discountPct: Double? = null,
    @SerialName("discount_amt") val discountAmt: Double? = null,
    @SerialName("line_total") val lineTotal: Double? = null,
    @SerialName("unit_cost") val unitCost: Double? = null,
    @SerialName("cost_amount") val costAmount: Double? = null,
    val metadata: String? = null,
)

fun SaleLineDto.toDomain(): SaleLine = SaleLine(
    productId = productId,
    productCode = productCode.orEmpty(),
    productName = productName.orEmpty(),
    qty = qty ?: 0.0,
    unitPrice = unitPrice ?: 0.0,
    discountPct = discountPct ?: 0.0,
    discountAmt = discountAmt ?: 0.0,
    lineTotal = lineTotal ?: 0.0,
    unitCost = unitCost ?: 0.0,
    costAmount = costAmount ?: 0.0,
    metadata = metadata,
)

fun SaleLine.toDto(): SaleLineDto = SaleLineDto(
    productId = productId,
    productCode = productCode,
    productName = productName,
    qty = qty,
    unitPrice = unitPrice,
    discountPct = discountPct,
    discountAmt = discountAmt,
    lineTotal = lineTotal,
    unitCost = unitCost,
    costAmount = costAmount,
    metadata = metadata,
)
