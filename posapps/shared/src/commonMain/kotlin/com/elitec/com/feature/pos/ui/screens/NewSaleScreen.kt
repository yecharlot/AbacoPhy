package com.elitec.com.feature.pos.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.elitec.com.infraestructure.ui.theme.AbacoColors

/** Placeholder nueva venta — solo valida ruta Nav3. */
@Composable
fun NewSaleScreen(
    onBack: () -> Unit,
    onRegistered: () -> Unit,
) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        TextButton(onClick = onBack) { Text("← Cancelar") }
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Nueva venta",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = AbacoColors.Cyan,
        )
        Spacer(Modifier.height(16.dp))
        Text(
            text = "Formulario completo en siguiente iteración.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = onRegistered,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Simular registro y volver")
        }
    }
}
