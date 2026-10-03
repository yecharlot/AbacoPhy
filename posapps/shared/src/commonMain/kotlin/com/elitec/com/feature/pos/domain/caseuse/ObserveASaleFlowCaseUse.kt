package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository
import kotlinx.coroutines.flow.Flow

class ObserveASaleFlowCaseUse (
    private val _repository: SalesRepository
) {
    suspend operator fun invoke(): Flow<List<Sale>> = _repository.observeSalesFlow()
}