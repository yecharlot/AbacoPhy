package com.elitec.com.infraestructure.di

import com.elitec.com.infraestructure.data.database.AbacoDatabaseConstructor
import com.elitec.com.infraestructure.data.database.getHttpClient
import org.koin.core.qualifier.named
import org.koin.dsl.module

/**
 * Infra transversal.
 * authTokenProvider lo registra identityModule (sesión real).
 * Si identity no se carga, se puede proveer un stub aquí.
 */
val infraModule = module {
    single { getHttpClient() }
    single { AbacoDatabaseConstructor.initialize() }

    single(named("apiBaseUrl")) {
        "http://127.0.0.1:8080/api/v1"
    }
}
