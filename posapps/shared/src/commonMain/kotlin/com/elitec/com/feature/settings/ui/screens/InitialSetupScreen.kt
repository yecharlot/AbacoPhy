package com.elitec.com.feature.settings.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.settings.ui.viewmodel.InitialSetupViewModel
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun InitialSetupScreen(
    onConfigured: () -> Unit,
    viewModel: InitialSetupViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showManualUrl by remember { mutableStateOf(false) }
    val busy = state.testing || state.discovering

    LaunchedEffect(Unit) { viewModel.searchServers(onConfigured) }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Conectar con AbacoPhy", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Buscando automáticamente servidores AbacoPhy en la red local. Mantenga el teléfono y el servidor en la misma Wi-Fi.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp, bottom = 20.dp),
        )
        Button(
            onClick = { viewModel.searchServers(onConfigured) },
            enabled = !busy,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (state.discovering) CircularProgressIndicator(modifier = Modifier.padding(end = 8.dp), strokeWidth = 2.dp)
            Text(if (state.discovering) "Buscando servidores…" else "Buscar servidores de nuevo")
        }

        if (state.discoveredServers.isNotEmpty()) {
            Text("Servidores encontrados", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 18.dp, bottom = 8.dp))
            state.discoveredServers.forEach { server ->
                Button(
                    onClick = { viewModel.selectServer(server, onConfigured) },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
                ) { Text("${server.name} · ${server.host}:${server.port}") }
            }
        }
        state.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 12.dp).fillMaxWidth())
        }
        state.successMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 12.dp).fillMaxWidth())
        }
        TextButton(onClick = { showManualUrl = !showManualUrl }, modifier = Modifier.padding(top = 18.dp)) {
            Text(if (showManualUrl) "Ocultar configuración manual" else "¿No aparece? Introducir URL manualmente")
        }
        if (showManualUrl) {
            Text(
                "Use esta opción si la red bloquea mDNS o el servidor no aparece.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            OutlinedTextField(
                value = state.urlInput,
                onValueChange = viewModel::onUrlChange,
                label = { Text("URL base de la API") },
                placeholder = { Text("http://192.168.x.x:8090/api/v1") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                enabled = !busy,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Done),
            )
            Button(
                onClick = { viewModel.testAndSave(onConfigured) },
                enabled = !busy && state.urlInput.isNotBlank(),
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            ) {
                if (state.testing) CircularProgressIndicator(modifier = Modifier.padding(end = 8.dp), strokeWidth = 2.dp)
                Text(if (state.testing) "Probando URL…" else "Probar URL y conectar")
            }
        }
    }
}
