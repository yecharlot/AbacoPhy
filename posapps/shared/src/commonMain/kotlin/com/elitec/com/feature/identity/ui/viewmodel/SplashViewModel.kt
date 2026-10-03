package com.elitec.com.feature.identity.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.identity.domain.caseuse.RestoreSessionCaseUse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class SplashDestination {
    data object Loading : SplashDestination()
    data object Home : SplashDestination()
    data object Login : SplashDestination()
}

/**
 * Política de arranque:
 * 1. ¿Hay token en cache local?
 * 2. ¿Sigue válido? (GET /auth/me vía RestoreSession)
 * → Home si ambas OK; Login en cualquier fallo.
 */
class SplashViewModel(
    private val restoreSession: RestoreSessionCaseUse,
) : ViewModel() {

    private val _destination = MutableStateFlow<SplashDestination>(SplashDestination.Loading)
    val destination: StateFlow<SplashDestination> = _destination.asStateFlow()

    init {
        resolveSession()
    }

    fun resolveSession() {
        viewModelScope.launch {
            _destination.value = SplashDestination.Loading
            val result = restoreSession()
            _destination.value = when {
                result.isSuccess && result.getOrNull() != null -> SplashDestination.Home
                else -> SplashDestination.Login
            }
        }
    }
}
