package com.elitec.com.infraestructure.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicText
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
    val buttonContainerColor = if(isSelected) AppTheme.materialColors.surface.copy(0.2f) else AppTheme.materialColors.primary
    val animatedContainerColor by animateColorAsState(
        targetValue = buttonContainerColor
    )

    Button(
        colors = ButtonDefaults.buttonColors(containerColor = animatedContainerColor),
        modifier = modifier,
        onClick = onSelectedPage,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (navButton.icon != null) {
                Icon(
                    imageVector = navButton.icon,
                    contentDescription = navButton.tooltipDescription,
                    modifier = Modifier.size(iconSize)
                )
            }
            BasicText(
                text = navButton.text
            )
        }
    }
}