package com.elitec.com.infraestructure.ui.navigation

/**
 * Destinos de arranque de la app POS.
 * Nav3 usa las keys del back stack; data object/class como rutas.
 */
sealed interface AppRoute {
    data object Splash : AppRoute
    data object Login : AppRoute
    data object Home : AppRoute
}
