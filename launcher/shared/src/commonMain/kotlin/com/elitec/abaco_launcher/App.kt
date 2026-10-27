package com.elitec.abaco_launcher

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.OrchestratorState
import com.elitec.abaco_launcher.feature.orchestrator.ui.OrchestratorScreen

// Paleta Catppuccin Macchiato para MaterialTheme
private val AbacoColorScheme = darkColorScheme(
    primary              = Color(0xFF89B4FA),   // blue
    onPrimary            = Color(0xFF1E2030),
    primaryContainer     = Color(0xFF252638),
    onPrimaryContainer   = Color(0xFFCDD6F4),
    secondary            = Color(0xFFCBA6F7),   // mauve
    onSecondary          = Color(0xFF1E2030),
    tertiary             = Color(0xFFA6E3A1),   // green
    onTertiary           = Color(0xFF1E2030),
    error                = Color(0xFFF38BA8),   // red
    onError              = Color(0xFF1E2030),
    errorContainer       = Color(0xFF3E1E27),
    onErrorContainer     = Color(0xFFF38BA8),
    background           = Color(0xFF1E2030),
    onBackground         = Color(0xFFCDD6F4),
    surface              = Color(0xFF181926),
    onSurface            = Color(0xFFCDD6F4),
    surfaceVariant       = Color(0xFF252638),
    onSurfaceVariant     = Color(0xFF7F849C),
    outline              = Color(0xFF363850),
    outlineVariant       = Color(0xFF2E2F45),
    surfaceContainerLow  = Color(0xFF181926),
    surfaceContainer     = Color(0xFF1E2030),
    surfaceContainerHigh = Color(0xFF252638),
    surfaceContainerHighest = Color(0xFF13141F),
)

@Composable
fun App(
    onRun: suspend (
        preferredPort: Int?,
        onState: (OrchestratorState) -> Unit,
        onLog: (String) -> Unit,
    ) -> OrchestratorState = { _, _, _ -> OrchestratorState() },
    onStop: () -> Unit = {},
    onOpenBrowser: (String) -> Unit = {},
) {
    MaterialTheme(colorScheme = AbacoColorScheme) {
        OrchestratorScreen(
            onRun = onRun,
            onStop = onStop,
            onOpenBrowser = onOpenBrowser,
        )
    }
}

@Preview
@Composable
private fun AppPreview() {
    App()
}
