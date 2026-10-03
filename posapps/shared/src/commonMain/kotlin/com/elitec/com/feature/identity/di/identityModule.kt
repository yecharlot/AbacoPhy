package com.elitec.com.feature.identity.di

import com.elitec.com.feature.identity.data.dataSource.RemoteAuthDataSource
import com.elitec.com.feature.identity.data.dto.JsonViewsModules
import com.elitec.com.feature.identity.data.repository.AuthenticationRepositoryImpl
import com.elitec.com.feature.identity.data.repository.SessionRepositoryImpl
import com.elitec.com.feature.identity.domain.caseuse.BootstrapSessionCaseUse
import com.elitec.com.feature.identity.domain.caseuse.LoginCaseUse
import com.elitec.com.feature.identity.domain.caseuse.LogoutCaseUse
import com.elitec.com.feature.identity.domain.caseuse.ObserveSessionCaseUse
import com.elitec.com.feature.identity.domain.caseuse.RestoreSessionCaseUse
import com.elitec.com.feature.identity.domain.repository.AuthRepository
import com.elitec.com.feature.identity.domain.repository.SessionRepository
import com.elitec.com.feature.identity.ui.viewmodel.HomeSessionViewModel
import com.elitec.com.feature.identity.ui.viewmodel.LoginViewModel
import com.elitec.com.feature.identity.ui.viewmodel.SessionViewModel
import com.elitec.com.infraestructure.data.database.AbacoDataBase
import org.koin.core.module.dsl.viewModel
import org.koin.core.qualifier.named
import org.koin.dsl.module

val identityModule = module {
    single { JsonViewsModules() }
    single { get<AbacoDataBase>().getSessionDao() }
    single<SessionRepository> { SessionRepositoryImpl(get(), get()) }

    single {
        RemoteAuthDataSource(
            http = get(),
            baseUrl = get(named("apiBaseUrl")),
        )
    }
    single<AuthRepository> { AuthenticationRepositoryImpl(get(), get()) }

    factory { LoginCaseUse(get(), get()) }
    factory { LogoutCaseUse(get(), get()) }
    factory { BootstrapSessionCaseUse(get(), get()) }
    factory { RestoreSessionCaseUse(get()) }
    factory { ObserveSessionCaseUse(get()) }

    single<suspend () -> String?>(named("authTokenProvider")) {
        val sessions: SessionRepository = get()
        suspend { sessions.getActiveToken() }
    }

    viewModel { SessionViewModel(get(), get()) }
    viewModel { LoginViewModel(get()) }
    viewModel { HomeSessionViewModel(get()) }
}
