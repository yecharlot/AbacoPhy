package com.elitec.com.infraestructure.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/**
 * Radios alineados con tokens web:
 * sm 10 · md 16 · lg 22 · xl 28 · pill 999
 */
val AbacoShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

val AbacoPillShape = RoundedCornerShape(999.dp)
