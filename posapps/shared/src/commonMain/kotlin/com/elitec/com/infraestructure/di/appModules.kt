package com.elitec.com.infraestructure.di

import com.elitec.com.feature.catalog.di.catalogModule
import com.elitec.com.feature.identity.di.identityModule
import com.elitec.com.feature.pos.di.salesModule
import com.elitec.com.feature.warehouse.di.warehouseModule
import org.koin.core.context.startKoin
import org.koin.core.module.Module
import org.koin.dsl.KoinAppDeclaration

/**
 * Orden de módulos POS:
 * 1. platform  — DB, Context, overrides de apiBaseUrl
 * 2. infra     — HttpClient
 * 3. identity  — sesión + authTokenProvider
 * 4. catalog / warehouse / sales
 */
fun posAppModules(): List<Module> = listOf(
    platformModule,
    infraModule,
    identityModule,
    catalogModule,
    warehouseModule,
    salesModule,
)

/**
 * Inicializa Koin una sola vez al arrancar la app.
 *
 * @param appDeclaration extras de plataforma (p.ej. androidLogger, androidContext)
 */
fun initKoin(appDeclaration: KoinAppDeclaration = {}) {
    startKoin {
        appDeclaration()
        modules(posAppModules())
    }
}
