package com.elitec.com.feature.pos.domain.entities

data class SaleLine (
    val productId: String,
    val productCode: String,
    val productName: String,
    val qty: Double,
    val unitPrice: Double,
    val discountPct: Double,
    val discountAmt: Double,
    val lineTotal: Int,
    val unitCost: Double,
    val costAmount: Double,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String? = null
) {
    init {
        require(this.productCode.isNotEmpty()) { "El código del producto es requerido" }
        require(this.productId.isNotEmpty()) { "El ID del producto es requerido" }
        require(this.unitPrice > 0) { "El precio unitario debe ser mayor a cero" }
        require(this.qty > 0) { "La cantidad debe ser mayor a cero" }
        require(this.unitCost > 0) { "El costo unitario debe ser mayor a cero" }
        require(this.lineTotal > 0) { "El total de la línea debe ser mayor a cero" }
    }
}
