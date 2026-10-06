package com.elitec.com.feature.pos.domain.entities

/**
 * Línea de venta confirmada (respuesta del backend).
 * Costos y totales de línea los calcula el servidor.
 */
data class SaleLine(
    val productId: String,
    val productCode: String,
    val productName: String,
    val qty: Double,
    val unitPrice: Double,
    val discountPct: Double = 0.0,
    val discountAmt: Double = 0.0,
    val lineTotal: Double = 0.0,
    val unitCost: Double = 0.0,
    val costAmount: Double = 0.0,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String? = null,
)

/** Importe de línea: lineTotal o qty × unitPrice. */
fun SaleLine.effectiveLineTotal(): Double {
    if (lineTotal > 0.0) return lineTotal
    val computed = qty * unitPrice
    return if (computed > 0.0) computed else 0.0
}
