package com.elitec.com.infraestructure.ui.components

import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInHorizontally
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.elitec.com.infraestructure.ui.uiModels.NavButton
import com.gursimar.composive.responsive.theme.AppTheme
import kotlinx.coroutines.delay
import kotlin.time.Duration.Companion.milliseconds

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

    androidx.compose.animation.AnimatedVisibility(
        visible = visible,
        enter = slideInHorizontally(
            initialOffsetX = { -it / 3 },
            animationSpec = tween(200),
        ) + fadeIn(animationSpec = tween(200)),
    ) {
        Surface(
            modifier = modifier
                .width(228.dp)
                .fillMaxHeight(),
            shape = RoundedCornerShape(22.dp),
            color = MaterialTheme.colorScheme.surfaceContainerHigh,
            tonalElevation = 3.dp,
            shadowElevation = 6.dp,
        ) {
            Column(
                verticalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier
                    .fillMaxHeight()
                    .padding(
                        vertical = AppTheme.dimensions.cardSpacing,
                        horizontal = AppTheme.dimensions.cardSpacing,
                    ),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    AppLogoBox(
                        userName = sessionName,
                        logoSize = 32.dp,
                        elementSeparation = 6.dp,
                    )
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        itemsIndexed(navButtonsList, key = { _, b -> b.text }) { index, navButton ->
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

                TextButton(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Logout,
                            contentDescription = "Logout",
                            tint = MaterialTheme.colorScheme.error,
                        )
                        Text(
                            text = "Cerrar sesión",
                            color = MaterialTheme.colorScheme.error,
                            style = AppTheme.materialTypography.bodyMedium,
                        )
                    }
                }
            }
        }
    }
}
