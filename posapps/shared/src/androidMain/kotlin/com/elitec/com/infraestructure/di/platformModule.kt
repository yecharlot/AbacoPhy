package com.elitec.com.infraestructure.di

import com.elitec.com.infraestructure.data.database.AppContextHolder
import com.elitec.com.infraestructure.data.database.getDatabaseBuilder
import com.elitec.com.infraestructure.data.database.getRoomDatabase
import org.koin.core.module.Module
import org.koin.core.qualifier.named
import org.koin.dsl.module

actual val platformModule: Module = module {
    single {
        getRoomDatabase(getDatabaseBuilder(AppContextHolder.requireContext()))
    }
    // Emulador Android → host machine
    single(named("apiBaseUrl")) {
        "http://10.0.2.2:8090/api/v1"
    }
}
