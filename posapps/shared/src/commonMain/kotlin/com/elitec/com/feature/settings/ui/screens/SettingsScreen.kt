package com.elitec.com.feature.settings.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Dns
import androidx.compose.material.icons.rounded.Error
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.NetworkCheck
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.SettingsBrightness
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.settings.ui.viewmodel.SettingsViewModel
import com.elitec.com.infraestructure.settings.AppThemePreference
import com.gursimar.composive.responsive.theme.AppTheme
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val entered = remember { MutableTransitionState(false).apply { targetState = true } }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val wide = maxWidth >= 840.dp
        // En móvil portrait la top bar ya muestra "Configuración": se omite la cabecera.
        val showHeader = maxWidth >= 600.dp

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(if (wide) 24.dp else 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(
                modifier = Modifier.widthIn(max = 1040.dp).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                if (showHeader) {
                    SettingsEntrance(entered, 0) { SettingsHeader() }
                }

                val themeCard: @Composable () -> Unit = {
                    ThemeCard(selected = state.theme, onSelect = viewModel::onThemeSelected)
                }
                val serverCard: @Composable () -> Unit = {
                    ServerCard(
                        activeUrl = state.activeUrl,
                        urlInput = state.urlInput,
                        testing = state.testing,
                        error = state.error,
                        info = state.info,
                        onUrlChange = viewModel::onUrlChange,
                        onSubmit = viewModel::testAndSaveUrl,
                    )
                }

                if (wide) {
                    // Pantallas anchas: apariencia | servidor, lado a lado.
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        SettingsEntrance(entered, 1, Modifier.weight(0.8f)) { themeCard() }
                        SettingsEntrance(entered, 2, Modifier.weight(1.2f)) { serverCard() }
                    }
                } else {
                    SettingsEntrance(entered, 1) { themeCard() }
                    SettingsEntrance(entered, 2) { serverCard() }
                }
            }
        }
    }
}

/* ================================================================== */
/*  Entrada escalonada                                                 */
/* ================================================================== */

@Composable
private fun SettingsEntrance(
    state: MutableTransitionState<Boolean>,
    index: Int,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val delay = 60 + index * 90
    AnimatedVisibility(
        visibleState = state,
        modifier = modifier,
        enter = fadeIn(tween(420, delay, FastOutSlowInEasing)) +
                slideInVertically(tween(420, delay, FastOutSlowInEasing)) { it / 5 },
    ) {
        content()
    }
}

/* ================================================================== */
/*  Cabecera                                                           */
/* ================================================================== */

@Composable
private fun SettingsHeader() {
    val colors = AppTheme.materialColors
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(44.dp)
                .background(colors.primary.copy(alpha = 0.14f), RoundedCornerShape(14.dp)),
        ) {
            Icon(Icons.Rounded.Settings, null, tint = colors.primary, modifier = Modifier.size(24.dp))
        }
        Column {
            Text(
                "Configuración",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = colors.onSurface,
            )
            Text(
                "Apariencia y conexión con el servidor",
                style = MaterialTheme.typography.bodySmall,
                color = colors.onSurfaceVariant,
            )
        }
    }
}

/* ================================================================== */
/*  Contenedor de sección                                              */
/* ================================================================== */

@Composable
private fun SettingsCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = AppTheme.materialColors
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = colors.surfaceContainer,
        tonalElevation = 2.dp,
        border = BorderStroke(1.dp, colors.outlineVariant.copy(alpha = 0.4f)),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(40.dp)
                        .background(colors.primary.copy(alpha = 0.14f), RoundedCornerShape(12.dp)),
                ) {
                    Icon(icon, null, tint = colors.primary, modifier = Modifier.size(22.dp))
                }
                Column {
                    Text(
                        title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.onSurface,
                    )
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurfaceVariant,
                    )
                }
            }
            content()
        }
    }
}

/* ================================================================== */
/*  Tema                                                               */
/* ================================================================== */

