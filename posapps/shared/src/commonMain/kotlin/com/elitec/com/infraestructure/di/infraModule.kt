package com.elitec.com.infraestructure.di

import com.elitec.com.infraestructure.data.database.getHttpClient
import org.koin.core.qualifier.named
import org.koin.dsl.module

/**
 * Infra común. AbacoDataBase lo provee [platformModule] (no se crea aquí).
 */
val infraModule = module {
    single { getHttpClient() }
}
