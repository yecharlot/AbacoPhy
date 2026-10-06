package com.elitec.com.feature.catalog.domain.entities

/**
 * Nomenclador de producto (solo lectura operativa en POS).
 * costStd/priceSale pueden venir del API legacy; el nomenclador web ya no los edita.
 */
data class Product(
    val id: String,
    val code: String,
    val name: String,
    val unit: String,
    val category: String,
    val costStd: Double? = null,
    val priceSale: Double? = null,
    val metadata: String? = null,
)

/**
 * Precio operativo para POS: priceSale → costStd → metadata.
 * El nomenclador puede no editar precios; si el API aún los trae, se usan.
 */
fun Product.effectiveUnitPrice(): Double {
    priceSale?.takeIf { it > 0.0 }?.let { return it }
    costStd?.takeIf { it > 0.0 }?.let { return it }
    val raw = metadata?.trim().orEmpty()
    if (raw.isEmpty()) return 0.0
    return runCatching {
        val obj = kotlinx.serialization.json.Json.parseToJsonElement(raw)
            as? kotlinx.serialization.json.JsonObject ?: return@runCatching 0.0
        val keys = listOf("priceSale", "price_sale", "unitPrice", "unit_price", "price")
        for (k in keys) {
            val prim = obj[k] as? kotlinx.serialization.json.JsonPrimitive ?: continue
            val v = prim.content.toDoubleOrNull() ?: continue
            if (v > 0.0) return@runCatching v
        }
        0.0
    }.getOrDefault(0.0)
}
