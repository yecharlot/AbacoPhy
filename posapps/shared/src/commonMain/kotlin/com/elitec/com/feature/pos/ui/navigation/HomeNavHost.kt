package com.elitec.com.feature.pos.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.toMutableStateList
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.ui.NavDisplay
import com.elitec.com.feature.pos.ui.screens.NewSaleScreen
import com.elitec.com.feature.pos.ui.screens.SaleDetailScreen
import com.elitec.com.feature.pos.ui.screens.SalesListScreen
import com.elitec.com.feature.pos.ui.screens.StockScreen

/**
 * Navegación interna POS con Navigation 3.
 *
 * Adaptive / list-detail:
 * - Nav3 soporta SceneStrategy (list-detail, two-pane) según ancho.
 * - MVP: un solo pane + back stack. En tablet se puede añadir
 *   ListDetailSceneStrategy sin cambiar [PosRoute] ni ViewModels.
 *
 * Auth NO vive aquí: AppNavHost ya filtró SessionControl.Active.
 */
@Composable
fun HomeNavHost(
    onLogout: () -> Unit,
) {
    val backStack = remember {
        listOf<PosRoute>(PosRoute.SalesList).toMutableStateList()
    }

    fun navigate(route: PosRoute) {
        // Evita apilar el mismo top dos veces
        if (backStack.lastOrNull() == route) return
        backStack.add(route)
    }

    fun replaceTop(route: PosRoute) {
        if (backStack.isNotEmpty()) backStack.removeLastOrNull()
        backStack.add(route)
    }

    NavDisplay(
        backStack = backStack,
        onBack = {
            if (backStack.size > 1) backStack.removeLastOrNull()
        },
        entryProvider = { key ->
            when (key) {
                is PosRoute.SalesList -> NavEntry(key) {
                    SalesListScreen(
                        onOpenSale = { id -> navigate(PosRoute.SaleDetail(id)) },
                        onNewSale = { navigate(PosRoute.NewSale) },
                        onOpenStock = { replaceTop(PosRoute.Stock) },
                        onLogout = onLogout,
                    )
                }
                is PosRoute.SaleDetail -> NavEntry(key) {
                    SaleDetailScreen(
                        saleId = key.saleId,
                        onBack = {
                            if (backStack.size > 1) backStack.removeLastOrNull()
                        },
                    )
                }
                is PosRoute.NewSale -> NavEntry(key) {
                    NewSaleScreen(
                        onBack = {
                            if (backStack.size > 1) backStack.removeLastOrNull()
                        },
                        onRegistered = {
                            // vuelve a lista
                            while (backStack.size > 1) backStack.removeLastOrNull()
                        },
                    )
                }
                is PosRoute.Stock -> NavEntry(key) {
                    StockScreen(
                        onBackToSales = { replaceTop(PosRoute.SalesList) },
                        onLogout = onLogout,
                    )
                }
            }
        },
    )
}
