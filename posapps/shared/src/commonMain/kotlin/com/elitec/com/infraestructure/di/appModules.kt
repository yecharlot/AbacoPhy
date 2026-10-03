package com.elitec.com.infraestructure.di

import com.elitec.com.feature.catalog.di.catalogModule
import com.elitec.com.feature.identity.di.identityModule
import com.elitec.com.feature.pos.di.salesModule
import com.elitec.com.feature.warehouse.di.warehouseModule

/** Módulos necesarios para la app POS nativa. */
fun posAppModules() = listOf(
    infraModule,
    identityModule,
    catalogModule,
    warehouseModule,
    salesModule,
)
