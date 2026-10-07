package com.elitec.com.feature.catalog.ui.components


import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.unit.dp
import com.elitec.com.feature.catalog.domain.entities.Product
import com.gursimar.composive.responsive.theme.AppTheme
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Category
import androidx.compose.material.icons.rounded.Checkroom
import androidx.compose.material.icons.rounded.CleaningServices
import androidx.compose.material.icons.rounded.Construction
import androidx.compose.material.icons.rounded.Devices
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.LocalDrink
import androidx.compose.material.icons.rounded.LocalGroceryStore
import androidx.compose.material.icons.rounded.Medication
import androidx.compose.material.icons.rounded.Pets
import androidx.compose.material.icons.rounded.Restaurant
import androidx.compose.material.icons.rounded.Sell
import androidx.compose.material.icons.rounded.Straighten
import androidx.compose.material.icons.rounded.Tag
import androidx.compose.material.icons.rounded.Toys
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.text.NumberFormat

/* ------------------------------------------------------------------ */
/*  Tarjeta de producto                                                */
/* ------------------------------------------------------------------ */

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ProductItemBox(
    product: Product,
    modifier: Modifier = Modifier
) {
    val colors = AppTheme.materialColors
    val typography = AppTheme.materialTypography

    // --- Estado ---
    var expanded by remember { mutableStateOf(false) }
    var appeared by remember { mutableStateOf(false) }
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    LaunchedEffect(Unit) { appeared = true }

    // --- Animaciones ---
    val pressScale by animateFloatAsState(
        targetValue = if (isPressed) 0.97f else 1f,
        animationSpec = spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessMedium),
        label = "pressScale"
    )
    val chevronRotation by animateFloatAsState(
        targetValue = if (expanded) 180f else 0f,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "chevronRotation"
    )

    val hasMetadata = !product.metadata.isNullOrBlank()
    val accent = categoryAccent(product.category)

    // --- Animación de entrada ---
    AnimatedVisibility(
        visible = appeared,
        enter = fadeIn() +
                slideInVertically(initialOffsetY = { it / 6 }) +
                scaleIn(initialScale = 0.92f),
        modifier = modifier
    ) {
        Surface(
            onClick = { if (hasMetadata) expanded = !expanded },
            interactionSource = interactionSource,
            shape = RoundedCornerShape(24.dp),
            color = colors.surfaceContainerLow,
            tonalElevation = 2.dp,
            shadowElevation = 3.dp,
            border = BorderStroke(1.dp, colors.outlineVariant.copy(alpha = 0.5f)),
            modifier = Modifier
                .scale(pressScale)
                .animateContentSize(spring(stiffness = Spring.StiffnessMediumLow))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {

                // ---------- Cabecera: icono de categoría + código ----------
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(48.dp)
                            .background(accent.container, RoundedCornerShape(16.dp))
                    ) {
                        Icon(
                            imageVector = categoryIcon(product.category),
                            contentDescription = product.category,
                            tint = accent.content,
                            modifier = Modifier.size(26.dp)
                        )
                    }

                    CodeBadge(code = product.code)
                }

                Spacer(Modifier.height(14.dp))

                // ---------- Nombre ----------
                Text(
                    text = product.name,
                    style = typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.onSurface,
                    maxLines = if (expanded) Int.MAX_VALUE else 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(Modifier.height(12.dp))

                // ---------- Chips: categoría + unidad ----------
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    InfoChip(
                        icon = Icons.Rounded.Category,
                        text = product.category,
                        containerColor = accent.container.copy(alpha = 0.55f),
                        contentColor = accent.content
                    )
                    InfoChip(
                        icon = Icons.Rounded.Straighten,
                        text = product.unit,
                        containerColor = colors.surfaceContainerHighest,
                        contentColor = colors.onSurfaceVariant
                    )
                }


                // ---------- Metadata (expandible) ----------
                if (hasMetadata) {
                    AnimatedVisibility(
                        visible = expanded,
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut() + shrinkVertically()
                    ) {
                        Row(
                            modifier = Modifier
                                .padding(top = 12.dp)
                                .fillMaxWidth()
                                .background(
                                    colors.surfaceContainerHighest.copy(alpha = 0.6f),
                                    RoundedCornerShape(14.dp)
                                )
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Info,
                                contentDescription = null,
                                tint = colors.onSurfaceVariant,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = product.metadata.orEmpty(),
                                style = typography.bodySmall,
                                color = colors.onSurfaceVariant
                            )
                        }
                    }

                    Icon(
                        imageVector = Icons.Rounded.ExpandMore,
                        contentDescription = if (expanded) "Ocultar detalles" else "Ver detalles",
                        tint = colors.onSurfaceVariant.copy(alpha = 0.7f),
                        modifier = Modifier
                            .align(Alignment.CenterHorizontally)
                            .padding(top = 6.dp)
                            .size(22.dp)
                            .rotate(chevronRotation)
                    )
                }
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Componentes auxiliares                                             */
/* ------------------------------------------------------------------ */

