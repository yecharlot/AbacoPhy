package com.elitec.abaco_launcher.feature.orchestrator.data

import kotlin.test.Test
import kotlin.test.assertTrue

class SystemPortResolverTest {
    @Test
    fun resolvePort_null_returnsEphemeral() {
        val port = SystemPortResolver().resolvePort(null)
        assertTrue(port in 1..65535)
    }
}
