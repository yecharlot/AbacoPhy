package com.elitec.com.feature.outbox.di

import com.elitec.com.feature.outbox.data.repository.OutboxRepositoryImpl
import com.elitec.com.feature.outbox.domain.repositories.OutboxRepository
import com.elitec.com.feature.outbox.domain.usecases.EnqueueOutboxOp
import com.elitec.com.feature.outbox.domain.usecases.ListRetryableOutboxOps
import com.elitec.com.feature.outbox.domain.usecases.MarkOutboxConfirmed
import com.elitec.com.feature.outbox.domain.usecases.MarkOutboxFailedRetry
import com.elitec.com.feature.outbox.domain.usecases.MarkOutboxInFlight
import com.elitec.com.feature.outbox.domain.usecases.MarkOutboxRejected
import com.elitec.com.feature.outbox.domain.usecases.ObserveOutbox
import com.elitec.com.feature.outbox.domain.usecases.ObservePendingOutbox
import com.elitec.com.feature.outbox.domain.usecases.ObservePendingOutboxCount
import com.elitec.com.feature.outbox.domain.usecases.PurgeConfirmedOutbox
import com.elitec.com.infraestructure.data.database.AbacoDataBase
import org.koin.dsl.module

val outboxModule = module {
    single { get<AbacoDataBase>().getOutboxDao() }
    single<OutboxRepository> { OutboxRepositoryImpl(get()) }

    factory { EnqueueOutboxOp(get()) }
    factory { ObserveOutbox(get()) }
    factory { ObservePendingOutbox(get()) }
    factory { ObservePendingOutboxCount(get()) }
    factory { ListRetryableOutboxOps(get()) }
    factory { MarkOutboxInFlight(get()) }
    factory { MarkOutboxConfirmed(get()) }
    factory { MarkOutboxRejected(get()) }
    factory { MarkOutboxFailedRetry(get()) }
    factory { PurgeConfirmedOutbox(get()) }
}
