package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository

/** Lista todas las ventas del tenant (GET /pos/sales). */
class ListSalesCaseUse(
    private val repository: SalesRepository,
) {
    suspend operator fun invoke(): Result<List<Sale>> = runCatching {
        repository.getSales()
    }
}
