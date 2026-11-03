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

    /**
     * UUID estable de esta instalación/terminal.
     * Se envía en X-AbacoPhy-Client-Id en todas las peticiones.
     */
    fun getOrCreateClientInstanceId(): String

    /** Etiqueta de app: pos-desktop | pos-android → header X-AbacoPhy-Client */
    fun getClientPlatform(): String
}