@Composable
private fun ThemeCard(
    selected: AppThemePreference,
    onSelect: (AppThemePreference) -> Unit,
) {
    SettingsCard(
        icon = Icons.Rounded.Palette,
        title = "Tema",
        subtitle = "Elige cómo se ve la aplicación",
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ThemeOption(
                label = "Sistema",
                icon = Icons.Rounded.SettingsBrightness,
                selected = selected == AppThemePreference.SYSTEM,
                onClick = { onSelect(AppThemePreference.SYSTEM) },
                modifier = Modifier.weight(1f),
            )
            ThemeOption(
                label = "Claro",
                icon = Icons.Rounded.LightMode,
                selected = selected == AppThemePreference.LIGHT,
                onClick = { onSelect(AppThemePreference.LIGHT) },
                modifier = Modifier.weight(1f),
            )
            ThemeOption(
                label = "Oscuro",
                icon = Icons.Rounded.DarkMode,
                selected = selected == AppThemePreference.DARK,
                onClick = { onSelect(AppThemePreference.DARK) },
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun ThemeOption(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.materialColors
    val shape = RoundedCornerShape(18.dp)

    val container by animateColorAsState(
        if (selected) colors.primary.copy(alpha = 0.14f) else colors.surfaceContainerHighest,
        tween(220), label = "themeBg",
    )
    val border by animateColorAsState(
        if (selected) colors.primary else Color.Transparent,
        tween(220), label = "themeBorder",
    )
    val tint by animateColorAsState(
        if (selected) colors.primary else colors.onSurfaceVariant,
        tween(220), label = "themeTint",
    )
    val scale by animateFloatAsState(
        if (selected) 1f else 0.97f,
        spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessMedium),
        label = "themeScale",
    )

    Column(
        modifier = modifier
            .scale(scale)
            .clip(shape)
            .background(container)
            .border(1.5.dp, border, shape)
            .selectable(selected = selected, role = Role.RadioButton, onClick = onClick)
            .padding(vertical = 14.dp, horizontal = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(26.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            color = tint,
            maxLines = 1,
        )
    }
}

/* ================================================================== */
/*  Servidor API                                                       */
/* ================================================================== */

@Composable
private fun ServerCard(
    activeUrl: String,
    urlInput: String,
    testing: Boolean,
    error: String?,
    info: String?,
    onUrlChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    val colors = AppTheme.materialColors
    val focusManager = LocalFocusManager.current
    val canSubmit = !testing && urlInput.isNotBlank()

    val submit = {
        if (canSubmit) {
            focusManager.clearFocus()
            onSubmit()
        }
    }

    SettingsCard(
        icon = Icons.Rounded.Dns,
        title = "Servidor API",
        subtitle = "Dirección a la que se conecta la aplicación",
    ) {
        ActiveServerRow(activeUrl)

        OutlinedTextField(
            value = urlInput,
            onValueChange = onUrlChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("URL base") },
            placeholder = { Text("http://192.168.1.10:8080", maxLines = 1, overflow = TextOverflow.Ellipsis) },
            leadingIcon = { Icon(Icons.Rounded.Link, null) },
            trailingIcon = {
                AnimatedVisibility(visible = urlInput.isNotEmpty() && !testing, enter = fadeIn(), exit = fadeOut()) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .clickable { onUrlChange("") },
                    ) {
                        Icon(Icons.Rounded.Close, "Borrar URL", Modifier.size(20.dp))
                    }
                }
            },
            singleLine = true,
            enabled = !testing,
            isError = error != null,
            shape = RoundedCornerShape(16.dp),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Uri,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(onDone = { submit() }),
        )

        AnimatedVisibility(
            visible = error != null,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically(),
        ) {
            // Se conserva el último texto mientras se anima la salida.
            var lastError by remember { mutableStateOf(error.orEmpty()) }
            if (error != null) lastError = error
            SettingsBanner(
                text = lastError,
                icon = Icons.Rounded.Error,
                container = colors.errorContainer,
                content = colors.onErrorContainer,
            )
        }

        AnimatedVisibility(
            visible = info != null && error == null,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically(),
        ) {
            var lastInfo by remember { mutableStateOf(info.orEmpty()) }
            if (info != null) lastInfo = info
            SettingsBanner(
                text = lastInfo,
                icon = Icons.Rounded.CheckCircle,
                container = colors.primaryContainer,
                content = colors.onPrimaryContainer,
            )
        }

        Button(
            onClick = submit,
            enabled = canSubmit || testing,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(16.dp),
        ) {
            AnimatedContent(
                targetState = testing,
                transitionSpec = { fadeIn(tween(180)) togetherWith fadeOut(tween(120)) },
                label = "serverButton",
            ) { loading ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = colors.onPrimary,
                        )
                        Text("Probando conexión…", fontWeight = FontWeight.SemiBold)
                    } else {
                        Icon(Icons.Rounded.NetworkCheck, null, Modifier.size(20.dp))
                        Text("Probar y guardar URL", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

/** Servidor activo, con indicador de estado. */
@Composable
private fun ActiveServerRow(activeUrl: String) {
    val colors = AppTheme.materialColors
    val hasUrl = activeUrl.isNotBlank()
    val accent by animateColorAsState(
        if (hasUrl) colors.primary else colors.onSurfaceVariant,
        tween(250), label = "activeAccent",
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.surfaceContainerHighest, RoundedCornerShape(16.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(32.dp).background(accent.copy(alpha = 0.14f), CircleShape),
        ) {
            Icon(
                imageVector = if (hasUrl) Icons.Rounded.CheckCircle else Icons.Rounded.CloudOff,
                contentDescription = null,
                tint = accent,
                modifier = Modifier.size(18.dp),
            )
        }
        Column(Modifier.weight(1f)) {
            Text(
                "Servidor activo",
                style = MaterialTheme.typography.labelSmall,
                color = colors.onSurfaceVariant,
            )
            AnimatedContent(
                targetState = activeUrl.ifBlank { "Sin configurar" },
                transitionSpec = { fadeIn(tween(200, 60)) togetherWith fadeOut(tween(100)) },
                label = "activeUrl",
            ) { url ->
                Text(
                    url,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun SettingsBanner(
    text: String,
    icon: ImageVector,
    container: Color,
    content: Color,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(container, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(icon, null, tint = content, modifier = Modifier.size(18.dp))
        Text(
            text,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Medium,
            color = content,
            modifier = Modifier.weight(1f),
        )
    }
}

