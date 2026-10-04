package com.elitec.com.feature.pos.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DatePicker
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.TextField
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.gursimar.composive.responsive.theme.AppTheme
import de.julianegner.multiplatformTooltip.standardTooltipModifier

@Composable
fun NewSaleForm(
    modifier: Modifier = Modifier
) {
    val dateState = rememberDatePickerState()

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.primary
    ) {
        Column(
            modifier = Modifier.padding(AppTheme.dimensions.cardPadding)
        ) {
            Row {
                DatePicker(
                    state = dateState
                )
            }
        }
    }

}