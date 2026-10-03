package com.elitec.com.infraestructure.data.database

import android.content.Context
import androidx.room3.Room
import androidx.room3.RoomDatabase

fun getDatabaseBuilder(context: Context): RoomDatabase.Builder<AbacoDataBase> {
    val appContext = context.applicationContext
    val dbFile = appContext.getDatabasePath("abaco.db")
    return Room.databaseBuilder<AbacoDataBase>(
        context = appContext,
        name = dbFile.absolutePath
    )
}