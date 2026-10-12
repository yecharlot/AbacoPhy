package com.elitec.com.infraestructure.settings

/**
 * Persistencia local de preferencias de app (no Room).
 * Android: SharedPreferences · Desktop/JVM: Preferences API.
 */
interface AppSettingsRepository {
    fun getBaseUrl(): String?
    fun setBaseUrl(url: String)
    fun clearBaseUrl()

    fun getTheme(): AppThemePreference
    fun setTheme(theme: AppThemePreference)
}
