package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository

class GetSaleByIdCaseUse (
    private val repository: SalesRepository
) {
    suspend operator fun invoke(saleId: String): Result<Sale> {
        when {
            saleId.isEmpty() -> {
                return Result.failure(IllegalArgumentException("El ID de la venta es requerido"))
            }
        }
        return Result.success(repository.getSalesById(saleId) ?: throw Exception ("No se ha podido obtener las ventas"))
    }
}