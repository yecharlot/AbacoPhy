package com.elitec.com.feature.pos.domain.entities

import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.warehouse.domain.entities.SalesUnit
import com.elitec.com.feature.warehouse.domain.entities.UnitStock

/**
 * Equivalente a posStore.loadAll() de la web:
 * ventas + productos + unidades/stock en paralelo lógico.
 */
data class PosSnapshot(
    val sales: List<Sale>,
    val products: List<Product>,
    val units: List<SalesUnit>,
    val unitStocks: List<UnitStock>,
)