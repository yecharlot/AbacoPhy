package com.elitec.com.feature.identity.di.shared.src.commonMain.kotlin.com.elitec.com.infraestructure.data.database

import androidx.room3.RoomDatabaseConstructor

actual object AbacoDatabaseConstructor :
    RoomDatabaseConstructor<AbacoDataBase> {
    actual override fun initialize(): AbacoDataBase {
        TODO("Not yet implemented")
    }
}