package com.elitec.com

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.foundation.Image
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.elitec.com.infraestructure.ui.appThemeConfig.AbacoMaterialExpressiveTheme
import com.elitec.com.infraestructure.ui.navigation.AppNavHost
import com.elitec.com.infraestructure.ui.theme.abacoDarkColorScheme
import com.elitec.com.infraestructure.ui.theme.abacoLightColorScheme
import com.gursimar.composive.responsive.configuration.ResponsiveConfiguration
import com.gursimar.composive.responsive.configuration.responsiveConfiguration
import com.gursimar.composive.responsive.theme.AppTheme
import com.gursimar.composive.responsive.theme.ComposiveTheme
import org.jetbrains.compose.resources.painterResource

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
