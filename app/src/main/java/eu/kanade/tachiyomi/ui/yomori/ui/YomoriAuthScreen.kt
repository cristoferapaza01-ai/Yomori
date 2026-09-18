package eu.kanade.tachiyomi.ui.yomori.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import eu.kanade.presentation.util.Screen
import eu.kanade.tachiyomi.ui.home.HomeScreen
import eu.kanade.tachiyomi.ui.yomori.data.UserManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class YomoriAuthScreenVoyager : Screen() {
    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow
        YomoriAuthScreen(
            onAuthenticated = {
                navigator.replaceAll(HomeScreen)
            }
        )
    }
}

@Composable
fun YomoriAuthScreen(
    onAuthenticated: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    var isCheckingSession by remember { mutableStateOf(UserManager.isAutoLoginEnabled()) }
    var isRegisterMode by remember { mutableStateOf(false) }

    var emailInput by remember { mutableStateOf("") }
    var usernameInput by remember { mutableStateOf("") }
    var nicknameInput by remember { mutableStateOf("") }
    var passwordInput by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var rememberMe by remember { mutableStateOf(true) }

    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Pulsing logo animation
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.96f,
        targetValue = 1.04f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "logoPulse"
    )

    // Check auto-login session on launch
    LaunchedEffect(Unit) {
        if (UserManager.isAutoLoginEnabled()) {
            try {
                delay(300)
                onAuthenticated()
            } catch (_: Throwable) {
                isCheckingSession = false
            }
        } else {
            isCheckingSession = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF07090E),
                        Color(0xFF0F141C),
                        Color(0xFF0B0E14)
                    )
                )
            )
    ) {
        if (isCheckingSession) {
            // Splash Screen con Logo Yomori (Solo cuando ya hay una sesión guardada activa)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .scale(pulseScale)
                        .size(100.dp)
                        .clip(RoundedCornerShape(28.dp))
                        .background(
                            Brush.linearGradient(
                                listOf(
                                    YomoriTeal.copy(alpha = 0.25f),
                                    Color(0xFF1F2937)
                                )
                            )
                        )
                        .border(
                            2.dp,
                            Brush.linearGradient(listOf(YomoriTeal, YomoriGreen)),
                            RoundedCornerShape(28.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "夜",
                        color = YomoriTeal,
                        fontWeight = FontWeight.Black,
                        fontSize = 48.sp
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Text(
                    "YOMORI",
                    color = TextPrimary,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 2.sp
                )

                Text(
                    "Tu mundo de Manga & Manhwa",
                    color = TextMuted,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(36.dp))

                CircularProgressIndicator(
                    color = YomoriTeal,
                    strokeWidth = 2.5.dp,
                    modifier = Modifier.size(24.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    "Cargando sesión...",
                    color = TextMuted,
                    fontSize = 11.sp
                )
            }
        } else {
            // Pantalla de Login / Registro Directa e Instantánea
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding()
                    .padding(horizontal = 24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(vertical = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    // Logo elegante con brillo Yomori
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(20.dp))
                            .background(
                                Brush.linearGradient(
                                    listOf(
                                        YomoriTeal.copy(alpha = 0.22f),
                                        Color(0xFF131924)
                                    )
                                )
                            )
                            .border(
                                1.5.dp,
                                Brush.linearGradient(listOf(YomoriTeal, YomoriGreen)),
                                RoundedCornerShape(20.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("夜", color = YomoriTeal, fontWeight = FontWeight.Black, fontSize = 36.sp)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        if (isRegisterMode) "Crear Cuenta" else "Iniciar Sesión",
                        color = TextPrimary,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        if (isRegisterMode) "Completa los datos para guardar tus lecturas y subir de rango" else "Inicia sesión para sincronizar tus mangas y progreso",
                        color = TextMuted,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Formulario Dinámico
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        if (isRegisterMode) {
                            // 1. Correo Electrónico
                            OutlinedTextField(
                                value = emailInput,
                                onValueChange = {
                                    emailInput = it
                                    errorMessage = null
                                },
                                label = { Text("Correo Electrónico") },
                                placeholder = { Text("ejemplo@correo.com", color = TextMuted.copy(alpha = 0.5f)) },
                                leadingIcon = {
                                    Icon(Icons.Filled.Email, contentDescription = null, tint = YomoriTeal)
                                },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Email,
                                    imeAction = ImeAction.Next
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = YomoriTeal,
                                    unfocusedBorderColor = YomoriBorder,
                                    focusedLabelColor = YomoriTeal,
                                    unfocusedLabelColor = TextMuted,
                                    focusedTextColor = TextPrimary,
                                    unfocusedTextColor = TextPrimary,
                                    focusedContainerColor = YomoriSurfaceDark,
                                    unfocusedContainerColor = YomoriSurfaceDark
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )

                            // 2. Nombre de Usuario
                            OutlinedTextField(
                                value = usernameInput,
                                onValueChange = {
                                    usernameInput = it.replace(" ", "").replace("@", "")
                                    errorMessage = null
                                },
                                label = { Text("Nombre de Usuario") },
                                placeholder = { Text("ej: shadow_reader (sin @)", color = TextMuted.copy(alpha = 0.5f)) },
                                leadingIcon = {
                                    Icon(Icons.Filled.AlternateEmail, contentDescription = null, tint = YomoriTeal)
                                },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    imeAction = ImeAction.Next
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = YomoriTeal,
                                    unfocusedBorderColor = YomoriBorder,
                                    focusedLabelColor = YomoriTeal,
                                    unfocusedLabelColor = TextMuted,
                                    focusedTextColor = TextPrimary,
                                    unfocusedTextColor = TextPrimary,
                                    focusedContainerColor = YomoriSurfaceDark,
                                    unfocusedContainerColor = YomoriSurfaceDark
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )

                            // 3. Apodo / Nombre público
                            OutlinedTextField(
                                value = nicknameInput,
                                onValueChange = {
                                    nicknameInput = it
                                    errorMessage = null
                                },
                                label = { Text("Apodo (Nombre para mostrar)") },
                                placeholder = { Text("ej: El Rey de las Sombras", color = TextMuted.copy(alpha = 0.5f)) },
                                leadingIcon = {
                                    Icon(Icons.Filled.Badge, contentDescription = null, tint = YomoriTeal)
                                },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    imeAction = ImeAction.Next
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = YomoriTeal,
                                    unfocusedBorderColor = YomoriBorder,
                                    focusedLabelColor = YomoriTeal,
                                    unfocusedLabelColor = TextMuted,
                                    focusedTextColor = TextPrimary,
                                    unfocusedTextColor = TextPrimary,
                                    focusedContainerColor = YomoriSurfaceDark,
                                    unfocusedContainerColor = YomoriSurfaceDark
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )
                        } else {
                            // En Login: Usuario o Correo
                            OutlinedTextField(
                                value = usernameInput,
                                onValueChange = {
                                    usernameInput = it.trim()
                                    errorMessage = null
                                },
                                label = { Text("Usuario o Correo") },
                                placeholder = { Text("ej: shadow_reader o tu@correo.com", color = TextMuted.copy(alpha = 0.5f)) },
                                leadingIcon = {
                                    Icon(Icons.Filled.Person, contentDescription = null, tint = YomoriTeal)
                                },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = YomoriTeal,
                                    unfocusedBorderColor = YomoriBorder,
                                    focusedLabelColor = YomoriTeal,
                                    unfocusedLabelColor = TextMuted,
                                    focusedTextColor = TextPrimary,
                                    unfocusedTextColor = TextPrimary,
                                    focusedContainerColor = YomoriSurfaceDark,
                                    unfocusedContainerColor = YomoriSurfaceDark
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        // Campo Contraseña (Para Login y Registro)
                        OutlinedTextField(
                            value = passwordInput,
                            onValueChange = {
                                passwordInput = it
                                errorMessage = null
                            },
                            label = { Text("Contraseña") },
                            leadingIcon = {
                                Icon(Icons.Filled.Lock, contentDescription = null, tint = YomoriTeal)
                            },
                            trailingIcon = {
                                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                    Icon(
                                        if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                                        contentDescription = "Ver contraseña",
                                        tint = TextMuted
                                    )
                                }
                            },
                            singleLine = true,
                            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Password,
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = YomoriTeal,
                                unfocusedBorderColor = YomoriBorder,
                                focusedLabelColor = YomoriTeal,
                                unfocusedLabelColor = TextMuted,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedContainerColor = YomoriSurfaceDark,
                                unfocusedContainerColor = YomoriSurfaceDark
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        // Checkbox "Recordarme"
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { rememberMe = !rememberMe }
                                .padding(vertical = 2.dp)
                        ) {
                            Checkbox(
                                checked = rememberMe,
                                onCheckedChange = { rememberMe = it },
                                colors = CheckboxDefaults.colors(
                                    checkedColor = YomoriTeal,
                                    checkmarkColor = YomoriBgDark,
                                    uncheckedColor = TextMuted
                                )
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                "Recordarme en este dispositivo",
                                color = TextSecondary,
                                fontSize = 13.sp
                            )
                        }

                        // Mensaje de Error
                        if (errorMessage != null) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF4A1521),
                                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(Color.Red, Color.Transparent))),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    errorMessage!!,
                                    color = Color(0xFFFF8080),
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(10.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Botón Principal (Iniciar Sesión / Crear Cuenta)
                        Button(
                            onClick = {
                                focusManager.clearFocus()

                                if (isRegisterMode) {
                                    if (emailInput.isBlank() || !emailInput.contains("@")) {
                                        errorMessage = "Por favor ingresa un correo electrónico válido"
                                        return@Button
                                    }
                                    if (usernameInput.isBlank()) {
                                        errorMessage = "Por favor ingresa un nombre de usuario"
                                        return@Button
                                    }
                                    if (nicknameInput.isBlank()) {
                                        errorMessage = "Por favor ingresa tu apodo"
                                        return@Button
                                    }
                                    if (passwordInput.length < 4) {
                                        errorMessage = "La contraseña debe tener al menos 4 caracteres"
                                        return@Button
                                    }
                                } else {
                                    if (usernameInput.isBlank()) {
                                        errorMessage = "Por favor ingresa tu usuario o correo"
                                        return@Button
                                    }
                                    if (passwordInput.isBlank()) {
                                        errorMessage = "Por favor ingresa tu contraseña"
                                        return@Button
                                    }
                                }

                                isLoading = true
                                errorMessage = null

                                coroutineScope.launch {
                                    if (isRegisterMode) {
                                        val result = UserManager.register(
                                            nickname = nicknameInput,
                                            username = usernameInput,
                                            email = emailInput,
                                            password = passwordInput,
                                            rememberMe = rememberMe
                                        )
                                        isLoading = false
                                        result.onSuccess {
                                            onAuthenticated()
                                        }.onFailure { err ->
                                            errorMessage = err.message ?: "Error al registrar la cuenta"
                                        }
                                    } else {
                                        val result = UserManager.login(
                                            usernameOrEmail = usernameInput,
                                            password = passwordInput,
                                            rememberMe = rememberMe
                                        )
                                        isLoading = false
                                        result.onSuccess {
                                            onAuthenticated()
                                        }.onFailure { err ->
                                            errorMessage = err.message ?: "Usuario o contraseña incorrectos"
                                        }
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = YomoriTeal),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            enabled = !isLoading
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    color = YomoriBgDark,
                                    strokeWidth = 2.dp,
                                    modifier = Modifier.size(20.dp)
                                )
                            } else {
                                Text(
                                    if (isRegisterMode) "Crear Cuenta" else "Iniciar Sesión",
                                    color = YomoriBgDark,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp
                                )
                            }
                        }

                        // Enlace interactivo en texto justo debajo del botón principal
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                if (isRegisterMode) "¿Ya tienes una cuenta? " else "¿No tienes una cuenta? ",
                                color = TextSecondary,
                                fontSize = 13.sp
                            )
                            Text(
                                if (isRegisterMode) "Inicia sesión" else "Regístrate aquí",
                                color = YomoriTeal,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                modifier = Modifier
                                    .clickable {
                                        isRegisterMode = !isRegisterMode
                                        errorMessage = null
                                    }
                                    .padding(vertical = 4.dp)
                            )
                        }

                        // Separador O
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            HorizontalDivider(modifier = Modifier.weight(1f), color = YomoriBorder.copy(alpha = 0.5f))
                            Text("  o  ", color = TextMuted, fontSize = 12.sp)
                            HorizontalDivider(modifier = Modifier.weight(1f), color = YomoriBorder.copy(alpha = 0.5f))
                        }

                        // Botón Explorar como Invitado
                        OutlinedButton(
                            onClick = {
                                UserManager.continueAsGuest()
                                onAuthenticated()
                            },
                            border = ButtonDefaults.outlinedButtonBorder().copy(brush = Brush.linearGradient(listOf(YomoriBorder, YomoriBorder.copy(alpha = 0.4f)))),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp)
                        ) {
                            Text(
                                "Continuar como Invitado",
                                color = TextSecondary,
                                fontWeight = FontWeight.Medium,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
