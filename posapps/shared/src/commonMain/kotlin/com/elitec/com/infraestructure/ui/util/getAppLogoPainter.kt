package com.elitec.com.infraestructure.ui.util

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.painter.Painter
import org.jetbrains.compose.resources.painterResource

@Composable
fun getAppLogoPainter() : Painter {
    return painterResource(Res.drawable.abacus_color_icon)
}