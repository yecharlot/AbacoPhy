package com.elitec.com.infraestructure.di

import com.elitec.com.infraestructure.data.database.AppContextHolder
import com.elitec.com.infraestructure.data.database.getDatabaseBuilder
import com.elitec.com.infraestructure.data.database.getRoomDatabase
import com.elitec.com.infraestructure.settings.AndroidAppSettingsRepository
import com.elitec.com.infraestructure.settings.AppSettingsRepository
import org.koin.core.module.Module
import org.koin.dsl.module

actual val platformModule: Module = module {
    single {
        getRoomDatabase(getDatabaseBuilder(AppContextHolder.requireContext()))
    }
    single<AppSettingsRepository> {
        AndroidAppSettingsRepository(AppContextHolder.requireContext())
    }
}
