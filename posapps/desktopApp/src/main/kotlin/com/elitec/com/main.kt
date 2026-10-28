package com.elitec.com

import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.WindowPosition
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.elitec.com.infraestructure.di.initKoin
import com.elitec.com.infraestructure.ui.appThemeConfig.AbacoMaterialExpressiveTheme
import com.elitec.com.infraestructure.ui.util.getAppLogoPainter

fun main() {
    // JmDNS on Windows can fail configuring multicast on dual-stack sockets
    // with "Invalid argument: setsockopt". Set this before Koin or any
    // networking code initializes the JVM networking stack. Desktop only.
    System.setProperty("java.net.preferIPv4Stack", "true")

    initKoin()
    application {
        val windowState = rememberWindowState(
            position = WindowPosition.Aligned(Alignment.Center),
            size = DpSize(width = 960.dp, height = 720.dp),
        )
        Window(
            state = windowState,
            icon = getAppLogoPainter(),
            onCloseRequest = ::exitApplication,
            title = "ÁbacoPOS",
        ) {
            AbacoMaterialExpressiveTheme {
                App()
            }
        }
    }
}
