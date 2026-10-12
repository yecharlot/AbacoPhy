package com.elitec.com

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.elitec.com.feature.settings.ui.viewmodel.ThemeController
import com.elitec.com.infraestructure.settings.AppSettingsRepository
import com.elitec.com.infraestructure.settings.AppThemePreference
import com.elitec.com.infraestructure.ui.appThemeConfig.AbacoMaterialExpressiveTheme
import com.elitec.com.infraestructure.ui.navigation.AppNavHost
import com.elitec.com.infraestructure.ui.theme.abacoDarkColorScheme
import com.elitec.com.infraestructure.ui.theme.abacoLightColorScheme
import com.gursimar.composive.responsive.configuration.responsiveConfiguration
import com.gursimar.composive.responsive.theme.AppTheme
import com.gursimar.composive.responsive.theme.ComposiveTheme
import org.koin.compose.koinInject

@Composable
@Preview
fun App() {
    val settings: AppSettingsRepository = koinInject()
    var themePref by remember { mutableStateOf(settings.getTheme()) }
    DisposableEffect(Unit) {
        val unsub = ThemeController.subscribe { themePref = it }
        onDispose { unsub() }
    }
    val dark = when (themePref) {
        AppThemePreference.SYSTEM -> isSystemInDarkTheme()
        AppThemePreference.LIGHT -> false
        AppThemePreference.DARK -> true
    }

    AbacoMaterialExpressiveTheme(isDarkTheme = dark) {
        ComposiveTheme(
            configuration = responsiveConfiguration {
                withCustomMaterialColors(
                    light = abacoLightColorScheme(),
                    dark = abacoDarkColorScheme(),
                )
                withMaterialTheme()
            },
        ) {
            Surface(
                color = AppTheme.materialColors.background,
                modifier = Modifier.fillMaxSize(),
            ) {
                AppNavHost()
            }
        }
    }
}
