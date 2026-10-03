package com.elitec.com.feature.identity.data.repository

import com.elitec.com.feature.identity.data.dao.SessionDao
import com.elitec.com.feature.identity.data.dto.SessionDto.Companion.toData
import com.elitec.com.feature.identity.data.dto.SessionDto.Companion.toDomain
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.repository.SessionRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class SessionRepositoryImpl(
    private val sessionDao: SessionDao
): SessionRepository {
    override fun observeASessionState(): Flow<List<Session>> =
        sessionDao.getAllAsFlow().map { sessionList ->
            sessionList.map { sessionDto -> sessionDto.toDomain() }
        }

    override suspend fun saveSession(session: Session) {
        sessionDao.saveOrModify(session.toData())
    }

    override suspend fun clearStoredToken() {
        sessionDao.deleteSession()
    }

    override suspend fun getTokenSession(): String? {
        TODO("Not yet implemented")
    }
}