package com.elitec.com.feature.identity.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.identity.domain.caseuse.BootstrapSessionCaseUse
import com.elitec.com.feature.identity.domain.entities.SessionControl
import com.elitec.com.feature.identity.domain.repository.SessionRepository
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Expone [sessionState] a la navegación.
 * Al crearse ejecuta bootstrap una sola vez.
 */
class SessionViewModel(
    private val sessions: SessionRepository,
    private val bootstrap: BootstrapSessionCaseUse,
) : ViewModel() {

    val sessionState: StateFlow<SessionControl> = sessions.sessionState

    init {
        viewModelScope.launch {
            bootstrap()
        }
    }
}
