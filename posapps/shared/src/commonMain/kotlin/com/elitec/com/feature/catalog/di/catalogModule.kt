package com.elitec.com.feature.catalog.di

import com.elitec.com.feature.catalog.data.dataSource.LocalCatalogDataSource
import com.elitec.com.feature.catalog.data.dataSource.RemoteCatalogDataSource
import com.elitec.com.feature.catalog.data.repository.CatalogRepositoryImpl
import com.elitec.com.feature.catalog.domain.caseuse.GetProductsCaseUse
import com.elitec.com.feature.catalog.domain.caseuse.ObserveProductsCaseUse
import com.elitec.com.feature.catalog.domain.repository.CatalogRepository
import com.elitec.com.feature.catalog.ui.viewmodel.CatalogViewModel
import com.elitec.com.infraestructure.data.database.AbacoDataBase
import org.koin.core.module.dsl.viewModel
import org.koin.core.qualifier.named
import org.koin.dsl.module

val catalogModule = module {
    single { get<AbacoDataBase>().getProductDao() }
    single { LocalCatalogDataSource(get()) }
    single {
        RemoteCatalogDataSource(
            http = get(),
            apiConfig = get(),
            tokenProvider = get(named("authTokenProvider")),
        )
    }
    single<CatalogRepository> { CatalogRepositoryImpl(get(), get()) }

    factory { GetProductsCaseUse(get()) }
    factory { ObserveProductsCaseUse(get()) }

    viewModel { CatalogViewModel(get()) }
}
