package com.elitec.com.feature.pos.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.elitec.com.feature.pos.ui.models.LocalStock
import com.elitec.com.feature.pos.ui.uiStates.StockStates
import com.gursimar.composive.responsive.theme.AppTheme

@Composable
fun StockCard(
    icon: ImageVector,
    tittle: String,
    subTittle: String,
    stockList: List<LocalStock>,
    stockState: StockStates,
    loading: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val accent = when (stockState) {
        StockStates.OUT -> MaterialTheme.colorScheme.error
        StockStates.LOW -> MaterialTheme.colorScheme.tertiary
        StockStates.OK -> MaterialTheme.colorScheme.primary
    }
    val onAccent = when (stockState) {
        StockStates.OUT -> MaterialTheme.colorScheme.onError
        StockStates.LOW -> MaterialTheme.colorScheme.onTertiary
        StockStates.OK -> MaterialTheme.colorScheme.onPrimary
    }
    val tintSurface = accent.copy(alpha = 0.12f)

    Card(
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp, hoveredElevation = 6.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        shape = RoundedCornerShape(18.dp),
        modifier = modifier,
    ) {
        Column(Modifier.padding(AppTheme.dimensions.cardPadding)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(color = tintSurface, shape = RoundedCornerShape(14.dp)) {
                    Icon(
                        imageVector = icon,
                        contentDescription = tittle,
                        tint = accent,
                        modifier = Modifier.padding(10.dp).size(22.dp),
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    AnimatedContent(
                        targetState = stockList.size,
                        transitionSpec = { fadeIn() togetherWith fadeOut() },
                        label = "stockCount",
                    ) { n ->
                        Text(
                            text = n.toString(),
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = accent,
                        )
                    }
                    Text(
                        tittle,
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        subTittle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            Box(Modifier.fillMaxWidth().height(148.dp)) {
                when {
                    loading -> CircularProgressIndicator(
                        Modifier.align(Alignment.Center).size(26.dp),
                        strokeWidth = 2.dp,
                        color = accent,
                    )
                    stockList.isEmpty() -> Text(
                        "Sin productos",
                        Modifier.align(Alignment.Center),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(stockList, key = { row -> row.posId + "|" + row.productId }) { item ->
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    item.productName,
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.weight(1f),
                                    maxLines = 1,
                                )
                                Text(
                                    item.qty.toInt().toString(),
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = accent,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
