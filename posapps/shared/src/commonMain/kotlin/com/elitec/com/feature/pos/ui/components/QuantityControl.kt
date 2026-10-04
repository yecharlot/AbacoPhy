package com.elitec.com.feature.pos.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun QuantityControl(
    qty: Double,
    onInc: () -> Unit,
    onDec: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onDec, enabled = qty > 0) {
            Text("−", style = MaterialTheme.typography.titleMedium)
        }
        Text(
            text = if (qty == 0.0) "0" else qty.toInt().toString(),
            modifier = Modifier.widthIn(min = 28.dp),
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.labelLarge,
        )
        IconButton(onClick = onInc) {
            Text("+", style = MaterialTheme.typography.titleMedium)
        }
    }
}
