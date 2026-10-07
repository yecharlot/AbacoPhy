package com.elitec.com.feature.pos.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridItemSpan
import androidx.compose.foundation.lazy.staggeredgrid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.AirplaneTicket
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AirplaneTicket
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Outbox
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AddShoppingCart
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.EditNote
import androidx.compose.material.icons.rounded.Error
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PointOfSale
import androidx.compose.material.icons.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.ShoppingCartCheckout
import androidx.compose.material.icons.rounded.Store
import androidx.compose.material.icons.rounded.Tag
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.catalog.domain.entities.effectiveUnitPrice
import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import com.elitec.com.feature.pos.domain.entities.CreateSaleLineInput
import com.elitec.com.feature.pos.ui.uiStates.RegisterSaleUiState
import com.gursimar.composive.responsive.core.DeviceConfiguration
import com.gursimar.composive.responsive.core.rememberDeviceConfiguration
import com.gursimar.composive.responsive.theme.AppTheme
import kotlinx.coroutines.delay
import kotlin.math.min
import kotlin.math.roundToLong
import kotlin.time.Duration.Companion.milliseconds


data class DraftLineUi(
    val product: Product,
    val qty: String = "1",
    val unitPrice: String = "",
)

/* ================================================================== */
/*  NewSaleForm (punto de entrada adaptativo)                          */
/* ================================================================== */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewSaleForm(
    assignedUnit: AssignedUnitUiState,
    seller: String,
    products: List<Product>,
    stockOf: (String) -> Double,
    registerState: RegisterSaleUiState,
    onSubmit: (CreateSaleInput) -> Unit,
    onClearRegisterState: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val deviceConfiguration = rememberDeviceConfiguration()
    val colors = AppTheme.materialColors

    // ---------- Estado ----------
    var search by remember { mutableStateOf("") }
    var lines by remember { mutableStateOf<List<DraftLineUi>>(emptyList()) }
    var note by remember { mutableStateOf("") }
    var formError by remember { mutableStateOf<String?>(null) }
    var mobileTab by rememberSaveable { mutableIntStateOf(0) } // 0 = catálogo, 1 = ticket

    val unitId = (assignedUnit as? AssignedUnitUiState.Ready)?.unitId.orEmpty()

    val filtered = remember(products, search) {
        val q = search.trim().lowercase()
        if (q.isEmpty()) products.take(30)
        else products.filter {
            it.name.lowercase().contains(q) || it.code.lowercase().contains(q)
        }.take(30)
    }

    val ticketTotal = lines.sumOf {
        val q = it.qty.toDoubleOrNull() ?: 0.0
        val p = it.unitPrice.toDoubleOrNull() ?: 0.0
        q * p
    }

    LaunchedEffect(registerState) {
        if (registerState is RegisterSaleUiState.Success) {
            lines = emptyList()
            note = ""
            formError = null
            mobileTab = 0
            delay(2200.milliseconds)
            onClearRegisterState()
        }
    }

    val saving = registerState is RegisterSaleUiState.Saving
    val success = registerState is RegisterSaleUiState.Success
    val regError = (registerState as? RegisterSaleUiState.Error)?.message

    // ---------- Acciones ----------
    val updateLine: (String, (DraftLineUi) -> DraftLineUi) -> Unit = { id, transform ->
        lines = lines.map { if (it.product.id == id) transform(it) else it }
    }

    val addProduct: (Product) -> Unit = { p ->
        if (!saving && stockOf(p.id) > 0 && lines.none { it.product.id == p.id }) {
            val price = p.effectiveUnitPrice()
            lines = lines + DraftLineUi(p, "1", if (price > 0) price.toString() else "")
            formError = null
        }
    }

    val stepQty: (String, Int) -> Unit = { id, delta ->
        updateLine(id) { line ->
            val current = line.qty.toDoubleOrNull() ?: 0.0
            var next = (current + delta).coerceAtLeast(1.0)
            val maxStock = stockOf(id)
            // Al sumar con "+" no se supera el stock disponible
            if (delta > 0 && maxStock >= 1.0) next = min(next, maxStock)
            line.copy(qty = formatQty(next))
        }
    }

    val submit: () -> Unit = {
        val (input, error) = buildSaleInput(assignedUnit, unitId, seller, note, lines)
        formError = error
        if (input != null) onSubmit(input)
    }

    // ---------- Piezas compuestas (se reordenan según el tamaño de pantalla) ----------
    val header: @Composable (Boolean) -> Unit = { stacked ->
        SaleHeader(assignedUnit = assignedUnit, seller = seller, stacked = stacked)
    }

    val catalog: @Composable (Modifier) -> Unit = { m ->
        CatalogPane(
            search = search,
            onSearchChange = { search = it },
            filtered = filtered,
            catalogIsEmpty = products.isEmpty(),
            stockOf = stockOf,
            saving = saving,
            inTicketIds = lines.map { it.product.id }.toSet(),
            onAdd = addProduct,
            modifier = m,
        )
    }

    val ticket: @Composable (Modifier) -> Unit = { m ->
        TicketPane(
            lines = lines,
            note = note,
            onNoteChange = { note = it },
            saving = saving,
            onQtyChange = { id, v -> updateLine(id) { it.copy(qty = v) } },
            onPriceChange = { id, v -> updateLine(id) { it.copy(unitPrice = v) } },
            onStep = stepQty,
            onRemove = { id -> lines = lines.filterNot { it.product.id == id } },
            modifier = m,
        )
    }

    val footer: @Composable (Boolean) -> Unit = { compact ->
        SaleFooter(
            compact = compact,
            total = ticketTotal,
            itemCount = lines.size,
            saving = saving,
            success = success,
            errorText = formError ?: regError,
            canSubmit = !saving && assignedUnit is AssignedUnitUiState.Ready,
            onSubmit = submit,
        )
    }

    /** Panel del ticket: lista + nota + total + botón. */
    val ticketPanel: @Composable (Modifier, Boolean) -> Unit = { m, compactFooter ->
        Surface(
            modifier = m,
            shape = RoundedCornerShape(22.dp),
            color = colors.surfaceContainer,
        ) {
            Column(Modifier.padding(14.dp)) {
                ticket(Modifier.weight(1f))
                Spacer(Modifier.height(8.dp))
                footer(compactFooter)
            }
        }
    }

    // ---------- Contenedor ----------
    Surface(
        modifier = modifier.fillMaxHeight(),
        shape = RoundedCornerShape(28.dp),
        color = colors.surfaceContainerLow,
        tonalElevation = 2.dp,
        shadowElevation = 4.dp,
    ) {
        BoxWithConstraints(Modifier.padding(AppTheme.dimensions.cardPadding)) {

            // 1) El layout preferido depende del tipo de pantalla...
            // 2) ...pero se degrada si el espacio REAL del componente no alcanza
            //    (p. ej. ventana de escritorio estrecha). Así nunca se apiña.
            val layout = when (deviceConfiguration) {
                DeviceConfiguration.MOBILE_PORTRAIT -> SaleLayout.TABS

                DeviceConfiguration.MOBILE_LANDSCAPE ->
                    if (maxWidth >= 640.dp) SaleLayout.TWO_PANE else SaleLayout.TABS

                DeviceConfiguration.TABLET_PORTRAIT ->
                    if (maxHeight >= 720.dp) SaleLayout.STACKED else SaleLayout.TABS

                DeviceConfiguration.TABLET_LANDSCAPE,
                DeviceConfiguration.DESKTOP -> when {
                    maxWidth >= 760.dp -> SaleLayout.TWO_PANE
                    maxHeight >= 720.dp -> SaleLayout.STACKED
                    else -> SaleLayout.TABS
                }
            }

            // Ancho fijo del panel del ticket (patrón "carrito lateral")
            val ticketWidth = when (deviceConfiguration) {
                DeviceConfiguration.MOBILE_LANDSCAPE -> 300.dp
                DeviceConfiguration.DESKTOP -> 400.dp
                else -> 360.dp
            }

            Column(Modifier.fillMaxSize()) {
                when (layout) {

                    // Una sola columna: Catálogo y Ticket alternan; total y CTA siempre visibles.
                    SaleLayout.TABS -> {
                        header(this@BoxWithConstraints.maxWidth < 520.dp)
                        Spacer(Modifier.height(12.dp))

                        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                            SegmentedButton(
                                selected = mobileTab == 0,
                                onClick = { mobileTab = 0 },
                                shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
                                icon = {
                                    Icon(
                                        Icons.Rounded.Inventory2, null,
                                        Modifier.size(SegmentedButtonDefaults.IconSize)
                                    )
                                },
                                label = { Text("Catálogo") },
                            )
                            SegmentedButton(
                                selected = mobileTab == 1,
                                onClick = { mobileTab = 1 },
                                shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
                                icon = {
                                    Icon(
                                        Icons.Rounded.ReceiptLong, null,
                                        Modifier.size(SegmentedButtonDefaults.IconSize)
                                    )
                                },
                                label = { Text(if (lines.isEmpty()) "Ticket" else "Ticket (${lines.size})") },
                            )
                        }
                        Spacer(Modifier.height(12.dp))

                        AnimatedContent(
                            targetState = mobileTab,
                            modifier = Modifier.weight(1f),
                            transitionSpec = {
                                val dir = if (targetState > initialState) 1 else -1
                                (slideInHorizontally { it * dir / 4 } + fadeIn()) togetherWith
                                        (slideOutHorizontally { -it * dir / 4 } + fadeOut())
                            },
                            label = "mobileTab",
                        ) { tab ->
                            if (tab == 0) catalog(Modifier.fillMaxSize())
                            else ticket(Modifier.fillMaxSize())
                        }

                        Spacer(Modifier.height(8.dp))
                        footer(true)
                    }

                    // Catálogo arriba y ticket abajo, ambos a todo el ancho.
                    SaleLayout.STACKED -> {
                        header(false)
                        Spacer(Modifier.height(12.dp))
                        catalog(Modifier.weight(0.45f).fillMaxWidth())
                        Spacer(Modifier.height(12.dp))
                        ticketPanel(Modifier.weight(0.55f).fillMaxWidth(), true)
                    }

                    // Catálogo flexible + panel de ticket de ancho fijo.
                    SaleLayout.TWO_PANE -> {
                        header(false)
                        Spacer(Modifier.height(12.dp))
                        Row(
                            modifier = Modifier.weight(1f),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            catalog(Modifier.weight(1f).fillMaxHeight())
                            ticketPanel(
                                Modifier.width(ticketWidth).fillMaxHeight(),
                                deviceConfiguration == DeviceConfiguration.MOBILE_LANDSCAPE,
                            )
                        }
                    }
                }
            }
        }
    }
}

