package com.elitec.abaco_launcher.feature.orchestrator.data

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SystemLanInterfaceResolverTest {
    @Test
    fun excludesVpnAndVirtualAdapters() {
        listOf("ProtonVPN", "WireGuard Tunnel", "TAP-Windows Adapter", "vEthernet (WSL)").forEach {
            assertTrue(isExcludedLanInterface(it), "$it should be excluded")
        }
        assertFalse(isExcludedLanInterface("Wi-Fi"))
        assertFalse(isExcludedLanInterface("Ethernet"))
    }

    @Test
    fun prefersEthernetThenWifiThenOtherAdapters() {
        assertEquals(0, lanInterfacePriority("Ethernet"))
        assertEquals(1, lanInterfacePriority("Wi-Fi"))
        assertEquals(2, lanInterfacePriority("Local Area Connection"))
    }
}
