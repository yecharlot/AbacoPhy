package com.elitec.com.feature.settings.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.settings.domain.ProbeApiConnection
import com.elitec.com.infraestructure.network.ApiConfig
import com.elitec.com.infraestructure.settings.AppSettingsRepository
import com.elitec.com.infraestructure.settings.AppThemePreference
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SettingsUiState(
    val theme: AppThemePreference = AppThemePreference.SYSTEM,
    val urlInput: String = "",
    val activeUrl: String = "",
    val testing: Boolean = false,
    val saving: Boolean = false,
    val error: String? = null,
    val info: String? = null,
)

class SettingsViewModel(
    private val settings: AppSettingsRepository,
    private val apiConfig: ApiConfig,
    private val probe: ProbeApiConnection,
) : ViewModel() {
    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    init {
        reload()
    }

    fun reload() {
        val active = apiConfig.baseUrl.ifBlank { settings.getBaseUrl().orEmpty() }
        _state.update {
            it.copy(
                theme = settings.getTheme(),
                urlInput = active,
                activeUrl = active,
                error = null,
                info = null,
            )
        }
    }

    fun onUrlChange(value: String) {
        _state.update { it.copy(urlInput = value, error = null, info = null) }
    }

    fun onThemeSelected(theme: AppThemePreference) {
        settings.setTheme(theme)
        _state.update { it.copy(theme = theme, info = "Tema guardado") }
        ThemeController.notify(theme)
    }

    fun testAndSaveUrl() {
        val raw = _state.value.urlInput
        val previous = apiConfig.baseUrl
        viewModelScope.launch {
            _state.update { it.copy(testing = true, error = null, info = null) }
            val result = probe.execute(raw)
            result.fold(
                onSuccess = { normalized ->
                    settings.setBaseUrl(normalized)
                    apiConfig.update(normalized)
                    _state.update {
                        it.copy(
                            testing = false,
                            activeUrl = normalized,
                            urlInput = normalized,
                            info = "URL actualizada",
                        )
                    }
                },
                onFailure = { e ->
                    // Conservar URL anterior
                    if (previous.isNotBlank()) {
                        apiConfig.update(previous)
                    }
                    _state.update {
                        it.copy(
                            testing = false,
                            error = e.message ?: "No se pudo validar la URL; se mantiene la anterior",
                            urlInput = previous.ifBlank { it.urlInput },
                        )
                    }
                },
            )
        }
    }
}

/** Notifica cambios de tema a [App] sin acoplar Compose a ViewModel de settings. */
object ThemeController {
    private val listeners = mutableListOf<(AppThemePreference) -> Unit>()

    fun currentFrom(settings: AppSettingsRepository): AppThemePreference = settings.getTheme()

    fun subscribe(listener: (AppThemePreference) -> Unit): () -> Unit {
        listeners += listener
        return { listeners.remove(listener) }
    }

    fun notify(theme: AppThemePreference) {
        listeners.toList().forEach { it(theme) }
    }
}
