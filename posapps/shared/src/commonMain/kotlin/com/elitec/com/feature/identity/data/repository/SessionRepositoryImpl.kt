package com.elitec.com.feature.identity.data.repository

import com.elitec.com.feature.identity.data.dao.SessionDao
import com.elitec.com.feature.identity.data.dto.JsonViewsModules
import com.elitec.com.feature.identity.data.dto.toDomain
import com.elitec.com.feature.identity.data.dto.toEntity
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.entities.SessionControl
import com.elitec.com.feature.identity.domain.repository.SessionRepository
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Un token en tabla session_active (id = 1).
 * No se observa Room en paralelo de forma que pise validación:
 * los cambios de estado se publican explícitamente tras save/clear/bootstrap.
 */
class SessionRepositoryImpl(
    private val dao: SessionDao,
    private val json: JsonViewsModules = JsonViewsModules(),
) : SessionRepository {

    private val _sessionState = MutableStateFlow<SessionControl>(SessionControl.Reading)
    override val sessionState: StateFlow<SessionControl> = _sessionState.asStateFlow()

    override fun markReading() {
        _sessionState.value = SessionControl.Reading
        AbacoLog.step(LogCategory.AUTH, "Session", "Reading")
    }

    override suspend fun saveSession(session: Session) {
        dao.clear()
        dao.save(session.toEntity(json))
        _sessionState.value = SessionControl.Active(session)
        AbacoLog.step(
            LogCategory.AUTH,
            "Session",
            "Active",
            "userId=${session.user.id} username=${session.user.username} metadata=${session.user.metadata} unitIds=${session.user.assignedUnitIds()}",
        )
    }

    override suspend fun clearSession() {
        dao.clear()
        _sessionState.value = SessionControl.NoSession
        AbacoLog.step(LogCategory.AUTH, "Session", "NoSession")
    }

    override suspend fun getActiveToken(): String? =
        dao.get()?.token?.takeIf { it.isNotBlank() }

    override suspend fun getStoredSession(): Session? {
        val entity = dao.get() ?: return null
        if (entity.token.isBlank()) return null
        return entity.toDomain(json)
    }
}
