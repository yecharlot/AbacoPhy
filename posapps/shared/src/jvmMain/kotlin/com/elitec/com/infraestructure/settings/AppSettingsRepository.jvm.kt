package com.elitec.com.infraestructure.settings

import com.elitec.com.infraestructure.network.ApiConfig
import java.util.prefs.Preferences

class JvmAppSettingsRepository : AppSettingsRepository {
    private val prefs: Preferences = Preferences.userRoot().node("com/elitec/abacopos/settings")

    override fun getBaseUrl(): String? {
        val raw = prefs.get(KEY_BASE_URL, null) ?: return null
        val normalized = ApiConfig.normalizeBaseUrl(raw).takeIf { it.isNotBlank() } ?: return null

        // Migración de la configuración antigua de Desktop: 8090 era un puerto fijo
        // de desarrollo. No debe reaparecer como servidor guardado al arrancar.
        // Android usa SharedPreferences independientes, por eso no le afectaba.
        if (normalized.lowercase() in LEGACY_DESKTOP_URLS) {
            prefs.remove(KEY_BASE_URL)
            prefs.flush()
            return null
        }

        if (normalized != raw.trim().trimEnd('/')) {
            prefs.put(KEY_BASE_URL, normalized)
            prefs.flush()
        }
        return normalized
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

        private val LEGACY_DESKTOP_URLS = setOf(
            "http://localhost:8090/api/v1",
            "http://127.0.0.1:8090/api/v1",
        )
    }
}