/** Distribución efectiva del formulario. */
private enum class SaleLayout { TABS, STACKED, TWO_PANE }

/* ================================================================== */
/*  Lógica de validación (misma que antes, fuera de la UI)             */
/* ================================================================== */

private fun buildSaleInput(
    assignedUnit: AssignedUnitUiState,
    unitId: String,
    seller: String,
    note: String,
    lines: List<DraftLineUi>,
): Pair<CreateSaleInput?, String?> {
    if (assignedUnit is AssignedUnitUiState.Loading || assignedUnit is AssignedUnitUiState.Idle) {
        return null to "Espere a que cargue el punto de venta"
    }
    if (unitId.isBlank()) return null to "No hay Punto de Venta asignado a este usuario"
    if (lines.isEmpty()) return null to "Añade al menos un producto"

    val saleLines = mutableListOf<CreateSaleLineInput>()
    for (line in lines) {
        val qty = line.qty.toDoubleOrNull()
        if (qty == null || qty <= 0) return null to "Cantidad inválida en ${line.product.name}"

        val price = line.unitPrice.toDoubleOrNull()
        if (price == null || price <= 0.0) {
            return null to "Indique precio de venta en «${line.product.name}». " +
                    "Sin ficha de precio ni price_sale el sistema no puede calcular el importe."
        }
        saleLines += CreateSaleLineInput(
            productId = line.product.id,
            qty = qty,
            unitPrice = price,
        )
    }
    return CreateSaleInput(
        unitId = unitId,
        seller = seller,
        note = note.ifBlank { null },
        lines = saleLines,
    ) to null
}

