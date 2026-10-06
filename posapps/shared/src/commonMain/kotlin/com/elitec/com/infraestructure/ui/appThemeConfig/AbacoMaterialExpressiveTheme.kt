package com.elitec.com.infraestructure.ui.appThemeConfig

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialExpressiveTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import com.elitec.com.infraestructure.ui.theme.AbacoShapes
import com.elitec.com.infraestructure.ui.theme.AbacoTypography
import com.elitec.com.infraestructure.ui.theme.abacoDarkColorScheme
import com.elitec.com.infraestructure.ui.theme.abacoLightColorScheme

/**
 * Tema ÁbacoPhy + Material3 Expressive.
 * Dark por defecto (producto); light opcional vía sistema o [isDarkTheme].
 */
@Composable
fun AbacoMaterialExpressiveTheme(
    isDarkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (isDarkTheme) abacoDarkColorScheme() else abacoLightColorScheme()

    MaterialExpressiveTheme(
        colorScheme = colorScheme,
        typography = AbacoTypography,
        shapes = AbacoShapes,
        content = content,
    )
}
