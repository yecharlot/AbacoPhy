package com.elitec.com

import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import com.elitec.com.infraestructure.di.initKoin

fun main() {
    initKoin()
    application {
        Window(
            onCloseRequest = ::exitApplication,
            title = "ÁbacoPOS",
        ) {
            App()
        }
    }
}