/* ================================================================== */
/*  Cabecera                                                           */
/* ================================================================== */

@Composable
private fun SaleHeader(
    assignedUnit: AssignedUnitUiState,
    seller: String,
    stacked: Boolean,
) {
    val colors = AppTheme.materialColors

    val title: @Composable () -> Unit = {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(44.dp)
                    .background(colors.primary.copy(alpha = 0.14f), RoundedCornerShape(14.dp)),
            ) {
                Icon(Icons.Rounded.PointOfSale, null, tint = colors.primary, modifier = Modifier.size(24.dp))
            }
            Column {
                Text(
                    "Nueva venta",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = colors.onSurface,
                )
                if (seller.isNotBlank()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(Icons.Rounded.Person, null, tint = colors.onSurfaceVariant, modifier = Modifier.size(14.dp))
                        Text(
                            seller,
                            style = MaterialTheme.typography.labelMedium,
                            color = colors.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
    }

    Column {
        if (stacked) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                title()
                UnitChip(assignedUnit, Modifier.fillMaxWidth())
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.End),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.weight(1f)) { title() }
                UnitChip(assignedUnit, Modifier.weight(1f, fill = false))
            }
        }
        Spacer(Modifier.height(12.dp))
        HorizontalDivider(color = colors.outlineVariant.copy(alpha = 0.6f))
    }
}

