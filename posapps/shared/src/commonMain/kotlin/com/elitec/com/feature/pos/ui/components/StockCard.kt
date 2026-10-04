package com.elitec.com.feature.pos.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialExpressiveTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
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
    modifier: Modifier = Modifier
) {
    Card(
        elevation = CardDefaults.cardElevation(
            defaultElevation = 5.dp,
            hoveredElevation = 8.dp
        ),
        modifier = modifier
    ) {
        Row {
            Surface(
                color = AppTheme.materialColors.error,
                shape = RoundedCornerShape(20.dp)
            ) {
                Icon(
                    tint = AppTheme.materialColors.onError,
                    modifier = Modifier.padding(5.dp),
                    imageVector = icon,
                    contentDescription = "Icon"
                )
            }
            /*Column {

            }*/
        }
    }
}

@Preview
@Composable
fun StockCardOutPreview() {
    val stockList = listOf(
        LocalStock("test1", "test1", "Product test 1", 0.0),
        LocalStock("test2", "test2", "Product test 2", 0.0),
        LocalStock("test3", "test3", "Product test 3", 0.0),
    )
    MaterialExpressiveTheme {
        StockCard(
            icon = Icons.Default.Stop,
            tittle = "Agotados",
            subTittle = "${stockList.size} productos",
            stockList = stockList,
            stockState = StockStates.OUT,
            modifier = Modifier.fillMaxWidth()
        )
    }
}