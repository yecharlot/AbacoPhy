package com.elitec.com.infraestructure.ui.responsive

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Clasificación de ancho de ventana (Material3 Window Size Class).
 * Compact < 600dp · Medium < 840dp · Expanded ≥ 840dp.
 */
enum class WindowWidthSizeClass {
    Compact,
    Medium,
    Expanded,
}

enum class WindowHeightSizeClass {
    Compact,
    Medium,
    Expanded,
}

@Immutable
data class WindowSizeClass(
    val widthSizeClass: WindowWidthSizeClass,
    val heightSizeClass: WindowHeightSizeClass,
    val widthDp: Dp,
    val heightDp: Dp,
) {
    val isLandscape: Boolean get() = widthDp > heightDp
    val isPortrait: Boolean get() = !isLandscape
}

/**
 * Layout de producto alineado al antiguo DeviceConfiguration de composive,
 * derivado solo de WindowSizeClass + orientación.
 */
enum class AppDeviceLayout {
    MobilePortrait,
    MobileLandscape,
    TabletPortrait,
    TabletLandscape,
    Desktop,
}

fun WindowSizeClass.toAppDeviceLayout(): AppDeviceLayout = when (widthSizeClass) {
    WindowWidthSizeClass.Expanded -> AppDeviceLayout.Desktop
    WindowWidthSizeClass.Medium ->
        if (isLandscape) AppDeviceLayout.TabletLandscape else AppDeviceLayout.TabletPortrait
    WindowWidthSizeClass.Compact ->
        if (isLandscape) AppDeviceLayout.MobileLandscape else AppDeviceLayout.MobilePortrait
}

/**
 * Calcula [WindowSizeClass] a partir del tamaño real de la ventana (CMP common).
 * No depende de librerías de terceros.
 */
@Composable
fun calculateWindowSizeClass(): WindowSizeClass {
    val windowInfo = LocalWindowInfo.current
    val density = LocalDensity.current
    val widthPx = windowInfo.containerSize.width
    val heightPx = windowInfo.containerSize.height
    return remember(widthPx, heightPx, density) {
        val widthDp = with(density) { widthPx.toDp() }
        val heightDp = with(density) { heightPx.toDp() }
        WindowSizeClass(
            widthSizeClass = when {
                widthDp < 600.dp -> WindowWidthSizeClass.Compact
                widthDp < 840.dp -> WindowWidthSizeClass.Medium
                else -> WindowWidthSizeClass.Expanded
            },
            heightSizeClass = when {
                heightDp < 480.dp -> WindowHeightSizeClass.Compact
                heightDp < 900.dp -> WindowHeightSizeClass.Medium
                else -> WindowHeightSizeClass.Expanded
            },
            widthDp = widthDp,
            heightDp = heightDp,
        )
    }
}

@Composable
fun rememberAppDeviceLayout(): AppDeviceLayout {
    val wsc = calculateWindowSizeClass()
    return remember(wsc) { wsc.toAppDeviceLayout() }
}
