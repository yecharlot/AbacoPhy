package com.elitec.com.feature.identity.domain.entities

sealed class SessionControl {
    object NoSessionActive: SessionControl()
    data class SessionActive(val session: Session): SessionControl()
    data class RevokeSession(val error: String): SessionControl()
}