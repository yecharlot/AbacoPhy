package com.elitec.com.infraestructure.di

import com.elitec.com.feature.catalog.di.catalogModule
import com.elitec.com.feature.identity.di.identityModule
import com.elitec.com.feature.pos.di.salesModule
import com.elitec.com.feature.settings.di.settingsModule
import com.elitec.com.feature.stats.di.statsModule
import com.elitec.com.feature.warehouse.di.warehouseModule
import com.elitec.com.infraestructure.logging.initAbacoLogging
import org.koin.core.context.startKoin
import org.koin.core.module.Module
import org.koin.dsl.KoinAppDeclaration

fun posAppModules(): List<Module> = listOf(
    platformModule,
    infraModule,
    settingsModule,
    identityModule,
    catalogModule,
    warehouseModule,
    salesModule,
    statsModule,
)

/**
 * Arranque de la app: logging primero, luego Koin.
 */
fun initKoin(appDeclaration: KoinAppDeclaration = {}) {
    initAbacoLogging()
    startKoin {
        appDeclaration()
        modules(posAppModules())
    }
}
