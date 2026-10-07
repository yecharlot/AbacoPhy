package com.elitec.com.feature.stats.di

import com.elitec.com.feature.stats.ui.viewmodels.StatsViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val statsModule = module {
    viewModel { StatsViewModel(get(), get(), get()) }
}