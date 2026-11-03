package com.elitec.abaco_launcher.feature.orchestrator.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.TooltipArea
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.PointerIcon
import androidx.compose.ui.input.pointer.pointerHoverIcon
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.TooltipPlacement
import kotlinx.coroutines.delay

/** Tokens de diseño (Catppuccin Macchiato) compartidos por toda la pantalla. */
internal object Ide {
    val Base = Color(0xFF1E2030)
    val Mantle = Color(0xFF181926)
    val Crust = Color(0xFF13141F)
    val Surface1 = Color(0xFF252638)
    val Surface2 = Color(0xFF2E2F45)
    val Border = Color(0xFF363850)
    val Overlay = Color(0xFF585B70)
    val Fg = Color(0xFFCDD6F4)
    val Subtle = Color(0xFF7F849C)
    val Blue = Color(0xFF89B4FA)
    val Green = Color(0xFFA6E3A1)
    val Yellow = Color(0xFFF9E2AF)
    val Red = Color(0xFFF38BA8)
    val Purple = Color(0xFFCBA6F7)
    val Peach = Color(0xFFFAB387)
    val Cyan = Color(0xFF89DCEB)
    val Mono = FontFamily.Monospace
}

/** Tarjeta con fondo, borde y esquinas redondeadas. */
internal fun Modifier.ideCard(
    color: Color = Ide.Surface2.copy(alpha = 0.5f),
    border: Color = Ide.Border,
    shape: Shape = RoundedCornerShape(8.dp),
): Modifier = this
    .clip(shape)
    .background(color)
    .border(1.dp, border, shape)

@Composable
internal fun SectionLabel(
    icon: ImageVector,
    text: String,
    modifier: Modifier = Modifier,
    trailing: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(icon, null, tint = Ide.Subtle, modifier = Modifier.size(13.dp))
        Text(
            text,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = Ide.Subtle,
            letterSpacing = 1.2.sp,
        )
        Spacer(Modifier.weight(1f))
        trailing?.invoke()
    }
}

/** Botón con hover, press-scale y estado de carga. */
@Composable
internal fun IdeButton(
    text: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    tone: Color = Ide.Blue,
    filled: Boolean = false,
    loading: Boolean = false,
) {
    val source = remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    val pressed by source.collectIsPressedAsState()
    val shape = RoundedCornerShape(8.dp)

    val bg by animateColorAsState(
        when {
            !enabled -> Ide.Surface2.copy(alpha = 0.4f)
            filled -> if (hovered) tone.copy(alpha = 0.88f) else tone
            else -> tone.copy(alpha = if (hovered) 0.16f else 0.06f)
        },
        tween(140),
    )
    val fg by animateColorAsState(
        when {
            !enabled -> Ide.Subtle.copy(alpha = 0.5f)
            filled -> Ide.Mantle
            else -> tone
        },
        tween(140),
    )
    val borderColor by animateColorAsState(
        when {
            !enabled -> Ide.Border
            filled -> Color.Transparent
            else -> tone.copy(alpha = if (hovered) 0.7f else 0.35f)
        },
        tween(140),
    )
    val scale by animateFloatAsState(
        if (pressed && enabled) 0.97f else 1f,
        spring(stiffness = Spring.StiffnessMedium),
    )

    Row(
        modifier = modifier
            .scale(scale)
            .clip(shape)
            .background(bg)
            .border(1.dp, borderColor, shape)
            .hoverable(source, enabled)
            .clickable(
                interactionSource = source,
                indication = null,
                enabled = enabled,
                role = Role.Button,
                onClick = onClick,
            )
            .pointerHoverIcon(if (enabled) PointerIcon.Hand else PointerIcon.Default)
            .padding(horizontal = 12.dp, vertical = 9.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AnimatedContent(
            targetState = loading,
            transitionSpec = { fadeIn(tween(120)) togetherWith fadeOut(tween(120)) },
            label = "btn-icon",
        ) { isLoading ->
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(14.dp),
                    color = fg,
                    strokeWidth = 2.dp,
                )
            } else {
                Icon(icon, null, tint = fg, modifier = Modifier.size(16.dp))
            }
        }
        Text(text, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = fg, maxLines = 1)
    }
}

