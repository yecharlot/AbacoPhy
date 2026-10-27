package com.elitec.abaco_launcher

import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application

fun main() = application {
    Window(
        onCloseRequest = ::exitApplication,
        title = "Abaco Launcher",
    ) {
        App()
    }
}