package com.elitec.com.feature.identity.domain.caseuse

import com.elitec.com.feature.identity.domain.entities.SessionControl
import com.elitec.com.feature.identity.domain.repository.SessionRepository
import kotlinx.coroutines.flow.Flow

class ObserveSessionCaseUse(
    private val sessions: SessionRepository,
) {
    operator fun invoke(): Flow<SessionControl> = sessions.observeSessionControl()
}
