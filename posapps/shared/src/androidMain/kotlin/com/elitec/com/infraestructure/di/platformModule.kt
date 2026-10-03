package com.elitec.com.infraestructure.di

import com.elitec.com.infraestructure.data.database.getDatabaseBuilder
import com.elitec.com.infraestructure.data.database.getRoomDatabase
import org.koin.dsl.module

val platformModule = module {
    single { getRoomDatabase(getDatabaseBuilder(get())) }
}