package com.elitec.com.feature.pos.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.toMutableStateList
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.ui.NavDisplay
import com.elitec.com.feature.pos.ui.screens.OrderReviewScreen
import com.elitec.com.feature.pos.ui.screens.PosWorkspaceScreen
import com.elitec.com.feature.pos.ui.screens.SaleDetailScreen
import com.elitec.com.feature.pos.ui.screens.SalesListScreen
import com.elitec.com.feature.pos.ui.screens.StockScreen

@Composable
fun HomeNavHost(
    onLogout: () -> Unit,
) {
    val backStack = remember {
        listOf<PosRoute>(PosRoute.Menu).toMutableStateList()
    }

    fun push(route: PosRoute) {
        if (backStack.lastOrNull() == route) return
        backStack.add(route)
    }

    fun pop() {
        if (backStack.size > 1) backStack.removeLastOrNull()
    }

    fun replaceRoot(route: PosRoute) {
        backStack.clear()
        backStack.add(route)
    }

    NavDisplay(
        backStack = backStack,
        onBack = { pop() },
        entryProvider = { key ->
            when (key) {
                is PosRoute.Menu -> NavEntry(key) {
                    PosWorkspaceScreen(
                        onOpenOrderReview = { push(PosRoute.OrderReview) },
                        onOpenSales = { push(PosRoute.SalesList) },
                        onOpenStock = { push(PosRoute.Stock) },
                        onLogout = onLogout,
                    )
                }
                is PosRoute.OrderReview -> NavEntry(key) {
                    OrderReviewScreen(
                        onBack = { pop() },
                        onPlaced = { replaceRoot(PosRoute.Menu) },
                    )
                }
                is PosRoute.SalesList -> NavEntry(key) {
                    SalesListScreen(
                        onNewSale = { replaceRoot(PosRoute.Menu) },
                        onOpenStock = { push(PosRoute.Stock) },
                        onLogout = onLogout,
                    )
                }
                is PosRoute.SaleDetail -> NavEntry(key) {
                    SaleDetailScreen(
                        saleId = key.saleId,
                        onBack = { pop() },
                    )
                }
                is PosRoute.Stock -> NavEntry(key) {
                    StockScreen(
                        onBackToSales = { pop() },
                        onLogout = onLogout,
                    )
                }
            }
        },
    )
}
