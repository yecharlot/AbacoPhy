package com.elitec.com

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.elitec.com.infraestructure.ui.navigation.AppNavHost
import com.elitec.com.infraestructure.ui.theme.abacoDarkColorScheme
import com.elitec.com.infraestructure.ui.theme.abacoLightColorScheme
import com.gursimar.composive.responsive.configuration.responsiveConfiguration
import com.gursimar.composive.responsive.theme.AppTheme
import com.gursimar.composive.responsive.theme.ComposiveTheme

@Composable
@Preview
fun App() {

    ComposiveTheme(
        configuration = responsiveConfiguration {
            withCustomMaterialColors(
                light = abacoLightColorScheme(),
                dark = abacoDarkColorScheme()
            )
            withMaterialTheme()
        }
    ) {
        Surface(
            color = AppTheme.materialColors.background,
            modifier = Modifier.fillMaxSize()
        ) {
            AppNavHost()
        }

    }
   /* AbacoMaterialExpressiveTheme(isDarkTheme = isSystemInDarkTheme()) {
        AppNavHost()
    } */
}
