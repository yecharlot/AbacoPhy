package com.elitec.com.infraestructure.data.database

import android.content.Context

/**
 * Contexto de aplicación para Room sin depender de koin-android en common.
 * [install] desde [com.elitec.com.AbacoPosApp.onCreate].
 */
object AppContextHolder {
    @Volatile
    private var appContext: Context? = null

    fun install(context: Context) {
        appContext = context.applicationContext
    }

    fun requireContext(): Context =
        appContext
            ?: error(
                "AppContextHolder no inicializado. " +
                    "Llama AppContextHolder.install(this) en Application.onCreate antes de initKoin.",
            )
}
