package com.elitec.com.feature.identity.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.identity.ui.viewmodel.SplashDestination
import com.elitec.com.feature.identity.ui.viewmodel.SplashViewModel
import com.elitec.com.infraestructure.ui.theme.AbacoColors
import com.elitec.com.infraestructure.ui.theme.AbacoMotion
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun SplashScreen(
    onGoHome: () -> Unit,
    onGoLogin: () -> Unit,
    viewModel: SplashViewModel = koinViewModel(),
) {
    val destination by viewModel.destination.collectAsStateWithLifecycle()
    var visible by remember { mutableStateOf(false) }
    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(AbacoMotion.MediumMs),
        label = "splashAlpha",
    )

    LaunchedEffect(Unit) { visible = true }

    LaunchedEffect(destination) {
        when (destination) {
            SplashDestination.Home -> onGoHome()
            SplashDestination.Login -> onGoLogin()
            SplashDestination.Loading -> Unit
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.alpha(alpha),
        ) {
            Text(
                text = "Ábaco",
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Bold,
                color = AbacoColors.Cyan,
            )
            Text(
                text = "POS",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.85f),
            )
            Spacer(Modifier.height(32.dp))
            CircularProgressIndicator(
                modifier = Modifier.size(36.dp),
                color = AbacoColors.Cyan,
                strokeWidth = 3.dp,
            )
            Spacer(Modifier.height(16.dp))
            Text(
                text = "Comprobando sesión…",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
