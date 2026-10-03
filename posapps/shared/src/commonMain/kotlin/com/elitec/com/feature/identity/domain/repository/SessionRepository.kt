package com.elitec.com.feature.identity.domain.repository

import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.entities.SessionControl
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

interface SessionRepository {
    /** Estado reactivo de sesión para la app. */
    val sessionState: StateFlow<SessionControl>

    fun observeSessionControl(): Flow<SessionControl>

    suspend fun saveSession(session: Session)
    suspend fun clearSession()
    suspend fun getActiveToken(): String?
    suspend fun getActiveSession(): Session?
}