/** Botón de icono compacto con tooltip (solo Desktop). */
@OptIn(ExperimentalFoundationApi::class, ExperimentalAnimationApi::class)
@Composable
internal fun IdeIconButton(
    icon: ImageVector,
    description: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    tint: Color = Ide.Subtle,
    hoverTint: Color = Ide.Fg,
) {
    val source = remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    val bg by animateColorAsState(
        if (hovered && enabled) Ide.Surface2 else Color.Transparent,
        tween(120),
    )
    val fg by animateColorAsState(
        when {
            !enabled -> tint.copy(alpha = 0.3f)
            hovered -> hoverTint
            else -> tint
        },
        tween(120),
    )
    TooltipArea(
        tooltip = {
            Box(Modifier.ideCard(Ide.Surface1).padding(horizontal = 8.dp, vertical = 4.dp)) {
                Text(description, fontSize = 11.sp, color = Ide.Fg)
            }
        },
        modifier = modifier,
        delayMillis = 450,
        tooltipPlacement = TooltipPlacement.CursorPoint(offset = DpOffset(0.dp, 18.dp)),
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(bg)
                .hoverable(source, enabled)
                .clickable(
                    interactionSource = source,
                    indication = null,
                    enabled = enabled,
                    role = Role.Button,
                    onClick = onClick,
                )
                .pointerHoverIcon(if (enabled) PointerIcon.Hand else PointerIcon.Default),
            contentAlignment = Alignment.Center,
        ) {
            AnimatedContent(
                targetState = icon,
                transitionSpec = {
                    (scaleIn(initialScale = 0.6f) + fadeIn()) togetherWith
                            (scaleOut(targetScale = 0.6f) + fadeOut())
                },
                label = "icon-swap",
            ) { current ->
                Icon(current, description, tint = fg, modifier = Modifier.size(16.dp))
            }
        }
    }
}

/** Copia al portapapeles y muestra un check durante un instante. */
@Composable
internal fun CopyButton(
    description: String = "Copiar",
    enabled: Boolean = true,
    text: () -> String,
) {
    val clipboard = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }
    LaunchedEffect(copied) {
        if (copied) {
            delay(1200)
            copied = false
        }
    }
    IdeIconButton(
        icon = if (copied) Icons.Rounded.Check else Icons.Rounded.ContentCopy,
        description = if (copied) "¡Copiado!" else description,
        tint = if (copied) Ide.Green else Ide.Subtle,
        enabled = enabled,
        onClick = {
            clipboard.setText(AnnotatedString(text()))
            copied = true
        },
    )
}

/** Campo de texto compacto estilo IDE. */
@Composable
internal fun IdeField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    leading: ImageVector? = null,
    enabled: Boolean = true,
    keyboardType: KeyboardType = KeyboardType.Text,
    trailing: (@Composable () -> Unit)? = null,
) {
    var focused by remember { mutableStateOf(false) }
    val border by animateColorAsState(
        when {
            !enabled -> Ide.Border.copy(alpha = 0.5f)
            focused -> Ide.Blue
            else -> Ide.Border
        },
        tween(150),
    )
    val iconTint by animateColorAsState(if (focused) Ide.Blue else Ide.Subtle, tween(150))
    val shape = RoundedCornerShape(8.dp)

    Row(
        modifier = modifier
            .clip(shape)
            .background(Ide.Crust)
            .border(1.dp, border, shape)
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (leading != null) Icon(leading, null, tint = iconTint, modifier = Modifier.size(15.dp))
        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) {
                Text(placeholder, fontSize = 12.sp, fontFamily = Ide.Mono, color = Ide.Subtle.copy(alpha = 0.5f), maxLines = 1)
            }
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                enabled = enabled,
                singleLine = true,
                textStyle = TextStyle(
                    color = if (enabled) Ide.Fg else Ide.Subtle,
                    fontSize = 12.sp,
                    fontFamily = Ide.Mono,
                ),
                cursorBrush = SolidColor(Ide.Blue),
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                modifier = Modifier
                    .fillMaxWidth()
                    .onFocusChanged { focused = it.isFocused },
            )
        }
        trailing?.invoke()
    }
}

/** Chip de filtro (nivel de log) con contador. */
@Composable
internal fun IdeChip(
    label: String,
    count: Int,
    color: Color,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    val bg by animateColorAsState(
        when {
            selected -> color.copy(alpha = 0.14f)
            hovered -> Ide.Surface2.copy(alpha = 0.6f)
            else -> Color.Transparent
        },
        tween(140),
    )
    val borderC by animateColorAsState(if (selected) color.copy(alpha = 0.45f) else Ide.Border, tween(140))
    val fg by animateColorAsState(if (selected) color else Ide.Subtle, tween(140))
    val shape = RoundedCornerShape(20.dp)

    Row(
        modifier = Modifier
            .clip(shape)
            .background(bg)
            .border(1.dp, borderC, shape)
            .hoverable(source)
            .clickable(interactionSource = source, indication = null, role = Role.Checkbox, onClick = onClick)
            .pointerHoverIcon(PointerIcon.Hand)
            .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.size(6.dp).clip(CircleShape).background(fg))
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = fg, maxLines = 1)
        Text(count.toString(), fontSize = 10.sp, fontFamily = Ide.Mono, color = fg.copy(alpha = 0.6f))
    }
}