package com.elitec.com.infraestructure.di

import com.elitec.com.infraestructure.data.database.getDatabaseBuilder
import com.elitec.com.infraestructure.data.database.getRoomDatabase
import org.koin.core.module.Module
import org.koin.core.qualifier.named
import org.koin.dsl.module

actual val platformModule: Module = module {
    single {
        getRoomDatabase(getDatabaseBuilder())
    }
    single(named("apiBaseUrl")) {
        "http://127.0.0.1:8090/api/v1"
    }
}
