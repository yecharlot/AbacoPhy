package com.elitec.com.infraestructure.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInHorizontally
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.elitec.com.infraestructure.ui.uiModels.NavButton
import com.gursimar.composive.responsive.theme.AppTheme
import kotlinx.coroutines.delay
import kotlin.time.Duration.Companion.milliseconds
/* ------------------------------------------------------------------ */
/*  NavRail                                                            */
/* ------------------------------------------------------------------ */

@Composable
fun NavRail(
    sessionName: String,
    modifier: Modifier = Modifier,
    navButtonsList: List<NavButton> = listOf(),
    onLogout: () -> Unit,
    /** Se invoca cuando termina la animación de entrada (stagger hacia contenido). */
    onEntranceComplete: (() -> Unit)? = null,
) {
    var selectedNavItem by rememberSaveable { mutableStateOf("Principal") }
    var visible by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        visible = true
        delay(180.milliseconds)
        onEntranceComplete?.invoke()
    }

    // Animación de entrada: se mantiene idéntica a la original.
    AnimatedVisibility(
        visible = visible,
        enter = slideInHorizontally(
            initialOffsetX = { -it / 3 },
            animationSpec = tween(200),
        ) + fadeIn(animationSpec = tween(200)),
    ) {
        val colors = AppTheme.materialColors

        Surface(
            modifier = modifier
                .width(228.dp)
                .fillMaxHeight(),
            shape = RoundedCornerShape(28.dp),
            color = colors.surfaceContainer,
            tonalElevation = 3.dp,
            shadowElevation = 6.dp,
            border = BorderStroke(1.dp, colors.outlineVariant.copy(alpha = 0.4f)),
        ) {
            // Degradado suave de acento en la parte superior
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                colors.primary.copy(alpha = 0.10f),
                                Color.Transparent,
                            ),
                            endY = 600f,
                        )
                    )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(AppTheme.dimensions.cardSpacing),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // ---------- Cabecera ----------
                    AppLogoBox(
                        userName = sessionName,
                        logoSize = 32.dp,
                        elementSeparation = 10.dp,
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp),
                    )

                    HorizontalDivider(color = colors.outlineVariant.copy(alpha = 0.5f))

                    // ---------- Items (scroll propio; el logout queda fijo abajo) ----------
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        itemsIndexed(navButtonsList, key = { _, b -> b.text }) { index, navButton ->
                            // Entrada escalonada de cada item
                            var shown by remember { mutableStateOf(false) }
                            LaunchedEffect(Unit) {
                                delay(120L + index * 45L)
                                shown = true
                            }

                            AnimatedVisibility(
                                visible = shown,
                                enter = fadeIn(tween(220)) +
                                        slideInHorizontally(tween(220)) { -it / 4 },
                            ) {
                                NavButtonItem(
                                    isSelected = navButton.text == selectedNavItem,
                                    iconSize = 22.dp,
                                    onSelectedPage = {
                                        selectedNavItem = navButton.text
                                        navButton.onClick()
                                    },
                                    navButton = navButton,
                                )
                            }
                        }
                    }

                    // ---------- Cerrar sesión ----------
                    LogoutButton(onLogout = onLogout)
                }
            }
        }
    }
}
