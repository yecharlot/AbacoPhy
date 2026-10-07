package com.elitec.com.infraestructure.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.elitec.com.infraestructure.ui.uiModels.NavButton
import com.gursimar.composive.responsive.theme.AppTheme

@Composable
fun NavButtonItem(
    isSelected: Boolean,
    onSelectedPage: () -> Unit,
    iconSize: Dp,
    modifier: Modifier = Modifier,
    navButton: NavButton,
) {
    val colors = AppTheme.materialColors
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = when {
            isPressed -> 0.96f
            isSelected -> 1.02f
            else -> 1f
        },
        animationSpec = spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessMedium),
        label = "navScale",
    )
    val iconScale by animateFloatAsState(
        targetValue = if (isSelected) 1.15f else 1f,
        animationSpec = spring(Spring.DampingRatioHighBouncy, Spring.StiffnessMediumLow),
        label = "navIconScale",
    )
    val container by animateColorAsState(
        targetValue = if (isSelected) colors.primary.copy(alpha = 0.16f) else Color.Transparent,
        animationSpec = tween(220),
        label = "navBg",
    )
    val content by animateColorAsState(
        targetValue = if (isSelected) colors.primary else colors.onSurface.copy(alpha = 0.78f),
        animationSpec = tween(220),
        label = "navFg",
    )
    // El indicador "crece" desde el centro en lugar de solo aparecer
    val indicatorHeight by animateDpAsState(
        targetValue = if (isSelected) 22.dp else 0.dp,
        animationSpec = spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessMediumLow),
        label = "navIndicator",
    )
    val chevronAlpha by animateFloatAsState(
        targetValue = if (isSelected) 1f else 0f,
        animationSpec = tween(220),
        label = "navChevron",
    )

    Surface(
        onClick = onSelectedPage,
        interactionSource = interactionSource,
        color = container,
        shape = RoundedCornerShape(16.dp),
        modifier = modifier
            .fillMaxWidth()
            .scale(scale),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Contenedor de altura fija para que el indicador no mueva el layout
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(22.dp),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    Modifier
                        .width(3.dp)
                        .height(indicatorHeight)
                        .clip(RoundedCornerShape(2.dp))
                        .background(colors.primary)
                )
            }

            if (navButton.icon != null) {
                Icon(
                    imageVector = navButton.icon,
                    contentDescription = navButton.tooltipDescription,
                    tint = content,
                    modifier = Modifier
                        .size(iconSize)
                        .scale(iconScale),
                )
            }

            Text(
                text = navButton.text,
                color = content,
                style = AppTheme.materialTypography.bodyMedium,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )

            Icon(
                imageVector = Icons.Rounded.ChevronRight,
                contentDescription = null,
                tint = content,
                modifier = Modifier
                    .size(18.dp)
                    .alpha(chevronAlpha),
            )
        }
    }
}

