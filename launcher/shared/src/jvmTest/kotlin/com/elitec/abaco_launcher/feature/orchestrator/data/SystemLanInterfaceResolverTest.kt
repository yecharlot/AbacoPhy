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

    @Test
    fun acceptsOnlyPrivateIpv4RangesForLanBinding() {
        listOf("10.0.0.8", "172.16.0.4", "172.31.255.254", "192.168.1.20").forEach {
            assertTrue(isPrivateIpv4(it), "$it should be accepted")
        }
        listOf("8.8.8.8", "172.32.0.1", "192.167.1.2", "169.254.1.2", "127.0.0.1").forEach {
            assertFalse(isPrivateIpv4(it), "$it should not be accepted")
        }
    }
}
