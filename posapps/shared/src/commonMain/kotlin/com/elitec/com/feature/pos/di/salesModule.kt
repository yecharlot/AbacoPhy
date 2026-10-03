package com.elitec.com.feature.pos.di

import com.elitec.com.feature.pos.data.dataSource.LocalSalesDataSource
import com.elitec.com.feature.pos.data.dataSource.RemoteSalesDataSource
import com.elitec.com.feature.pos.data.repository.SaleRepositoryImpl
import com.elitec.com.feature.pos.domain.caseuse.GetSaleByIdCaseUse
import com.elitec.com.feature.pos.domain.caseuse.ListSalesByPOSCaseUse
import com.elitec.com.feature.pos.domain.caseuse.ListSalesCaseUse
import com.elitec.com.feature.pos.domain.caseuse.LoadPosSnapshotCaseUse
import com.elitec.com.feature.pos.domain.caseuse.ObserveSalesFlowCaseUse
import com.elitec.com.feature.pos.domain.caseuse.RegisterSaleCaseUse
import com.elitec.com.feature.pos.domain.repository.SalesRepository
import com.elitec.com.feature.pos.ui.viewmodel.SalesViewModel
import com.elitec.com.infraestructure.data.database.AbacoDataBase
import org.koin.core.module.dsl.viewModel
import org.koin.core.qualifier.named
import org.koin.dsl.module

val salesModule = module {
    single { get<AbacoDataBase>().getSalesDao() }
    single { LocalSalesDataSource(get()) }
    single {
        RemoteSalesDataSource(
            http = get(),
            baseUrl = get(named("apiBaseUrl")),
            tokenProvider = get(named("authTokenProvider")),
        )
    }
    single<SalesRepository> { SaleRepositoryImpl(get(), get()) }

    factory { ListSalesCaseUse(get()) }
    factory { ListSalesByPOSCaseUse(get()) }
    factory { ObserveSalesFlowCaseUse(get()) }
    factory { RegisterSaleCaseUse(get()) }
    factory { GetSaleByIdCaseUse(get()) }
    factory { LoadPosSnapshotCaseUse(get(), get(), get()) }

    viewModel {
        SalesViewModel(
            observeSales = get(),
            listSalesByPos = get(),
            registerSale = get(),
            getSaleById = get(),
            loadPosSnapshot = get(),
        )
    }
}
