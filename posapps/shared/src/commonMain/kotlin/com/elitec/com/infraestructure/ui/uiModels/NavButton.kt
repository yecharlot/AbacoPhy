package com.elitec.com.infraestructure.ui.uiModels

import androidx.compose.ui.graphics.vector.ImageVector

data class NavButton(
    val text: String,
    val icon: ImageVector? = null,
    val onClick: () -> Unit,
    val enabled: Boolean = true,
    val tooltipDescription: String? = null,
    val isLoading: Boolean = false,
)