/** Estado del punto de venta asignado, como chip. */
@Composable
private fun UnitChip(assignedUnit: AssignedUnitUiState, modifier: Modifier = Modifier) {
    val colors = AppTheme.materialColors
    val isProblem = assignedUnit is AssignedUnitUiState.None || assignedUnit is AssignedUnitUiState.Error

    val container by animateColorAsState(
        targetValue = when {
            assignedUnit is AssignedUnitUiState.Ready -> colors.primaryContainer.copy(alpha = 0.7f)
            isProblem -> colors.errorContainer.copy(alpha = 0.7f)
            else -> colors.surfaceContainerHighest
        },
        animationSpec = tween(300),
        label = "unitChipBg",
    )
    val content = when {
        assignedUnit is AssignedUnitUiState.Ready -> colors.onPrimaryContainer
        isProblem -> colors.onErrorContainer
        else -> colors.onSurfaceVariant
    }

    Row(
        modifier = modifier
            .background(container, RoundedCornerShape(16.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        when (assignedUnit) {
            AssignedUnitUiState.Idle, AssignedUnitUiState.Loading -> {
                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = content)
                Text("Cargando punto de venta…", style = MaterialTheme.typography.bodySmall, color = content)
            }

            is AssignedUnitUiState.Ready -> {
                Icon(Icons.Rounded.Store, null, tint = content, modifier = Modifier.size(20.dp))
                Column {
                    Text("Punto de venta", style = MaterialTheme.typography.labelSmall, color = content.copy(alpha = 0.8f))
                    Text(
                        assignedUnit.unitName,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = content,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }

            AssignedUnitUiState.None -> {
                Icon(Icons.Rounded.Error, null, tint = content, modifier = Modifier.size(18.dp))
                Text(
                    "Sin punto de venta asignado. Un administrador debe asociarlo al usuario.",
                    style = MaterialTheme.typography.bodySmall,
                    color = content,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
            }

            is AssignedUnitUiState.Error -> {
                Icon(Icons.Rounded.Error, null, tint = content, modifier = Modifier.size(18.dp))
                Text(
                    assignedUnit.message,
                    style = MaterialTheme.typography.bodySmall,
                    color = content,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
            }
        }
    }
}

/* ================================================================== */
/*  Catálogo                                                           */
/* ================================================================== */

@Composable
private fun CatalogPane(
    search: String,
    onSearchChange: (String) -> Unit,
    filtered: List<Product>,
    catalogIsEmpty: Boolean,
    stockOf: (String) -> Double,
    saving: Boolean,
    inTicketIds: Set<String>,
    onAdd: (Product) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier) {
        SectionTitle(
            icon = Icons.Rounded.Inventory2,
            title = "Catálogo de productos",
            badge = filtered.size.toString(),
        )
        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = search,
            onValueChange = onSearchChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            enabled = !saving,
            leadingIcon = { Icon(Icons.Rounded.Search, null) },
            trailingIcon = {
                AnimatedVisibility(visible = search.isNotEmpty(), enter = fadeIn(), exit = fadeOut()) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .clickable { onSearchChange("") },
                    ) {
                        Icon(Icons.Rounded.Close, "Limpiar búsqueda", Modifier.size(20.dp))
                    }
                }
            },
            placeholder = {
                Text("Buscar producto o código", maxLines = 1, overflow = TextOverflow.Ellipsis)
            },
            shape = RoundedCornerShape(16.dp),
        )
        Spacer(Modifier.height(8.dp))

        LazyVerticalStaggeredGrid(
            // Nº de columnas según el ancho real del panel (nunca tarjetas < 220 dp)
            columns = StaggeredGridCells.Adaptive(minSize = 220.dp),
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalItemSpacing = 8.dp,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(bottom = 4.dp),
        ) {
            if (filtered.isEmpty()) {
                item(span = StaggeredGridItemSpan.FullLine) {
                    EmptyHint(
                        icon = Icons.Rounded.Search,
                        text = if (catalogIsEmpty) "Sin productos cargados" else "Sin coincidencias",
                    )
                }
            }
            items(filtered, key = { it.id }) { p ->
                ProductPickItem(
                    product = p,
                    stock = stockOf(p.id),
                    inTicket = p.id in inTicketIds,
                    saving = saving,
                    onClick = { onAdd(p) },
                    modifier = Modifier.animateItem(),
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ProductPickItem(
    product: Product,
    stock: Double,
    inTicket: Boolean,
    saving: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.materialColors
    val outOfStock = stock <= 0
    val price = product.effectiveUnitPrice()

    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.97f else 1f,
        animationSpec = spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessMedium),
        label = "pickScale",
    )
    val container by animateColorAsState(
        targetValue = if (inTicket) colors.primary.copy(alpha = 0.12f) else colors.surfaceContainer,
        animationSpec = tween(250),
        label = "pickBg",
    )

    Surface(
        onClick = onClick,
        enabled = !saving && !outOfStock && !inTicket,
        interactionSource = interactionSource,
        shape = RoundedCornerShape(16.dp),
        color = container,
        modifier = modifier
            .scale(scale)
            .alpha(if (outOfStock) 0.55f else 1f),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    product.name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                ) {
                    Icon(Icons.Rounded.Tag, null, tint = colors.onSurfaceVariant, modifier = Modifier.size(12.dp))
                    Text(
                        product.code,
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    val stockColor = if (outOfStock) colors.error else colors.onSurfaceVariant
                    Text(
                        text = if (outOfStock) "Agotado" else "Stock ${stock.toInt()}",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Medium,
                        color = stockColor,
                        maxLines = 1,
                        softWrap = false,
                        modifier = Modifier
                            .background(stockColor.copy(alpha = 0.12f), CircleShape)
                            .padding(horizontal = 8.dp, vertical = 2.dp),
                    )
                    if (price > 0.0) {
                        Text(
                            formatMoney(price),
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = colors.primary,
                        )
                    } else {
                        Text(
                            "Sin precio",
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.tertiary,
                        )
                    }
                }
            }

            // Botón que cambia a "check" al añadirse
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(36.dp)
                    .background(
                        if (inTicket) colors.primary else colors.primary.copy(alpha = 0.14f),
                        CircleShape,
                    ),
            ) {
                AnimatedContent(
                    targetState = inTicket,
                    transitionSpec = { (fadeIn(tween(150)) + slideInVertically { it / 2 }) togetherWith fadeOut(tween(100)) },
                    label = "pickIcon",
                ) { added ->
                    Icon(
                        imageVector = if (added) Icons.Rounded.Check else Icons.Rounded.Add,
                        contentDescription = if (added) "En el ticket" else "Añadir",
                        tint = if (added) colors.onPrimary else colors.primary,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }
    }
}

/* ================================================================== */
/*  Ticket                                                             */
/* ================================================================== */

@Composable
private fun TicketPane(
    lines: List<DraftLineUi>,
    note: String,
    onNoteChange: (String) -> Unit,
    saving: Boolean,
    onQtyChange: (String, String) -> Unit,
    onPriceChange: (String, String) -> Unit,
    onStep: (String, Int) -> Unit,
    onRemove: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier) {
        SectionTitle(
            icon = Icons.Rounded.ReceiptLong,
            title = "Ticket",
            badge = lines.size.takeIf { it > 0 }?.toString(),
        )
        Spacer(Modifier.height(8.dp))

        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (lines.isEmpty()) {
                item {
                    EmptyHint(icon = Icons.Rounded.AddShoppingCart, text = "Añade productos al ticket")
                }
            }
            items(lines, key = { it.product.id }) { line ->
                TicketLineItem(
                    line = line,
                    saving = saving,
                    onQtyChange = { onQtyChange(line.product.id, it) },
                    onPriceChange = { onPriceChange(line.product.id, it) },
                    onStep = { onStep(line.product.id, it) },
                    onRemove = { onRemove(line.product.id) },
                    modifier = Modifier.animateItem(),
                )
            }
        }

        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = note,
            onValueChange = onNoteChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            enabled = !saving,
            leadingIcon = { Icon(Icons.Rounded.EditNote, null) },
            label = { Text("Nota") },
            shape = RoundedCornerShape(16.dp),
        )
    }
}

@Composable
private fun TicketLineItem(
    line: DraftLineUi,
    saving: Boolean,
    onQtyChange: (String) -> Unit,
    onPriceChange: (String) -> Unit,
    onStep: (Int) -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.materialColors
    val qty = line.qty.toDoubleOrNull() ?: 0.0
    val price = line.unitPrice.toDoubleOrNull() ?: 0.0

    val qtyStepper: @Composable () -> Unit = {
        LabeledField("Cantidad") {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .height(40.dp)
                    .background(colors.surfaceContainerLow, RoundedCornerShape(12.dp))
                    .then(
                        if (qty <= 0.0) Modifier.border(1.dp, colors.error, RoundedCornerShape(12.dp))
                        else Modifier
                    ),
            ) {
                StepButton(Icons.Rounded.Remove, "Menos", enabled = !saving) { onStep(-1) }
                NumberField(
                    value = line.qty,
                    onValueChange = onQtyChange,
                    enabled = !saving,
                    plain = true,
                    centered = true,
                    modifier = Modifier.width(36.dp),
                )
                StepButton(Icons.Rounded.Add, "Más", enabled = !saving) { onStep(1) }
            }
        }
    }

    val priceField: @Composable (Modifier) -> Unit = { m ->
        LabeledField("Precio", m) {
            NumberField(
                value = line.unitPrice,
                onValueChange = onPriceChange,
                enabled = !saving,
                placeholder = "0.00",
                isError = price <= 0.0,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = colors.surfaceContainerHighest,
    ) {
        // El ancho REAL de la línea decide si caben las 3 columnas o se apila.
        BoxWithConstraints {
            val wide = maxWidth >= 360.dp

            Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                // Nombre + eliminar
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            line.product.name,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.onSurface,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            line.product.code,
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.onSurfaceVariant,
                        )
                    }
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .clickable(enabled = !saving, onClick = onRemove),
                    ) {
                        Icon(
                            Icons.Rounded.DeleteOutline, "Quitar del ticket",
                            tint = colors.error, modifier = Modifier.size(22.dp),
                        )
                    }
                }

                if (wide) {
                    // Cantidad · Precio · Subtotal en una fila
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        qtyStepper()
                        priceField(Modifier.weight(1f))
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                "Subtotal",
                                style = MaterialTheme.typography.labelSmall,
                                color = colors.onSurfaceVariant,
                            )
                            Box(Modifier.height(40.dp), contentAlignment = Alignment.CenterEnd) {
                                Text(
                                    formatMoney(qty * price),
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.primary,
                                    maxLines = 1,
                                )
                            }
                        }
                    }
                } else {
                    // Estrecho: cantidad + precio en una fila y subtotal en otra
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        qtyStepper()
                        priceField(Modifier.weight(1f))
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "Subtotal",
                            style = MaterialTheme.typography.labelMedium,
                            color = colors.onSurfaceVariant,
                        )
                        Text(
                            formatMoney(qty * price),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = colors.primary,
                            maxLines = 1,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LabeledField(
    label: String,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = AppTheme.materialColors.onSurfaceVariant)
        content()
    }
}

