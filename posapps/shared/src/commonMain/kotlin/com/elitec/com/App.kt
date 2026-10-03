package com.elitec.com

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.elitec.com.infraestructure.ui.appThemeConfig.AbacoMaterialExpressiveTheme
import com.elitec.com.infraestructure.ui.navigation.AppNavHost

@Composable
@Preview
fun App() {
    AbacoMaterialExpressiveTheme(isDarkTheme = isSystemInDarkTheme()) {
        AppNavHost()
    }
}
