package com.elitec.com

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.foundation.Image
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.elitec.com.infraestructure.ui.appThemeConfig.AbacoMaterialExpressiveTheme
import com.elitec.com.infraestructure.ui.navigation.AppNavHost
import org.jetbrains.compose.resources.painterResource

@Composable
@Preview
fun App() {
    AbacoMaterialExpressiveTheme(isDarkTheme = isSystemInDarkTheme()) {
        AppNavHost()
    }
}
