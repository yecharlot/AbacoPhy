package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository
import kotlinx.coroutines.flow.Flow

/** Observa ventas del cache local (Room). */
class ObserveSalesFlowCaseUse(
    private val repository: SalesRepository,
) {
    operator fun invoke(): Flow<List<Sale>> = repository.observeSalesFlow()
}
