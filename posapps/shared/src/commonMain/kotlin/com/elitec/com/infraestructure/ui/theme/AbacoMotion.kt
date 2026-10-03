package com.elitec.com.infraestructure.ui.theme

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween

/** motion-fast web ≈ 160ms ease-out */
object AbacoMotion {
    const val FastMs = 160
    const val MediumMs = 280
    const val SlowMs = 420

    fun <T> fast() = tween<T>(durationMillis = FastMs, easing = FastOutSlowInEasing)
    fun <T> medium() = tween<T>(durationMillis = MediumMs, easing = FastOutSlowInEasing)
    fun <T> slow() = tween<T>(durationMillis = SlowMs, easing = FastOutSlowInEasing)
}
