package com.elitec.com.infraestructure.data.database

import androidx.room3.Room
import androidx.room3.RoomDatabase
import java.io.File

fun getDatabaseBuilder(): RoomDatabase.Builder<AbacoDataBase> {
    val dbFile = File(System.getProperty("java.io.tmpdir"), "abaco.db")
    return Room.databaseBuilder<AbacoDataBase>(
        name = dbFile.absolutePath,
    )
}