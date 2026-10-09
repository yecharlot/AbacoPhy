package com.elitec.com.infraestructure.settings

import android.content.Context
import com.elitec.com.infraestructure.network.ApiConfig

class AndroidAppSettingsRepository(
    context: Context,
) : AppSettingsRepository {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    override fun getBaseUrl(): String? =
        prefs.getString(KEY_BASE_URL, null)?.let { ApiConfig.normalizeBaseUrl(it) }?.takeIf { it.isNotBlank() }

    override fun setBaseUrl(url: String) {
        prefs.edit().putString(KEY_BASE_URL, ApiConfig.normalizeBaseUrl(url)).apply()
    }

    override fun clearBaseUrl() {
        prefs.edit().remove(KEY_BASE_URL).apply()
    }

    override fun getTheme(): AppThemePreference =
        AppThemePreference.fromStorage(prefs.getString(KEY_THEME, null))

    override fun setTheme(theme: AppThemePreference) {
        prefs.edit().putString(KEY_THEME, theme.name).apply()
    }

    companion object {
        private const val PREFS = "abaco_pos_settings"
        private const val KEY_BASE_URL = "base_url"
        private const val KEY_THEME = "theme"
    }
}
