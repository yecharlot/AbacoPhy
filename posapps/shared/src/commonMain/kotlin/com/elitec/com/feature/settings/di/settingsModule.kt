package com.elitec.com.feature.settings.di

import com.elitec.com.feature.settings.domain.ProbeApiConnection
import com.elitec.com.feature.settings.ui.viewmodel.InitialSetupViewModel
import com.elitec.com.feature.settings.ui.viewmodel.SettingsViewModel
import com.elitec.com.infraestructure.network.ApiConfig
import com.elitec.com.infraestructure.settings.AppSettingsRepository
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val settingsModule = module {
    single {
        val api = ApiConfig()
        get<AppSettingsRepository>().getBaseUrl()?.let { api.update(it) }
        api
    }
    factory { ProbeApiConnection(http = get()) }
    viewModel { InitialSetupViewModel(get(), get(), get()) }
    viewModel { SettingsViewModel(get(), get(), get()) }
}
