package com.elitec.com.feature.pos.di

import com.elitec.com.feature.pos.data.dataSource.LocalSalesDataSource
import com.elitec.com.feature.pos.data.dataSource.RemoteSalesDataSource
import com.elitec.com.feature.pos.data.repository.SaleRepositoryImpl
import com.elitec.com.feature.pos.domain.caseuse.GetSaleByIdCaseUse
import com.elitec.com.feature.pos.domain.caseuse.ListSalesByPOSCaseUse
import com.elitec.com.feature.pos.domain.caseuse.ObserveASaleFlowCaseUse
import com.elitec.com.feature.pos.domain.caseuse.RegisterSelectCaseUse
import com.elitec.com.feature.pos.domain.repository.SalesRepository
import com.elitec.com.feature.pos.ui.viewmodel.SalesViewModel
import com.elitec.com.infraestructure.data.database.AbacoDataBase
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val salesModule = module {
    // Data
    single { get<AbacoDataBase>().getSalesDao() }
    single { LocalSalesDataSource(get()) }
    single { RemoteSalesDataSource(get(), get()) }
    single<SalesRepository> { SaleRepositoryImpl(get(), get()) }

    // CaseUse
    factory { GetSaleByIdCaseUse(get()) }
    factory { ListSalesByPOSCaseUse(get()) }
    factory { ObserveASaleFlowCaseUse(get()) }
    factory { RegisterSelectCaseUse(get()) }

    // UI
   viewModel { SalesViewModel(get(), get(), get(), get()) }
}