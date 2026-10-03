package com.elitec.com.feature.catalog.domain.caseuse

import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.catalog.domain.repository.CatalogRepository

class GetProductsCaseUse(
    private val repository: CatalogRepository,
) {
    suspend operator fun invoke(): Result<List<Product>> = runCatching {
        repository.getProducts()
    }
}
