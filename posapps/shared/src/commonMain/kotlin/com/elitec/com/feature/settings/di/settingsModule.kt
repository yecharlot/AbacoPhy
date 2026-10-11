package com.elitec.com.feature.settings.di

import com.elitec.com.feature.settings.domain.ProbeApiConnection
import com.elitec.com.feature.settings.ui.viewmodel.InitialSetupViewModel
import com.elitec.com.feature.settings.ui.viewmodel.SettingsViewModel
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import com.elitec.com.infraestructure.network.ApiConfig
import com.elitec.com.infraestructure.network.ServerConnectivityBridge
import com.elitec.com.infraestructure.network.ServerConnectivityGuard
import com.elitec.com.infraestructure.settings.AppSettingsRepository
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val settingsModule = module {
    single {
        val settings = get<AppSettingsRepository>()
        val api = ApiConfig()
        val stored = settings.getBaseUrl()
        if (!stored.isNullOrBlank()) {
            val normalized = ApiConfig.normalizeBaseUrl(stored)
            if (normalized != stored) {
                settings.setBaseUrl(normalized)
                AbacoLog.i(LogCategory.APP, "URL base migrada: '$stored' → '$normalized'")
            }
            api.update(normalized)
            AbacoLog.i(LogCategory.APP, "ApiConfig baseUrl=${api.baseUrl}")
        }
        api
    }
    factory { ProbeApiConnection(http = get()) }
    single {
        val guard = ServerConnectivityGuard(
            apiConfig = get(),
            probe = get(),
        )
        ServerConnectivityBridge.bind(guard)
        guard
    }
    viewModel { InitialSetupViewModel(get(), get(), get()) }
    viewModel { SettingsViewModel(get(), get(), get()) }
}
