package com.elitec.com.feature.pos.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.elitec.com.infraestructure.ui.theme.AbacoColors

/** Placeholder stock PDV. */
@Composable
fun StockScreen(
    onBackToSales: () -> Unit,
    onLogout: () -> Unit,
) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        TextButton(onClick = onBackToSales) { Text("← Ventas") }
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Stock PDV",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = AbacoColors.Cyan,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = "Agotados / casi agotados / habilitados — próximo paso.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))
        TextButton(onClick = onLogout) { Text("Cerrar sesión") }
    }
}
