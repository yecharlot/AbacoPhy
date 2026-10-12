package com.elitec.com.infraestructure.data.database

import androidx.room3.RoomDatabase
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import kotlinx.coroutines.Dispatchers

fun getRoomDatabase(
    builder: RoomDatabase.Builder<AbacoDataBase>,
): AbacoDataBase {
    return builder
        .setDriver(BundledSQLiteDriver())
        .setQueryCoroutineContext(Dispatchers.IO)
        // v3 → v4 añade outbox_ops; en piloto local no hay migraciones formales
        .fallbackToDestructiveMigration(dropAllTables = true)
        .build()
}
