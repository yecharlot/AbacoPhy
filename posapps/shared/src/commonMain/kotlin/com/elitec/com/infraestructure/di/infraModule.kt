package com.elitec.com.infraestructure.di

import com.elitec.com.infraestructure.data.database.getHttpClient
import org.koin.core.qualifier.named
import org.koin.dsl.module

/**
 * Infra común. AbacoDataBase lo provee [platformModule] (no se crea aquí).
 */
val infraModule = module {
    single { getHttpClient() }

    /** Override en platformModule si hace falta (emulador / prod). */
    single(named("apiBaseUrl")) {
        "http://127.0.0.1:8080/api/v1"
    }
}
