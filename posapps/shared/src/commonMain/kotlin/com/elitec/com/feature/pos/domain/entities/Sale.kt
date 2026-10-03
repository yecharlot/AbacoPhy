package com.elitec.com.feature.pos.domain.entities

data class Sale (
    val id: String,
    val number: Double,
    val date: String,
    val unitId: String,
    val unitName: String,
    val seller: String,
    val lines: List<SaleLine>,
    val subTotal: Double,
    val discount: Double,
    val total: Double,
    val costTotal: Double,
    val currency: String,
    val status: String,
    val note: String,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String? = null
) {
    init {
        require(this.id.isNotEmpty()) { "El ID de la venta es requerido" }
        require(this.number > 0) { "El número de la venta debe ser mayor a cero" }
        require(this.total > 0) { "El total de la venta debe ser mayor a cero" }
        require(this.costTotal > 0) { "El total de costos de la venta debe ser mayor a cero" }
    }
}