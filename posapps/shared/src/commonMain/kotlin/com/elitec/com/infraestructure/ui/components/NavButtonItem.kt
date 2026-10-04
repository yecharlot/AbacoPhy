package com.elitec.com.infraestructure.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
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
    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1.02f else 1f,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "navScale",
    )
    val container by animateColorAsState(
        targetValue = if (isSelected) {
            AppTheme.materialColors.primary.copy(alpha = 0.18f)
        } else {
            Color.Transparent
        },
        animationSpec = tween(220),
        label = "navBg",
    )
    val content by animateColorAsState(
        targetValue = if (isSelected) {
            AppTheme.materialColors.primary
        } else {
            AppTheme.materialColors.onSurface.copy(alpha = 0.78f)
        },
        animationSpec = tween(220),
        label = "navFg",
    )
    val indicatorAlpha by animateFloatAsState(
        targetValue = if (isSelected) 1f else 0f,
        animationSpec = tween(220),
        label = "navInd",
    )

    Surface(
        onClick = onSelectedPage,
        color = container,
        shape = RoundedCornerShape(14.dp),
        modifier = modifier
            .fillMaxWidth()
            .scale(scale),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                Modifier
                    .width(3.dp)
                    .height(22.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(AppTheme.materialColors.primary.copy(alpha = indicatorAlpha)),
            )
            if (navButton.icon != null) {
                Icon(
                    imageVector = navButton.icon,
                    contentDescription = navButton.tooltipDescription,
                    tint = content,
                    modifier = Modifier.size(iconSize),
                )
            }
            Text(
                text = navButton.text,
                color = content,
                style = AppTheme.materialTypography.bodyMedium,
            )
        }
    }
}
