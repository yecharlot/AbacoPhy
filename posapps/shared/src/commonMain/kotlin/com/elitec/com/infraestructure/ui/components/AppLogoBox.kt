package com.elitec.com.infraestructure.ui.components

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.gursimar.composive.responsive.core.DeviceConfiguration
import com.gursimar.composive.responsive.core.rememberDeviceConfiguration
import com.gursimar.composive.responsive.theme.AppTheme
import org.jetbrains.compose.resources.painterResource


@Composable
fun AppLogoBox(
    userName: String,
    logoSize: Dp,
    elementSeparation: Dp,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.materialColors
    val horizontal = when (rememberDeviceConfiguration()) {
        DeviceConfiguration.MOBILE_PORTRAIT,
        DeviceConfiguration.TABLET_LANDSCAPE,
        DeviceConfiguration.DESKTOP -> true
        else -> false
    }

    // Contenido compartido (antes estaba duplicado en ambas ramas)
    val logo: @Composable () -> Unit = {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(logoSize + 16.dp)
                .background(colors.primary.copy(alpha = 0.12f), RoundedCornerShape(14.dp)),
        ) {
            Image(
                painter = painterResource(Res.drawable.abacus_color_icon),
                contentDescription = "Logo",
                modifier = Modifier.size(logoSize),
            )
        }
    }

    val texts: @Composable () -> Unit = {
        Column {
            Text(
                text = "AbacoPhy",
                style = AppTheme.materialTypography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = colors.onSurface,
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(
                    imageVector = Icons.Rounded.Person,
                    contentDescription = null,
                    tint = colors.primary,
                    modifier = Modifier.size(12.dp),
                )
                Text(
                    text = userName,
                    style = AppTheme.materialTypography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = colors.onSurface.copy(alpha = 0.8f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }

    if (horizontal) {
        Row(
            modifier = modifier,
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(elementSeparation),
        ) {
            logo()
            texts()
        }
    } else {
        Column(
            modifier = modifier,
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(elementSeparation),
        ) {
            logo()
            texts()
        }
    }
}