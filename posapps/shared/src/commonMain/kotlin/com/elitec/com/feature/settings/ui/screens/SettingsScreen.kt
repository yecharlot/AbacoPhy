package com.elitec.com.feature.settings.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.settings.ui.viewmodel.SettingsViewModel
import com.elitec.com.infraestructure.settings.AppThemePreference
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Configuración", style = MaterialTheme.typography.headlineSmall)

        Text("Tema", style = MaterialTheme.typography.titleMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ThemeChip("Sistema", AppThemePreference.SYSTEM, state.theme, viewModel::onThemeSelected)
            ThemeChip("Claro", AppThemePreference.LIGHT, state.theme, viewModel::onThemeSelected)
            ThemeChip("Oscuro", AppThemePreference.DARK, state.theme, viewModel::onThemeSelected)
        }

        Text("Servidor API", style = MaterialTheme.typography.titleMedium)
        Text(
            "Activa: ${state.activeUrl.ifBlank { "—" }}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedTextField(
            value = state.urlInput,
            onValueChange = viewModel::onUrlChange,
            label = { Text("URL base") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.testing,
        )
        state.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        state.info?.let {
            Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
        }
        Button(
            onClick = viewModel::testAndSaveUrl,
            enabled = !state.testing && state.urlInput.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (state.testing) "Probando…" else "Probar y guardar URL")
        }
    }
}

@Composable
private fun ThemeChip(
    label: String,
    value: AppThemePreference,
    selected: AppThemePreference,
    onSelect: (AppThemePreference) -> Unit,
) {
    FilterChip(
        selected = selected == value,
        onClick = { onSelect(value) },
        label = { Text(label) },
    )
}