@Composable
private fun CodeBadge(code: String) {
    val colors = AppTheme.materialColors
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(colors.surfaceContainerHighest, CircleShape)
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        Icon(
            imageVector = Icons.Rounded.Tag,
            contentDescription = null,
            tint = colors.onSurfaceVariant,
            modifier = Modifier.size(14.dp)
        )
        Spacer(Modifier.size(4.dp))
        Text(
            text = code,
            style = AppTheme.materialTypography.labelMedium,
            fontWeight = FontWeight.Medium,
            color = colors.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun InfoChip(
    icon: ImageVector,
    text: String,
    containerColor: Color,
    contentColor: Color
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(containerColor, CircleShape)
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = contentColor,
            modifier = Modifier.size(14.dp)
        )
        Spacer(Modifier.size(6.dp))
        Text(
            text = text,
            style = AppTheme.materialTypography.labelMedium,
            fontWeight = FontWeight.Medium,
            color = contentColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

/* ------------------------------------------------------------------ */
/*  Helpers: icono y color por categoría                               */
/* ------------------------------------------------------------------ */

private data class Accent(val container: Color, val content: Color)

/** Color estable por categoría (misma categoría = mismo color), tomado del tema. */
@Composable
private fun categoryAccent(category: String): Accent {
    val c = AppTheme.materialColors
    return when (category.hashCode().mod(3)) {
        0 -> Accent(c.primaryContainer, c.onPrimaryContainer)
        1 -> Accent(c.secondaryContainer, c.onSecondaryContainer)
        else -> Accent(c.tertiaryContainer, c.onTertiaryContainer)
    }
}

/** Icono según palabras clave de la categoría. Ajusta las palabras a tu catálogo. */
private fun categoryIcon(category: String): ImageVector {
    val key = category.lowercase()
    return when {
        "bebida" in key || "licor" in key || "refresco" in key -> Icons.Rounded.LocalDrink
        "comida" in key || "alimento" in key || "restaur" in key -> Icons.Rounded.Restaurant
        "super" in key || "abarrote" in key || "grocer" in key -> Icons.Rounded.LocalGroceryStore
        "ropa" in key || "textil" in key || "vestuario" in key -> Icons.Rounded.Checkroom
        "limpieza" in key || "aseo" in key -> Icons.Rounded.CleaningServices
        "herramienta" in key || "ferret" in key || "construc" in key -> Icons.Rounded.Construction
        "electr" in key || "tecno" in key || "dispositivo" in key -> Icons.Rounded.Devices
        "farmac" in key || "medic" in key || "salud" in key -> Icons.Rounded.Medication
        "mascota" in key || "animal" in key -> Icons.Rounded.Pets
        "juguete" in key || "niño" in key -> Icons.Rounded.Toys
        else -> Icons.Rounded.Inventory2
    }
}

private fun Double.asCurrency(): String =
    NumberFormat.getCurrencyInstance().format(this)