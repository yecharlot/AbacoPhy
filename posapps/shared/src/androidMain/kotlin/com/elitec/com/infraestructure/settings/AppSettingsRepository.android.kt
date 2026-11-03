package com.elitec.com.infraestructure.settings

import android.content.Context
import java.util.UUID
import com.elitec.com.infraestructure.network.ApiConfig

class AndroidAppSettingsRepository(
    context: Context,
) : AppSettingsRepository {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    override fun getBaseUrl(): String? {
        val raw = prefs.getString(KEY_BASE_URL, null) ?: return null
        val normalized = ApiConfig.normalizeBaseUrl(raw).takeIf { it.isNotBlank() } ?: return null
        if (normalized != raw.trim().trimEnd('/')) {
            prefs.edit().putString(KEY_BASE_URL, normalized).apply()
        }
        return normalized
    }

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

    override fun getOrCreateClientInstanceId(): String {
        val existing = prefs.getString(KEY_CLIENT_ID, null)?.trim().orEmpty()
        if (existing.isNotEmpty()) return existing
        val id = UUID.randomUUID().toString()
        prefs.edit().putString(KEY_CLIENT_ID, id).apply()
        return id
    }

    override fun getClientPlatform(): String = "pos-android"

    companion object {

        private const val PREFS = "abaco_pos_settings"
        private const val KEY_BASE_URL = "base_url"
        private const val KEY_CLIENT_ID = "client_instance_id"
        private const val KEY_THEME = "theme"
    }
}
