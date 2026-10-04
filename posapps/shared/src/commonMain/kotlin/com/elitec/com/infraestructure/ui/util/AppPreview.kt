package com.elitec.com.infraestructure.ui.util

import androidx.compose.runtime.Composable
import com.elitec.com.infraestructure.ui.appThemeConfig.AbacoMaterialExpressiveTheme

@Composable
fun AppLightPreview(
    content: @Composable () -> Unit,
) {
    AbacoMaterialExpressiveTheme(
        isDarkTheme = false
    ) {
        content()
    }
}

@Composable
fun AppNightPreview(
    content: @Composable () -> Unit,
) {
    AbacoMaterialExpressiveTheme(
        isDarkTheme = true
    ) {
        content()
    }
}