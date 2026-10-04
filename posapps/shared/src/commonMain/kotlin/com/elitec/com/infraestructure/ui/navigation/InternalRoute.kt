package com.elitec.com.infraestructure.ui.navigation

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable
sealed interface InternalRoute: NavKey {
    @Serializable
    data object Home : InternalRoute
    @Serializable
    data object Stock : InternalRoute
    @Serializable
    data object Catalog : InternalRoute
    @Serializable
    data object Statistics : InternalRoute
    @Serializable
    data object Config : InternalRoute
}

