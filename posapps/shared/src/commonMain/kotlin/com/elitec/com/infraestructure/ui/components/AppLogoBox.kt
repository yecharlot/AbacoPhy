package com.elitec.com.infraestructure.ui.components

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
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
    modifier: Modifier = Modifier
) {
    val deviceConfiguration = rememberDeviceConfiguration()

    when (deviceConfiguration) {
        DeviceConfiguration.MOBILE_PORTRAIT,
             DeviceConfiguration.TABLET_LANDSCAPE,
                 DeviceConfiguration.DESKTOP-> {
            Row(
                modifier = modifier,
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(elementSeparation)
            ) {
                Image(
                    painter = painterResource(Res.drawable.abacus_color_icon),
                    contentDescription = "Logo",
                    modifier = Modifier
                        .size(logoSize)

                )
                Column {
                    Text(
                        text = "AbacoPhy",
                        style = AppTheme.materialTypography.titleLarge,
                        color = AppTheme.materialColors.onSurface
                    )
                    Text(
                        text = userName,
                        style = AppTheme.materialTypography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = AppTheme.materialColors.onSurface.copy(0.8f)
                    )
                }

            }

        }
        else -> {
            Column(
                modifier = modifier,
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(elementSeparation)
            ) {
                Image(
                    painter = painterResource(Res.drawable.abacus_color_icon),
                    contentDescription = "Logo",
                    modifier = Modifier
                        .size(logoSize)

                )
                Column {
                    Text(
                        text = "AbacoPhy",
                        style = AppTheme.materialTypography.titleLarge,
                        color = AppTheme.materialColors.onSurface
                    )
                    Text(
                        text = userName,
                        style = AppTheme.materialTypography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = AppTheme.materialColors.onSurface.copy(0.8f)
                    )
                }
            }
        }
    }

}