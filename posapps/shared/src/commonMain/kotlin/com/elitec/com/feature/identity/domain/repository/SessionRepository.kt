package com.elitec.com.feature.identity.domain.repository

import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.entities.SessionControl
import kotlinx.coroutines.flow.StateFlow

/**
 * Un solo registro de sesión (token) en Room.
 * [sessionState] es el Flow al que reacciona toda la UI.
 */
interface SessionRepository {
    val sessionState: StateFlow<SessionControl>

    /** Fuerza estado Reading (p.ej. al arrancar bootstrap). */
    fun markReading()

    suspend fun saveSession(session: Session)
    suspend fun clearSession()
    suspend fun getActiveToken(): String?
    suspend fun getStoredSession(): Session?
}
