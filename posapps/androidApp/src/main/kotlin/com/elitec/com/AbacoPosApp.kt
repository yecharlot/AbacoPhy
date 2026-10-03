package com.elitec.com

import android.app.Application
import com.elitec.com.infraestructure.data.database.AppContextHolder
import com.elitec.com.infraestructure.di.initKoin

/**
 * Application Android: instala contexto y arranca Koin (platform + feature modules).
 */
class AbacoPosApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AppContextHolder.install(this)
        initKoin()
    }
}
