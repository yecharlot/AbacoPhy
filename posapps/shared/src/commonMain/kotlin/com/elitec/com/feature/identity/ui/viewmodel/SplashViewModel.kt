package com.elitec.com.feature.identity.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.identity.domain.caseuse.RestoreSessionCaseUse
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlin.time.TimeSource
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class SplashDestination {
    data object Loading : SplashDestination()
    data object Home : SplashDestination()
    data object Login : SplashDestination()
}

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
            AbacoLog.step(LogCategory.AUTH, "Splash", "start")
            val mark = TimeSource.Monotonic.markNow()

            val result = runCatching { restoreSession() }.getOrElse {
                AbacoLog.e(LogCategory.AUTH, "restoreSession excepción", it)
                Result.failure(it)
            }

            val elapsed = mark.elapsedNow().inWholeMilliseconds
            val remaining = MIN_SPLASH_MS - elapsed
            if (remaining > 0) delay(remaining)

            _destination.value = when {
                result.isSuccess && result.getOrNull() != null -> {
                    AbacoLog.step(LogCategory.AUTH, "Splash", "session OK → Home")
                    SplashDestination.Home
                }
                else -> {
                    AbacoLog.step(
                        LogCategory.AUTH,
                        "Splash",
                        "sin sesión → Login",
                        result.exceptionOrNull()?.message,
                    )
                    SplashDestination.Login
                }
            }
        }
    }

    companion object {
        const val MIN_SPLASH_MS = 1_000L
    }
}
