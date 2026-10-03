@file:Suppress("EXPECT_ACTUAL_CLASSIFIERS_ARE_IN_BETA_WARNING")

package com.elitec.com.infraestructure.data.database

import androidx.room3.ConstructedBy
import androidx.room3.Database
import androidx.room3.RoomDatabase
import androidx.room3.RoomDatabaseConstructor
import com.elitec.com.feature.identity.data.dao.SessionDao
import com.elitec.com.feature.identity.data.dto.SessionDto
import com.elitec.com.feature.pos.data.dao.SaleDao
import com.elitec.com.feature.pos.data.dto.SaleDto

@Database(
    entities = [
        SaleDto::class,
        SessionDto::class
               ],
    version = 1
)
@ConstructedBy(AbacoDatabaseConstructor::class)
abstract class AbacoDataBase: RoomDatabase() {
    abstract fun getSalesDao(): SaleDao
    abstract fun getSessionDao(): SessionDao
}

// The Room compiler generates the `actual` implementations.
@Suppress("KotlinNoActualForExpect")
expect object AbacoDatabaseConstructor : RoomDatabaseConstructor<AbacoDataBase> {
    override fun initialize(): AbacoDataBase
}