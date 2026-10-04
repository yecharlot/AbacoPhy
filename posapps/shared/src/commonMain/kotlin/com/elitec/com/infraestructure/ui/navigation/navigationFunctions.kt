package com.elitec.com.infraestructure.ui.navigation

import androidx.navigation3.runtime.NavBackStack
import androidx.navigation3.runtime.NavKey

fun NavBackStack<NavKey>.navigateBack() {
    if (this.isEmpty()) return
    removeLastOrNull()
}

fun NavBackStack<NavKey>.navigateBackTo(destination: NavKey) {
    if (this.isEmpty()) return
    removeLastOrNull()

    if(destination !in this) return

    while (isNotEmpty() && last() != destination) {
        removeLastOrNull()
    }
}

fun NavBackStack<NavKey>.navigateTo(destination: NavKey) {
    add(destination)
}