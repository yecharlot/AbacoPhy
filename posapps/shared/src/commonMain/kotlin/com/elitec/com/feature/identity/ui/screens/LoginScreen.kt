package com.elitec.com.feature.identity.ui.screens

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.identity.ui.viewmodel.LoginUiState
import com.elitec.com.feature.identity.ui.viewmodel.LoginViewModel
import com.elitec.com.infraestructure.ui.theme.AbacoColors
import org.jetbrains.compose.resources.painterResource
import org.koin.compose.viewmodel.koinViewModel
import kotlin.math.roundToInt

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun LoginScreen(
    viewModel: LoginViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var username by rememberSaveable { mutableStateOf(viewModel.username) }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    val isLoading = uiState is LoginUiState.Loading
    val errorMessage = (uiState as? LoginUiState.Error)?.message
    val canSubmit = username.isNotBlank() && password.isNotEmpty() && !isLoading

    val focusManager = LocalFocusManager.current
    val passwordFocus = remember { FocusRequester() }

    // Estado de entrada: arranca en false y pasa a true al componerse.
    val entrance = remember { MutableTransitionState(false).apply { targetState = true } }

    // "Shake" de la tarjeta cuando hay error.
    val shake = remember { Animatable(0f) }
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            repeat(3) {
                shake.animateTo(14f, tween(45))
                shake.animateTo(-14f, tween(45))
            }
            shake.animateTo(0f, tween(45))
        }
    }

    val submit = {
        if (canSubmit) {
            focusManager.clearFocus()
            viewModel.submit()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.background,
                        AbacoColors.Cyan.copy(alpha = 0.14f)
                            .compositeOver(MaterialTheme.colorScheme.background),
                        MaterialTheme.colorScheme.background,
                    ),
                    start = Offset(0f, 0f),
                    end = Offset(1200f, 2400f),
                ),
            )
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            modifier = Modifier
                .widthIn(max = 420.dp)
                .fillMaxWidth()
                .offset { IntOffset(shake.value.roundToInt(), 0) },
            shape = MaterialTheme.shapes.extraLarge,
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 10.dp),
            border = BorderStroke(1.dp, AbacoColors.Cyan.copy(alpha = 0.18f)),
        ) {
            // Barra de progreso superior mientras se valida usuario y sesión.
            Box(Modifier.fillMaxWidth().height(4.dp)) {
                this@Card.AnimatedVisibility(
                    visible = isLoading,
                    enter = fadeIn(),
                    exit = fadeOut(),
                ) {
                    LinearProgressIndicator(
                        modifier = Modifier.fillMaxWidth(),
                        color = AbacoColors.Cyan,
                        trackColor = AbacoColors.Cyan.copy(alpha = 0.15f),
                    )
                }
            }

            Column(
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                // 0 — Logo con pulso suave
                Staggered(entrance, index = 0) { PulsingLogo(isLoading) }

                // 1 — Títulos
                Staggered(entrance, index = 1) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Ábaco POS",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = AbacoColors.Cyan,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = "Inicia sesión para continuar",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                        )
                    }
                }

                Spacer(Modifier.height(4.dp))

                val fieldColors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AbacoColors.Cyan,
                    cursorColor = AbacoColors.Cyan,
                    focusedLabelColor = AbacoColors.Cyan,
                    focusedLeadingIconColor = AbacoColors.Cyan,
                )

                // 2 — Usuario
                Staggered(entrance, index = 2) {
                    OutlinedTextField(
                        value = username,
                        onValueChange = {
                            username = it
                            viewModel.username = it
                            viewModel.clearError()
                        },
                        label = { Text("Usuario") },
                        leadingIcon = { Icon(Icons.Filled.Person, contentDescription = null) },
                        singleLine = true,
                        enabled = !isLoading,
                        isError = errorMessage != null,
                        shape = MaterialTheme.shapes.medium,
                        modifier = Modifier.fillMaxWidth(),
                        colors = fieldColors,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { passwordFocus.requestFocus() }),
                    )
                }

                // 3 — Contraseña con toggle de visibilidad
                Staggered(entrance, index = 3) {
                    OutlinedTextField(
                        value = password,
                        onValueChange = {
                            password = it
                            viewModel.password = it
                            viewModel.clearError()
                        },
                        label = { Text("Contraseña") },
                        leadingIcon = { Icon(Icons.Filled.Lock, contentDescription = null) },
                        trailingIcon = {
                            IconButton(
                                onClick = { passwordVisible = !passwordVisible },
                                enabled = !isLoading,
                            ) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Filled.VisibilityOff
                                    else Icons.Filled.Visibility,
                                    contentDescription = if (passwordVisible) "Ocultar contraseña"
                                    else "Mostrar contraseña",
                                )
                            }
                        },
                        singleLine = true,
                        enabled = !isLoading,
                        isError = errorMessage != null,
                        visualTransformation = if (passwordVisible) VisualTransformation.None
                        else PasswordVisualTransformation(),
                        shape = MaterialTheme.shapes.medium,
                        modifier = Modifier.fillMaxWidth().focusRequester(passwordFocus),
                        colors = fieldColors,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { submit() }),
                    )
                }

                // Mensaje de error animado
                AnimatedVisibility(
                    visible = errorMessage != null,
                    enter = fadeIn() + expandVertically(),
                    exit = fadeOut() + shrinkVertically(),
                ) {
                    ErrorBanner(message = errorMessage.orEmpty())
                }

                // Texto de estado durante la carga
                AnimatedVisibility(
                    visible = isLoading,
                    enter = fadeIn() + expandVertically(),
                    exit = fadeOut() + shrinkVertically(),
                ) {
                    Text(
                        text = "Validando credenciales y sesión…",
                        style = MaterialTheme.typography.bodySmall,
                        color = AbacoColors.Cyan,
                    )
                }

                // 4 — Botón
                Staggered(entrance, index = 4) {
                    Button(
                        onClick = { submit() },
                        enabled = canSubmit,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = MaterialTheme.shapes.medium,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = AbacoColors.Cyan,
                            contentColor = AbacoColors.DarkBg,
                            disabledContainerColor = AbacoColors.Cyan.copy(alpha = if (isLoading) 0.85f else 0.3f),
                            disabledContentColor = AbacoColors.DarkBg.copy(alpha = 0.7f),
                        ),
                    ) {
                        AnimatedContent(
                            targetState = isLoading,
                            transitionSpec = { fadeIn(tween(200)) togetherWith fadeOut(tween(150)) },
                            label = "login-button-content",
                        ) { loading ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                if (loading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(20.dp),
                                        color = AbacoColors.DarkBg,
                                        strokeWidth = 2.dp,
                                    )
                                    Text("Verificando…", fontWeight = FontWeight.SemiBold)
                                } else {
                                    Text("Entrar", fontWeight = FontWeight.SemiBold)
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.Login,
                                        contentDescription = null,
                                        modifier = Modifier.size(20.dp),
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Envuelve contenido con entrada escalonada (fade + slide + ligero scale). */
@Composable
private fun Staggered(
    state: MutableTransitionState<Boolean>,
    index: Int,
    content: @Composable () -> Unit,
) {
    val delay = 80 + index * 90
    AnimatedVisibility(
        visibleState = state,
        enter = fadeIn(tween(450, delay, FastOutSlowInEasing)) +
                slideInVertically(tween(450, delay, FastOutSlowInEasing)) { it / 3 } +
                scaleIn(tween(450, delay, FastOutSlowInEasing), initialScale = 0.94f),
    ) {
        content()
    }
}

@Composable
private fun PulsingLogo(isLoading: Boolean) {
    val transition = rememberInfiniteTransition(label = "logo-pulse")
    val pulse by transition.animateFloat(
        initialValue = 1f,
        targetValue = if (isLoading) 1.12f else 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(if (isLoading) 700 else 1600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "logo-scale",
    )
    Box(
        modifier = Modifier
            .size(72.dp)
            .scale(pulse)
            .clip(CircleShape)
            .background(
                Brush.linearGradient(
                    listOf(AbacoColors.Cyan, AbacoColors.Cyan.copy(alpha = 0.55f)),
                ),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Image(
            painter = painterResource(Res.drawable.abacus_color_icon),
            contentDescription = "Logo",
            modifier = Modifier.size(40.dp)
        )
    }
}

@Composable
private fun ErrorBanner(message: String) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.errorContainer,
        contentColor = MaterialTheme.colorScheme.onErrorContainer,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.ErrorOutline,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
            )
            Text(text = message, style = MaterialTheme.typography.bodySmall)
        }
    }
}