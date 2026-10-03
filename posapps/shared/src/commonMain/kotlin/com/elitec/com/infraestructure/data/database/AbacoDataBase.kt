@file:Suppress("EXPECT_ACTUAL_CLASSIFIERS_ARE_IN_BETA_WARNING")

package com.elitec.com.infraestructure.data.database

import androidx.room3.ConstructedBy
import androidx.room3.Database
import androidx.room3.RoomDatabase
import androidx.room3.RoomDatabaseConstructor
import androidx.room3.TypeConverters
import com.elitec.com.feature.catalog.data.dao.ProductDao
import com.elitec.com.feature.catalog.data.dto.ProductDto
import com.elitec.com.feature.identity.data.dao.SessionDao
import com.elitec.com.feature.identity.data.dto.SessionEntity
import com.elitec.com.feature.pos.data.dao.SaleDao
import com.elitec.com.feature.pos.data.dao.SaleTypeConverters
import com.elitec.com.feature.pos.data.dto.SaleDto
import com.elitec.com.feature.warehouse.data.dao.WarehouseDao
import com.elitec.com.feature.warehouse.data.dto.SalesUnitEntity
import com.elitec.com.feature.warehouse.data.dto.UnitStockEntity

@TypeConverters(SaleTypeConverters::class)
@Database(
    entities = [
        SaleDto::class,
        SessionEntity::class,
        ProductDto::class,
        SalesUnitEntity::class,
        UnitStockEntity::class,
    ],
    version = 2,
)
@ConstructedBy(AbacoDatabaseConstructor::class)
abstract class AbacoDataBase : RoomDatabase() {
    abstract fun getSalesDao(): SaleDao
    abstract fun getSessionDao(): SessionDao
    abstract fun getProductDao(): ProductDao
    abstract fun getWarehouseDao(): WarehouseDao
}

@Suppress("KotlinNoActualForExpect")
expect object AbacoDatabaseConstructor : RoomDatabaseConstructor<AbacoDataBase> {
    override fun initialize(): AbacoDataBase
}
