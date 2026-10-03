package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository

/**
 * Lista ventas y filtra por unitId (PDV) en cliente.
 * El API actual no pagina ni filtra por unidad; misma estrategia que la web.
 */
class ListSalesByPOSCaseUse(
    private val repository: SalesRepository,
) {
    suspend operator fun invoke(unitId: String): Result<List<Sale>> = runCatching {
        repository.getSalesByUnitId(unitId)
    }
}
