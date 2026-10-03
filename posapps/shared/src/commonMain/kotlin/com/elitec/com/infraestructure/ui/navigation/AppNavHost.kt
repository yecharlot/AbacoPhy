package com.elitec.com.infraestructure.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.toMutableStateList
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.ui.NavDisplay
import com.elitec.com.feature.identity.ui.screens.LoginScreen
import com.elitec.com.feature.identity.ui.screens.SplashScreen
import com.elitec.com.feature.pos.ui.screens.HomeScreen

/**
 * Navegación de arranque con Navigation 3 (NavDisplay + back stack).
 * Estrategia de escena por defecto (single pane); lista para SceneStrategy adaptativa.
 */
@Composable
fun AppNavHost() {
    val backStack = remember {
        listOf<AppRoute>(AppRoute.Splash).toMutableStateList()
    }

    fun replaceWith(route: AppRoute) {
        backStack.clear()
        backStack.add(route)
    }

    NavDisplay(
        backStack = backStack,
        onBack = {
            if (backStack.size > 1) backStack.removeLastOrNull()
        },
        entryProvider = { key ->
            when (key) {
                is AppRoute.Splash -> NavEntry(key) {
                    SplashScreen(
                        onGoHome = { replaceWith(AppRoute.Home) },
                        onGoLogin = { replaceWith(AppRoute.Login) },
                    )
                }
                is AppRoute.Login -> NavEntry(key) {
                    LoginScreen(
                        onLoginSuccess = { replaceWith(AppRoute.Home) },
                    )
                }
                is AppRoute.Home -> NavEntry(key) {
                    HomeScreen(
                        onLogout = { replaceWith(AppRoute.Login) },
                    )
                }
                else -> error("Ruta desconocida: $key")
            }
        },
    )
}
