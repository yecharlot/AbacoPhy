package com.elitec.com.infraestructure.settings

enum class AppThemePreference {
    SYSTEM,
    LIGHT,
    DARK,
    ;

    companion object {
        fun fromStorage(raw: String?): AppThemePreference =
            entries.firstOrNull { it.name.equals(raw?.trim(), ignoreCase = true) } ?: SYSTEM
    }
}
