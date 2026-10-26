package com.elitec.com.feature.pos.data.repository

import com.elitec.com.feature.pos.data.dataSource.LocalSalesDataSource
import com.elitec.com.feature.pos.data.dataSource.RemoteSalesDataSource
import com.elitec.com.feature.pos.data.dto.toDomain
import com.elitec.com.feature.pos.data.dto.toLocalDto
import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class SaleRepositoryImpl(
    private val local: LocalSalesDataSource,
    private val remote: RemoteSalesDataSource,
) : SalesRepository {

    override suspend fun getSales(): List<Sale> {
        return try {
            val remoteList = remote.listSales()
            local.saveAll(remoteList)
            // 02.K3: no perder ventas pending_local aún no confirmadas
            mergeRemoteWithLocalPending(remoteList.map { it.toDomain() })
        } catch (t: Throwable) {
            AbacoLog.w(LogCategory.POS, "getSales remote fail → local cache: ${t.message}")
            local.getAll().map { it.toDomain() }
        }
    }

    private suspend fun mergeRemoteWithLocalPending(remote: List<Sale>): List<Sale> {
        val pending = local.getAll().map { it.toDomain() }.filter { sale ->
            sale.id.startsWith("local-") ||
                sale.status.equals("pending_local", ignoreCase = true)
        }
        if (pending.isEmpty()) return remote
        val remoteIds = remote.map { it.id }.toHashSet()
        val extra = pending.filter { it.id !in remoteIds }
        if (extra.isEmpty()) return remote
        return (remote + extra).sortedByDescending { it.date }
    }

    override suspend fun getSalesByUnitId(unitId: String): List<Sale> {
        val all = getSales()
        if (unitId.isBlank()) return all
        return all.filter { it.unitId == unitId }
    }

    override suspend fun getSaleById(id: String): Sale? {
        local.getById(id)?.let { return it.toDomain() }
        return try {
            val remoteDto = remote.getById(id) ?: return null
            local.save(remoteDto)
            remoteDto.toDomain()
        } catch (_: Throwable) {
            null
        }
    }

    /**
     * Online: POST remoto.
     * Offline/outbox: [RegisterSaleCaseUse] no usa este método para el camino cola;
     * se conserva por contrato del repositorio.
     */
    override suspend fun createSale(input: CreateSaleInput): Sale {
        val created = remote.createSale(input)
        local.save(created)
        return created.toDomain()
    }

    override fun observeSalesFlow(): Flow<List<Sale>> =
        local.getSalesFlow().map { list -> list.map { it.toDomain() } }

    override suspend fun cacheSale(sale: Sale) {
        local.save(sale.toLocalDto())
    }

    override suspend fun replaceProvisional(clientOpId: String, confirmed: Sale) {
        local.deleteById("local-$clientOpId")
        local.save(confirmed.toLocalDto())
    }
}
