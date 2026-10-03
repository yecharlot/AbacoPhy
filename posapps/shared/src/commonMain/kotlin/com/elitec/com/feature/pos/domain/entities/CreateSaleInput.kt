package com.elitec.com.feature.pos.domain.entities

/**
 * Entrada de registro de venta (alineada con web CreateSaleInput / POST /pos/sales).
 * El backend genera id, number, totales, costos y descuenta stock.
 */
data class CreateSaleInput(
    val unitId: String? = null,
    val seller: String? = null,
    val date: String? = null,
    val note: String? = null,
    val lines: List<CreateSaleLineInput>,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String? = null,
) {
    init {
        require(lines.isNotEmpty()) { "Al menos una línea de venta es requerida" }
    }
}
