package com.elitec.com.feature.catalog.domain.caseuse

import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.catalog.domain.repository.CatalogRepository
import kotlinx.coroutines.flow.Flow

class ObserveProductsCaseUse(
    private val repository: CatalogRepository,
) {
    operator fun invoke(): Flow<List<Product>> = repository.observeProducts()
}
