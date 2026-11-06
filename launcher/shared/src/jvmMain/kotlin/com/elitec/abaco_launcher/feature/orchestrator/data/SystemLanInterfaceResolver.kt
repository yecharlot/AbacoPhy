package com.elitec.abaco_launcher.feature.orchestrator.data

import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

internal data class LanInterfaceAddress(
    val interfaceName: String,
    val address: String,
)

/**
 * Detecta una interfaz LAN física sin pedir al usuario que conozca su IPv4.
 * Prefiere Ethernet, luego Wi-Fi; excluye VPN, túneles y adaptadores virtuales.
 */
class SystemLanInterfaceResolver {
    fun resolve(): LanInterfaceAddress? {
        val interfaces = runCatching {
            NetworkInterface.getNetworkInterfaces()?.let { Collections.list(it) }.orEmpty()
        }.getOrElse { return null }

        return interfaces.flatMap { networkInterface ->
            runCatching {
                val displayName = networkInterface.displayName.orEmpty()
                val name = listOf(networkInterface.name, displayName).joinToString(" ")
                if (
                    !networkInterface.isUp ||
                    networkInterface.isLoopback ||
                    networkInterface.isVirtual ||
                    isExcludedLanInterface(name)
                ) {
                    emptyList()
                } else {
                    Collections.list(networkInterface.inetAddresses)
                        .filterIsInstance<Inet4Address>()
                        .filter { address ->
                            !address.isAnyLocalAddress &&
                                !address.isLoopbackAddress &&
                                !address.isLinkLocalAddress &&
                                !address.isMulticastAddress
                        }
                        .map { address ->
                            LanInterfaceAddress(
                                interfaceName = displayName.ifBlank { networkInterface.name },
                                address = address.hostAddress,
                            )
                        }
                }
            }.getOrDefault(emptyList())
        }.sortedWith(
            compareBy<LanInterfaceAddress> { lanInterfacePriority(it.interfaceName) }
                .thenBy { if (isPrivateIpv4(it.address)) 0 else 1 }
                .thenBy { it.interfaceName.lowercase() },
        ).firstOrNull()
    }
}

internal fun isExcludedLanInterface(name: String): Boolean {
    val normalized = name.lowercase()
    return listOf(
        "vpn", "proton", "wireguard", "wintun", "tunnel", "tun",
        "tap", "tailscale", "zerotier", "hamachi", "virtual",
        "vmware", "vbox", "docker", "wsl", "vethernet",
        "bluetooth", "teredo",
    ).any(normalized::contains)
}

internal fun lanInterfacePriority(name: String): Int {
    val normalized = name.lowercase()
    return when {
        "ethernet" in normalized || normalized.startsWith("eth") -> 0
        "wi-fi" in normalized || "wifi" in normalized ||
            "wlan" in normalized || "wireless" in normalized -> 1
        else -> 2
    }
}

private fun isPrivateIpv4(raw: String): Boolean {
    val parts = raw.split(".").mapNotNull(String::toIntOrNull)
    if (parts.size != 4 || parts.any { it !in 0..255 }) return false
    return parts[0] == 10 ||
        (parts[0] == 172 && parts[1] in 16..31) ||
        (parts[0] == 192 && parts[1] == 168)
}