@Composable
private fun StepButton(
    icon: ImageVector,
    description: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .clickable(enabled = enabled, onClick = onClick),
    ) {
        Icon(icon, description, tint = AppTheme.materialColors.primary, modifier = Modifier.size(18.dp))
    }
}

/** Campo numérico compacto (solo dígitos y punto). */
@Composable
private fun NumberField(
    value: String,
    onValueChange: (String) -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
    placeholder: String = "0",
    isError: Boolean = false,
    centered: Boolean = false,
    plain: Boolean = false,
) {
    val colors = AppTheme.materialColors
    val shape = RoundedCornerShape(12.dp)

    BasicTextField(
        value = value,
        onValueChange = { v -> onValueChange(v.filter { it.isDigit() || it == '.' }) },
        enabled = enabled,
        singleLine = true,
        textStyle = MaterialTheme.typography.bodyMedium.copy(
            color = colors.onSurface,
            fontWeight = FontWeight.SemiBold,
            textAlign = if (centered) TextAlign.Center else TextAlign.Start,
        ),
        cursorBrush = SolidColor(colors.primary),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = modifier,
        decorationBox = { inner ->
            Box(
                contentAlignment = if (centered) Alignment.Center else Alignment.CenterStart,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(40.dp)
                    .then(
                        if (plain) Modifier
                        else Modifier
                            .background(colors.surfaceContainerLow, shape)
                            .then(if (isError) Modifier.border(1.dp, colors.error, shape) else Modifier)
                            .padding(horizontal = 10.dp)
                    ),
            ) {
                if (value.isEmpty()) {
                    Text(
                        placeholder,
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.onSurfaceVariant.copy(alpha = 0.6f),
                    )
                }
                inner()
            }
        },
    )
}

