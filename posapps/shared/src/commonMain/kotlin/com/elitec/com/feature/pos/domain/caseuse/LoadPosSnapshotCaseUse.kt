package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.catalog.domain.repository.CatalogRepository
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository
import com.elitec.com.feature.warehouse.domain.entities.SalesUnit
import com.elitec.com.feature.warehouse.domain.entities.UnitStock
import com.elitec.com.feature.warehouse.domain.repository.WarehouseRepository

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

class LoadPosSnapshotCaseUse(
    private val sales: SalesRepository,
    private val catalog: CatalogRepository,
    private val warehouse: WarehouseRepository,
) {
    suspend operator fun invoke(unitId: String? = null): Result<PosSnapshot> = runCatching {
        val products = runCatching { catalog.getProducts() }.getOrDefault(emptyList())
        val unitsSnap = runCatching { warehouse.getSalesUnits() }.getOrDefault(
            com.elitec.com.feature.warehouse.domain.entities.SalesUnitsSnapshot(emptyList(), emptyList()),
        )
        val salesList =
            if (unitId.isNullOrBlank()) sales.getSales()
            else sales.getSalesByUnitId(unitId)
        PosSnapshot(
            sales = salesList,
            products = products,
            units = unitsSnap.units,
            unitStocks = unitsSnap.stocks.let { stocks ->
                if (unitId.isNullOrBlank()) stocks
                else stocks.filter { it.unitId == unitId }
            },
        )
    }
}
