package com.elitec.com.feature.catalog.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.elitec.com.feature.catalog.ui.uiStates.CatalogChargingUiState
import com.gursimar.composive.responsive.theme.AppTheme

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ProductNotificationBox(
    chargingUiState: CatalogChargingUiState,
    modifier: Modifier = Modifier
) {

    val (backgroundColor, textColor) = when (chargingUiState) {
        is CatalogChargingUiState.Idle -> Color.Transparent to Color.Transparent
        is CatalogChargingUiState.Loading -> AppTheme.materialColors.tertiary to AppTheme.materialColors.onTertiary
        is CatalogChargingUiState.ErrorLoading -> AppTheme.materialColors.errorContainer to AppTheme.materialColors.onErrorContainer
        is CatalogChargingUiState.CatalogCharged ->  Color(0xFF549058) to Color(0xFFFFFFFF)
    }

    val animatedBackgroundColor by animateColorAsState(backgroundColor)
    val animatedTextColor by animateColorAsState(textColor)

    val elevation = if(chargingUiState is CatalogChargingUiState.Idle) 0.dp else 5.dp
    val animateElevationAsDp by animateDpAsState(elevation)

    if (chargingUiState !is CatalogChargingUiState.Idle) {
        Surface(
            modifier = modifier,
            color = animatedBackgroundColor,
            shape = RoundedCornerShape(15.dp),
            tonalElevation = animateElevationAsDp,
            shadowElevation = animateElevationAsDp
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(AppTheme.dimensions.contentPaddingSmall),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(
                    AppTheme.dimensions.cardPadding
                )
            ) {
                AnimatedVisibility(
                    enter = fadeIn(tween(delayMillis = 200)),
                    exit = fadeOut(tween(durationMillis = 150)),
                    visible = chargingUiState is CatalogChargingUiState.Loading
                ) {
                    LoadingIndicator(
                        modifier = Modifier.size(25.dp),
                        color = animatedTextColor
                    )
                }
                AnimatedVisibility(
                    enter = fadeIn(tween(delayMillis = 200)),
                    exit = fadeOut(tween(durationMillis = 150)),
                    visible = chargingUiState is CatalogChargingUiState.ErrorLoading
                ) {
                    Icon(
                        modifier = Modifier.size(25.dp),
                        tint = animatedTextColor,
                        imageVector = Icons.Default.Error,
                        contentDescription = "Error"
                    )
                }
                AnimatedVisibility(
                    enter = fadeIn(tween(delayMillis = 200)),
                    exit = fadeOut(tween(durationMillis = 150)),
                    visible = chargingUiState is CatalogChargingUiState.ErrorLoading
                ) {
                    Icon(
                        modifier = Modifier.size(25.dp),
                        tint = animatedTextColor,
                        imageVector = Icons.Default.Error,
                        contentDescription = "Error"
                    )
                }
                Text(
                    text = getChargingProductStateMessage(chargingUiState) ?: "",
                    style = AppTheme.materialTypography.labelMedium,
                    color = animatedTextColor
                )
            }
        }
    }
}

private fun getChargingProductStateMessage(chargingUiState: CatalogChargingUiState): String? =
    when (chargingUiState) {
        is CatalogChargingUiState.Idle -> null
        is CatalogChargingUiState.CatalogCharged -> chargingUiState.message
        is CatalogChargingUiState.ErrorLoading -> chargingUiState.message
        is CatalogChargingUiState.Loading -> chargingUiState.message
    }