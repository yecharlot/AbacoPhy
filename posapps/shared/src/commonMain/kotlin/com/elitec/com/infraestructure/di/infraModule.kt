package com.elitec.com.infraestructure.di

import com.elitec.com.infraestructure.data.database.getHttpClient
import com.elitec.com.infraestructure.settings.AppSettingsRepository
import org.koin.dsl.module

/**
 * Infra común. AbacoDataBase lo provee [platformModule] (no se crea aquí).
 * HttpClient depende de [AppSettingsRepository] para el ID de terminal.
 */
val infraModule = module {
    single { getHttpClient(get<AppSettingsRepository>()) }
}
