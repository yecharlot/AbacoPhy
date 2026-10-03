package com.elitec.com.feature.identity.domain.entities

/**
 * Estado reactivo de sesión (ventaja KMP frente al store “plano” de web).
 * La UI Compose observa un Flow<SessionControl>.
 */
sealed class SessionControl {
    data object Bootstrapping : SessionControl()
    data object NoSession : SessionControl()
    data class Active(val session: Session) : SessionControl()
    data class Revoked(val reason: String) : SessionControl()
}
