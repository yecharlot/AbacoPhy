package com.elitec.com.feature.identity.domain.entities

/**
 * Única fuente de verdad de autenticación.
 * La UI / navegación reaccionan a este Flow — no navegan por callbacks sueltos.
 *
 * Reading  → Splash (leyendo BD y/o validando token)
 * NoSession → Login
 * Active    → Home (y resto de app autenticada)
 */
sealed class SessionControl {
    /** Leyendo token en BD o validando contra el servidor. */
    data object Reading : SessionControl()

    /** Sin token (o invalidado). */
    data object NoSession : SessionControl()

    /** Sesión válida con un único token en BD. */
    data class Active(val session: Session) : SessionControl()
}
