package com.elitec.com.feature.pos.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

enum class PosNavItem { Menu, Sales, Stock, Settings }

@Composable
fun PosSideNav(
    selected: PosNavItem,
    onSelect: (PosNavItem) -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.width(200.dp).fillMaxHeight(),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(Modifier.padding(12.dp)) {
            Text(
                "Ábaco POS",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(16.dp))
            listOf(
                PosNavItem.Menu to "Menú",
                PosNavItem.Sales to "Ventas",
                PosNavItem.Stock to "Stock",
                PosNavItem.Settings to "Ajustes",
            ).forEach { (item, label) ->
                NavigationDrawerItem(
                    label = { Text(label) },
                    selected = selected == item,
                    onClick = { onSelect(item) },
                )
            }
            Spacer(Modifier.weight(1f))
            NavigationDrawerItem(
                label = { Text("Cerrar sesión") },
                selected = false,
                onClick = onLogout,
            )
        }
    }
}
