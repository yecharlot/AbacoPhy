package com.elitec.com.infraestructure.data.database

import androidx.room3.RoomDatabaseConstructor

actual object AbacoDatabaseConstructor : RoomDatabaseConstructor<AbacoDataBase> {
    actual override fun initialize(): AbacoDataBase {
        return getRoomDatabase(getDatabaseBuilder(AppContextHolder.requireContext()))
    }
}
