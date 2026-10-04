package com.elitec.com.infraestructure.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

/** ColorScheme Material3 mapeado a tokens ÁbacoPhy (web). */
fun abacoDarkColorScheme() = darkColorScheme(

    // Brand / accent
    primary = Color(0xFFC084FC),
    onPrimary = Color(0xFF16171D),
    primaryContainer = Color(0x26C084FC),
    onPrimaryContainer = Color(0xFFC084FC),

    // Secondary / tertiary
    secondary = Color(0xFFC084FC),
    onSecondary = Color(0xFF16171D),
    secondaryContainer = Color(0x26C084FC),
    onSecondaryContainer = Color(0xFFC084FC),

    tertiary = Color(0xFFC084FC),
    onTertiary = Color(0xFFF3F4F6),

    // Background
    background = Color(0xFF16171D),
    onBackground = Color(0xFFF3F4F6),

    // Surfaces
    surface = Color(0xFF16171D),
    onSurface = Color(0xFFF3F4F6),

    surfaceVariant = Color(0xFF1F2028),
    onSurfaceVariant = Color(0xFF9CA3AF),

    // Borders
    outline = Color(0xFF2E303A),
    outlineVariant = Color(0xFF1F2028),

    // Error
    //
    // El tema original no define un color de error.
    // Se reutiliza el accent para no introducir una nueva tonalidad.
    error = Color(0xFFC25350),
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0x26FFC25350),
    onErrorContainer = Color(0xFFFFFFFF),

    // Inverse
    inverseSurface = Color(0xFFF3F4F6),
    inverseOnSurface = Color(0xFF16171D),
    inversePrimary = Color(0xFFAA3BFF),

    // Material 3 surface hierarchy
    surfaceBright = Color(0xFF1F2028),
    surfaceDim = Color(0xFF16171D),

    surfaceContainer = Color(0xFF1F2028),
    surfaceContainerHigh = Color(0xFF2E303A),
    surfaceContainerHighest = Color(0xFF2E303A),
    surfaceContainerLow = Color(0xFF16171D),
    surfaceContainerLowest = Color(0xFF16171D),
)


fun abacoLightColorScheme() = lightColorScheme(

    // Brand / accent
    primary = Color(0xFFAA3BFF),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0x1AAA3BFF),
    onPrimaryContainer = Color(0xFFAA3BFF),

    // Secondary / tertiary
    secondary = Color(0xFFAA3BFF),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0x1AAA3BFF),
    onSecondaryContainer = Color(0xFFAA3BFF),

    tertiary = Color(0xFFAA3BFF),
    onTertiary = Color(0xFFFFFFFF),

    // Background
    background = Color(0xFFFFFFFF),
    onBackground = Color(0xFF08060D),

    // Surfaces
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF08060D),

    surfaceVariant = Color(0xFFF4F3EC),
    onSurfaceVariant = Color(0xFF6B6375),

    // Borders
    outline = Color(0xFFE5E4E7),
    outlineVariant = Color(0xFFF4F3EC),

    // Error
    //
    // El tema original no define un color de error.
    error = Color(0xFFC25350),
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0x26FFC25350),
    onErrorContainer = Color(0xFFFFFFFF),

    // Inverse
    inverseSurface = Color(0xFF08060D),
    inverseOnSurface = Color(0xFFFFFFFF),
    inversePrimary = Color(0xFFC084FC),

    // Material 3 surface hierarchy
    surfaceBright = Color(0xFFFFFFFF),
    surfaceDim = Color(0xFFF4F3EC),

    surfaceContainer = Color(0xFFFFFFFF),
    surfaceContainerHigh = Color(0xFFF4F3EC),
    surfaceContainerHighest = Color(0xFFE5E4E7),
    surfaceContainerLow = Color(0xFFFFFFFF),
    surfaceContainerLowest = Color(0xFFFFFFFF),
)