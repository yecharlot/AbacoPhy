package com.elitec.com.infraestructure.di

import com.elitec.com.infraestructure.data.database.AbacoDataBase
import com.elitec.com.infraestructure.data.database.AbacoDatabaseConstructor
import com.elitec.com.infraestructure.data.database.getHttpClient
import com.elitec.com.infraestructure.data.database.getRoomDatabase
import io.ktor.util.reflect.instanceOf
import org.koin.dsl.module

val infraModule = module {
    // Data instances
    single { getHttpClient() } // Remote
    single { AbacoDatabaseConstructor.initialize() } // Local
    single {  }

}