package com.elitec.com.feature.identity.data.repository

import com.elitec.com.feature.identity.data.dao.SessionDao
import com.elitec.com.feature.identity.data.dto.JsonViewsModules
import com.elitec.com.feature.identity.data.dto.toDomain
import com.elitec.com.feature.identity.data.dto.toEntity
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.entities.SessionControl
import com.elitec.com.feature.identity.domain.repository.SessionRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

class SessionRepositoryImpl(
    private val dao: SessionDao,
    private val json: JsonViewsModules = JsonViewsModules(),
) : SessionRepository {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val _sessionState = MutableStateFlow<SessionControl>(SessionControl.Bootstrapping)
    override val sessionState: StateFlow<SessionControl> = _sessionState.asStateFlow()

    init {
        scope.launch {
            dao.observe().collect { entity ->
                _sessionState.value =
                    if (entity == null || entity.token.isBlank()) SessionControl.NoSession
                    else SessionControl.Active(entity.toDomain(json))
            }
        }
    }

    override fun observeSessionControl(): Flow<SessionControl> =
        dao.observe().map { entity ->
            if (entity == null || entity.token.isBlank()) SessionControl.NoSession
            else SessionControl.Active(entity.toDomain(json))
        }

    override suspend fun saveSession(session: Session) {
        dao.save(session.toEntity(json))
        _sessionState.value = SessionControl.Active(session)
    }

    override suspend fun clearSession() {
        dao.clear()
        _sessionState.value = SessionControl.NoSession
    }

    override suspend fun getActiveToken(): String? = dao.get()?.token?.takeIf { it.isNotBlank() }

    override suspend fun getActiveSession(): Session? =
        dao.get()?.takeIf { it.token.isNotBlank() }?.toDomain(json)
}
