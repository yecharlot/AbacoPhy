package com.elitec.com.feature.pos.domain.entities

/**
 * Venta de mostrador ya persistida.
 * Precios finales, descuento de stock y asientos los aplica el backend (como en web).
 */
data class Sale(
    val id: String,
    /** Código de documento generado por el server (p.ej. VT-…). */
    val number: String,
    val date: String,
    val unitId: String,
    val unitName: String,
    val seller: String,
    val lines: List<SaleLine>,
    val subtotal: Double,
    val discount: Double,
    val total: Double,
    val costTotal: Double,
    val currency: String,
    val status: String,
    val note: String,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String? = null,
) {
    init {
        require(id.isNotEmpty()) { "El ID de la venta es requerido" }
    }
}

/** Total de venta: total del API o suma de líneas. */
fun Sale.effectiveTotal(): Double {
    if (total > 0.0) return total
    val fromLines = lines.sumOf { it.effectiveLineTotal() }
    return if (fromLines > 0.0) fromLines else 0.0
}

fun Sale.effectiveSubtotal(): Double {
    if (subtotal > 0.0) return subtotal
    return lines.sumOf { it.qty * it.unitPrice }
}
