package com.elitec.com.feature.warehouse.di

import com.elitec.com.feature.warehouse.data.dataSource.LocalWarehouseDataSource
import com.elitec.com.feature.warehouse.data.dataSource.RemoteWarehouseDataSource
import com.elitec.com.feature.warehouse.data.repository.WarehouseRepositoryImpl
import com.elitec.com.feature.warehouse.domain.caseuse.GetSalesUnitsCaseUse
import com.elitec.com.feature.warehouse.domain.caseuse.GetWarehouseStockCaseUse
import com.elitec.com.feature.warehouse.domain.caseuse.ObserveUnitStocksCaseUse
import com.elitec.com.feature.warehouse.domain.repository.WarehouseRepository
import com.elitec.com.feature.warehouse.ui.viewmodels.PosStockViewModel
import com.elitec.com.infraestructure.data.database.AbacoDataBase
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.koin.core.module.dsl.viewModel
import org.koin.core.qualifier.named
import org.koin.dsl.module
import org.koin.plugin.module.dsl.viewModel

@OptIn(ExperimentalCoroutinesApi::class)
val warehouseModule = module {
    single { get<AbacoDataBase>().getWarehouseDao() }
    single { LocalWarehouseDataSource(get()) }
    single {
        RemoteWarehouseDataSource(
            http = get(),
            baseUrl = get(named("apiBaseUrl")),
            tokenProvider = get(named("authTokenProvider")),
        )
    }
    single<WarehouseRepository> { WarehouseRepositoryImpl(get(), get()) }
    factory { GetSalesUnitsCaseUse(get()) }
    factory { GetWarehouseStockCaseUse(get()) }
    factory { ObserveUnitStocksCaseUse(get()) }

    viewModel { PosStockViewModel(get(), get(), get(), get()) }
}