/* ================================================================== */
/*  Footer: mensajes + total + CTA                                     */
/* ================================================================== */

@Composable
private fun SaleFooter(
    compact: Boolean,
    total: Double,
    itemCount: Int,
    saving: Boolean,
    success: Boolean,
    errorText: String?,
    canSubmit: Boolean,
    onSubmit: () -> Unit,
) {
    val colors = AppTheme.materialColors

    val totalBlock: @Composable (Modifier) -> Unit = { m ->
        Column(m) {
            Text(
                text = if (itemCount == 0) "Total" else "Total · $itemCount ${if (itemCount == 1) "producto" else "productos"}",
                style = MaterialTheme.typography.labelMedium,
                color = colors.onSurfaceVariant,
            )
            AnimatedContent(
                targetState = total,
                transitionSpec = {
                    if (targetState >= initialState) {
                        (slideInVertically { it } + fadeIn()) togetherWith (slideOutVertically { -it } + fadeOut())
                    } else {
                        (slideInVertically { -it } + fadeIn()) togetherWith (slideOutVertically { it } + fadeOut())
                    }
                },
                label = "saleTotal",
            ) { t ->
                Text(
                    formatMoney(t),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.ExtraBold,
                    color = colors.primary,
                    maxLines = 1,
                )
            }
        }
    }

    val submitButton: @Composable (Modifier) -> Unit = { m ->
        Button(
            onClick = onSubmit,
            enabled = canSubmit,
            modifier = m.height(48.dp),
            shape = RoundedCornerShape(16.dp),
        ) {
            if (saving) {
                CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = colors.onPrimary)
            } else {
                Icon(Icons.Rounded.ShoppingCartCheckout, null, Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text("Registrar venta", fontWeight = FontWeight.SemiBold)
            }
        }
    }

    Column {
        AnimatedVisibility(
            visible = errorText != null,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically(),
        ) {
            StatusBanner(
                text = errorText.orEmpty(),
                icon = Icons.Rounded.Error,
                container = colors.errorContainer,
                content = colors.onErrorContainer,
            )
        }
        AnimatedVisibility(
            visible = success,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically(),
        ) {
            StatusBanner(
                text = "Venta registrada",
                icon = Icons.Rounded.CheckCircle,
                container = colors.primaryContainer,
                content = colors.onPrimaryContainer,
            )
        }

        Spacer(Modifier.height(8.dp))
        HorizontalDivider(color = colors.outlineVariant.copy(alpha = 0.6f))
        Spacer(Modifier.height(8.dp))

        if (compact) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                totalBlock(Modifier.weight(1f))
                submitButton(Modifier)
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                totalBlock(Modifier)
            }
            Spacer(Modifier.height(10.dp))
            submitButton(Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun StatusBanner(
    text: String,
    icon: ImageVector,
    container: Color,
    content: Color,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp)
            .background(container, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(icon, null, tint = content, modifier = Modifier.size(18.dp))
        Text(
            text,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Medium,
            color = content,
            modifier = Modifier.weight(1f),
        )
    }
}

/* ================================================================== */
/*  Piezas pequeñas compartidas                                        */
/* ================================================================== */

@Composable
private fun SectionTitle(icon: ImageVector, title: String, badge: String? = null) {
    val colors = AppTheme.materialColors
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(icon, null, tint = colors.primary, modifier = Modifier.size(20.dp))
        Text(
            title,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
            color = colors.onSurface,
            modifier = Modifier.weight(1f),
        )
        if (badge != null) {
            Text(
                badge,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = colors.primary,
                modifier = Modifier
                    .background(colors.primary.copy(alpha = 0.14f), CircleShape)
                    .padding(horizontal = 8.dp, vertical = 2.dp),
            )
        }
    }
}

@Composable
private fun EmptyHint(icon: ImageVector, text: String) {
    val colors = AppTheme.materialColors
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(icon, null, tint = colors.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(32.dp))
        Text(text, style = MaterialTheme.typography.bodySmall, color = colors.onSurfaceVariant)
    }
}

/* ------------------------------------------------------------------ */
/*  Formato (sin java.text: compatible con commonMain)                 */
/* ------------------------------------------------------------------ */

/** 1234567.5 -> "$1,234,567.50" */
private fun formatMoney(value: Double): String {
    val cents = (value * 100).roundToLong()
    val whole = cents / 100
    val decimals = (cents % 100).toString().padStart(2, '0')
    val grouped = whole.toString().reversed().chunked(3).joinToString(",").reversed()
    return "$$grouped.$decimals"
}

/** 3.0 -> "3"; 2.5 -> "2.5" */
private fun formatQty(value: Double): String =
    if (value % 1.0 == 0.0) value.toLong().toString() else value.toString()