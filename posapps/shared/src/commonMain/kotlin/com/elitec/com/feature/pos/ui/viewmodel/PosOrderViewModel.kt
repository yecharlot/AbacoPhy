package com.elitec.com.feature.pos.ui.viewmodel

import androidx.lifecycle.ViewModel
import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import com.elitec.com.feature.pos.domain.entities.CreateSaleLineInput
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class OrderLineDraft(
    val productId: String,
    val productCode: String,
    val productName: String,
    val unitPrice: Double,
    val qty: Double,
) {
    val lineTotal: Double get() = unitPrice * qty
}

data class PosOrderUiState(
    val lines: List<OrderLineDraft> = emptyList(),
    val selectedCategory: String? = null,
    val searchQuery: String = "",
    val paymentMethod: String = "cash",
) {
    val subtotal: Double get() = lines.sumOf { it.lineTotal }
    val tax: Double get() = 0.0
    val total: Double get() = subtotal + tax
    val itemCount: Int get() = lines.sumOf { it.qty.toInt().coerceAtLeast(0) }
}

/**
 * Pedido en curso — persiste al cambiar pantallas mobile (mismo ViewModel en Home).
 */
class PosOrderViewModel : ViewModel() {

    private val _state = MutableStateFlow(PosOrderUiState())
    val state: StateFlow<PosOrderUiState> = _state.asStateFlow()

    fun setSearch(q: String) {
        _state.update { it.copy(searchQuery = q) }
    }

    fun selectCategory(category: String?) {
        _state.update { it.copy(selectedCategory = category) }
    }

    fun setPaymentMethod(method: String) {
        _state.update { it.copy(paymentMethod = method) }
    }

    fun qtyOf(productId: String): Double =
        _state.value.lines.firstOrNull { it.productId == productId }?.qty ?: 0.0

    fun setQty(product: Product, qty: Double, unitPrice: Double) {
        val q = qty.coerceAtLeast(0.0)
        _state.update { st ->
            val without = st.lines.filterNot { it.productId == product.id }
            val next = if (q <= 0.0) without
            else without + OrderLineDraft(
                productId = product.id,
                productCode = product.code,
                productName = product.name,
                unitPrice = unitPrice,
                qty = q,
            )
            st.copy(lines = next)
        }
    }

    fun inc(product: Product, unitPrice: Double) {
        setQty(product, qtyOf(product.id) + 1.0, unitPrice)
    }

    fun dec(product: Product, unitPrice: Double) {
        setQty(product, qtyOf(product.id) - 1.0, unitPrice)
    }

    fun clear() {
        _state.update { it.copy(lines = emptyList()) }
    }

    fun toCreateSaleInput(unitId: String?, seller: String?): CreateSaleInput {
        val lines = _state.value.lines
        require(lines.isNotEmpty()) { "Pedido vacío" }
        return CreateSaleInput(
            unitId = unitId,
            seller = seller,
            lines = lines.map {
                CreateSaleLineInput(
                    productId = it.productId,
                    qty = it.qty,
                    unitPrice = it.unitPrice,
                )
            },
            metadata = """{"payment":"${_state.value.paymentMethod}","source":"pos_kmp"}""",
        )
    }
}
