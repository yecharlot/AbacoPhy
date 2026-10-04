package com.elitec.com.infraestructure.ui.components

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.AndroidUiModes.UI_MODE_NIGHT_YES
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.elitec.com.infraestructure.ui.uiModels.NavButton
import com.elitec.com.infraestructure.ui.util.AppLightPreview
import com.elitec.com.infraestructure.ui.util.AppNightPreview
import com.gursimar.composive.responsive.theme.AppTheme
import org.jetbrains.compose.resources.painterResource

@Composable
fun NavRail(
    sessionName: String,
    modifier: Modifier = Modifier,
    navButtonsList: List<NavButton> = listOf(),
    onLogout: () -> Unit
) {
    var selectedNavItem by rememberSaveable { mutableStateOf("Principal") }

    Surface(
        modifier = modifier.fillMaxHeight(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.primary
    ) {
        Column(
            verticalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxHeight()
                .padding(
                    vertical = AppTheme.dimensions.cardSpacing,
                    horizontal = AppTheme.dimensions.cardSpacing
                )
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                AppLogoBox(
                    userName = sessionName,
                    logoSize = 30.dp,
                    elementSeparation = 5.dp
                )
                LazyColumn {
                    items(navButtonsList) { navButton ->
                        NavButtonItem(
                            isSelected = navButton.text == selectedNavItem,
                            iconSize = 25.dp,
                            onSelectedPage = {
                                selectedNavItem = navButton.text
                                navButton.onClick()
                            },
                            navButton = navButton,
                        )
                    }

                }
            }

            Button(
                colors = ButtonDefaults.buttonColors(
                    containerColor = AppTheme.materialColors.error
                ),
                onClick = {
                    onLogout()
                }
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    Icon(
                        tint = AppTheme.materialColors.onError,
                        imageVector = Icons.AutoMirrored.Filled.Logout,
                        contentDescription = "Logout"
                    )
                    Text(
                        color = AppTheme.materialColors.onError,
                        style = AppTheme.materialTypography.bodyMedium,
                        text = "Cerrar sesión"
                    )
                }
            }

        }
    }
}

/*
@Preview(
    showBackground = true
)
@Composable
fun NavRailLightPreview() {
    AppLightPreview {
        NavRail({})
    }
}

@Preview (
    showBackground = true,
    uiMode = UI_MODE_NIGHT_YES
)
@Composable
fun NavRailNightPreview() {
    AppNightPreview {
        NavRail({})
    }
}*/