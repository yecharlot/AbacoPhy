package com.elitec.com.feature.pos.ui.screens

import androidx.compose.runtime.Composable
import com.elitec.com.feature.identity.ui.viewmodel.HomeSessionViewModel
import com.elitec.com.feature.pos.ui.navigation.HomeNavHost
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun HomeScreen(
    sessionVm: HomeSessionViewModel = koinViewModel(),
) {
    HomeNavHost(onLogout = { sessionVm.logout() })
}
