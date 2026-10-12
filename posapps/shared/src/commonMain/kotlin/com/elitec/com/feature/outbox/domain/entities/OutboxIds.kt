package com.elitec.com.feature.outbox.domain.entities

import kotlin.random.Random

/** Genera ids locales e idempotency keys sin dependencias extra. */
object OutboxIds {
    fun newEntryId(): String = "obx-${randomHex(16)}"

    fun newClientOpId(): String =
        "${randomHex(8)}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}"

    private fun randomHex(n: Int): String {
        val alphabet = "0123456789abcdef"
        return buildString(n) {
            repeat(n) { append(alphabet[Random.nextInt(alphabet.length)]) }
        }
    }
}
