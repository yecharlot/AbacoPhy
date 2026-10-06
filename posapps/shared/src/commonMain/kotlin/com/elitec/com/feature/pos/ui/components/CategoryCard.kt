package com.elitec.com.feature.pos.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun CategoryCard(
    name: String,
    count: Int,
    selected: Boolean,
    onClick: () -> Unit,
    compact: Boolean = false,
) {
    val colors = if (selected) {
        CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
            contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
        )
    } else {
        CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
            contentColor = MaterialTheme.colorScheme.onSurface,
        )
    }
    Card(
        modifier = Modifier
            .widthIn(min = if (compact) 96.dp else 120.dp)
            .clickable(onClick = onClick),
        colors = colors,
        shape = MaterialTheme.shapes.medium,
    ) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
            Text(name.ifBlank { "Sin cat." }, style = MaterialTheme.typography.titleSmall)
            Text("$count", style = MaterialTheme.typography.bodySmall)
        }
    }
}
