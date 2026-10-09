package com.elitec.com.infraestructure.settings

import com.elitec.com.infraestructure.network.ApiConfig
import java.util.prefs.Preferences

class JvmAppSettingsRepository : AppSettingsRepository {
    private val prefs: Preferences = Preferences.userRoot().node("com/elitec/abacopos/settings")

    override fun getBaseUrl(): String? {
        val raw = prefs.get(KEY_BASE_URL, null) ?: return null
        return ApiConfig.normalizeBaseUrl(raw).takeIf { it.isNotBlank() }
    }

    override fun setBaseUrl(url: String) {
        prefs.put(KEY_BASE_URL, ApiConfig.normalizeBaseUrl(url))
        prefs.flush()
    }

    override fun clearBaseUrl() {
        prefs.remove(KEY_BASE_URL)
        prefs.flush()
    }

    override fun getTheme(): AppThemePreference =
        AppThemePreference.fromStorage(prefs.get(KEY_THEME, null))

    override fun setTheme(theme: AppThemePreference) {
        prefs.put(KEY_THEME, theme.name)
        prefs.flush()
    }

    companion object {
        private const val KEY_BASE_URL = "base_url"
        private const val KEY_THEME = "theme"
    }
}
