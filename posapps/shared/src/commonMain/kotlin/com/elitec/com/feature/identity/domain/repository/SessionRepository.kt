package com.elitec.com.feature.identity.domain.repository

import com.elitec.com.feature.identity.domain.entities.Session
import kotlinx.coroutines.flow.Flow

interface SessionRepository {
    fun observeASessionState() : Flow<List<Session>>
    suspend fun saveSession(session: Session)
    suspend fun clearStoredToken() // Clean a session token of store
    suspend fun getTokenSession(): String?
}