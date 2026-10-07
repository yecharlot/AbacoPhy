package com.elitec.com.feature.catalog.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.catalog.ui.components.ProductItemBox
import com.elitec.com.feature.catalog.ui.components.ProductNotificationBox
import com.elitec.com.feature.catalog.ui.uiStates.CatalogChargingUiState
import com.elitec.com.feature.catalog.ui.viewmodel.CatalogViewModel
import com.gursimar.composive.responsive.core.DeviceConfiguration
import com.gursimar.composive.responsive.core.rememberDeviceConfiguration
import com.gursimar.composive.responsive.theme.AppTheme
import org.koin.compose.viewmodel.koinViewModel

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun CatalogScreen(
    modifier: Modifier = Modifier,
    catalogViewModel: CatalogViewModel = koinViewModel()
) {
    val productCatalogList by catalogViewModel.productFlow.collectAsStateWithLifecycle()
    val chargingUiState by catalogViewModel.productChargingUiState.collectAsStateWithLifecycle()

    val deviceConfiguration = rememberDeviceConfiguration()

    val staggeredGridCellsFixed = when (deviceConfiguration) {
        DeviceConfiguration.MOBILE_PORTRAIT -> StaggeredGridCells.Fixed(1)
        DeviceConfiguration.TABLET_PORTRAIT
            , DeviceConfiguration.MOBILE_LANDSCAPE -> StaggeredGridCells.Fixed(2)
        else -> StaggeredGridCells.Adaptive(minSize = 250.dp)
    }

    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                "Productos en catálogo:",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }

        AnimatedVisibility(
            visible = chargingUiState is CatalogChargingUiState.Loading,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.fillMaxSize()
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    LoadingIndicator(
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        color = MaterialTheme.colorScheme.primary,
                        text = "Cargando productos...",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Normal,
                    )
                }
            }
        }

        AnimatedVisibility(
            visible = chargingUiState is CatalogChargingUiState.Idle,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            AnimatedContent(
                targetState = staggeredGridCellsFixed
            ) { staggeredGridCellsAForUIConfig ->
                LazyVerticalStaggeredGrid(
                    columns = staggeredGridCellsAForUIConfig,
                    verticalItemSpacing = 10.dp,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(productCatalogList) { product ->
                        ProductItemBox(
                            product
                        )
                    }
                }
            }
        }

        AnimatedVisibility(
            visible = chargingUiState is CatalogChargingUiState.ErrorLoading ,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.fillMaxSize()
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Error,
                        contentDescription = "Error",
                        tint = MaterialTheme.colorScheme.error
                    )
                    Text(
                        text = "Error al cargar productos",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Normal,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}