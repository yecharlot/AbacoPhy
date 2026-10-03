package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository

class RegisterSelectCaseUse (
    private val repository: SalesRepository
) {
    suspend operator fun invoke(sale: Sale): Result<Unit> {
        if (sale.lines.isEmpty() ) {
            return Result.failure(IllegalArgumentException("Al menos una línea de venta es requerida"))
        }
        return Result.success(Unit)
    }
}