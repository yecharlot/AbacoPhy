package com.elitec.com.feature.pos.data.dto

import com.elitec.com.feature.pos.domain.entities.SaleLine
import kotlinx.serialization.Serializable

@Serializable
data class SaleLineDto(
    val product_id: String,
    val product_code: String,
    val product_name: String,
    val qty: Double? = 0.0,
    val unit_price: Double,
    val discount_pct: Double? = 0.0,
    val discount_amt: Double? = 0.0,
    val line_total: Int = 0,
    val unit_cost: Double,
    val cost_amount: Double,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String? = null
) {
    companion object {
        fun SaleLineDto.toDomain(): SaleLine {
            return SaleLine(
                productId = this.product_id,
                productCode = this.product_code,
                productName = this.product_name,
                qty = this.qty ?: 0.0,
                unitPrice = this.unit_price,
                discountPct = this.discount_pct ?: 0.0,
                discountAmt = this.discount_amt ?: 0.0,
                lineTotal = this.line_total,
                unitCost = this.unit_cost,
                costAmount = this.cost_amount,
                metadata = this.metadata
            )
        }

        fun SaleLine.toData(): SaleLineDto {
            return SaleLineDto(
                product_id = this.productId,
                product_code = this.productCode,
                product_name = this.productName,
                qty = this.qty,
                unit_price = this.unitPrice,
                discount_pct = this.discountPct,
                discount_amt = this.discountAmt,
                line_total = this.lineTotal,
                unit_cost = this.unitCost,
                cost_amount = this.costAmount,
                metadata = this.metadata
            )
        }
    }
}