package com.elitec.abaco_launcher.feature.orchestrator.data

import com.elitec.abaco_launcher.feature.orchestrator.domain.models.LanInterfaceOption
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

/**
 * Enumera interfaces IPv4 privadas utilizables para el servidor LAN.
 * El identificador persistido es el nombre del adaptador, nunca la IP DHCP.
 */
class SystemLanInterfaceResolver {
    fun list(): List<LanInterfaceOption> {
        val interfaces = runCatching {
            NetworkInterface.getNetworkInterfaces()?.let { Collections.list(it) }.orEmpty()
        }.getOrElse { return emptyList() }

        return interfaces.flatMap { networkInterface ->
            runCatching {
                val displayName = networkInterface.displayName.orEmpty()
                val identity = networkInterface.name
                val searchableName = "$identity $displayName"
                if (
                    !networkInterface.isUp ||
                    networkInterface.isLoopback ||
                    networkInterface.isVirtual ||
                    isExcludedLanInterface(searchableName)
                ) {
                    emptyList()
                } else {
                    Collections.list(networkInterface.inetAddresses)
                        .filterIsInstance<Inet4Address>()
                        .filter { address ->
                            !address.isAnyLocalAddress &&
                                !address.isLoopbackAddress &&
                                !address.isLinkLocalAddress &&
                                !address.isMulticastAddress &&
                                isPrivateIpv4(address.hostAddress)
                        }
                        .take(1)
                        .map { address ->
                            LanInterfaceOption(
                                interfaceName = identity,
                                displayName = displayName.ifBlank { identity },
                                address = address.hostAddress,
                            )
                        }
                }
            }.getOrDefault(emptyList())
        }.distinctBy { "${it.interfaceName}|${it.address}" }
            .sortedWith(
                compareBy<LanInterfaceOption> { lanInterfacePriority("${it.interfaceName} ${it.displayName}") }
                    .thenBy { it.displayName.lowercase() }
                    .thenBy { it.address },
            )
    }

    /** Relee la IP actual del adaptador seleccionado; no reutiliza una IP DHCP antigua. */
    fun resolve(interfaceName: String): LanInterfaceOption? =
        list().firstOrNull { it.interfaceName == interfaceName }
}

internal fun isExcludedLanInterface(name: String): Boolean {
    val normalized = name.lowercase()
    return listOf(
        "vpn", "proton", "wireguard", "wintun", "tunnel", "tun",
        "tap", "tailscale", "zerotier", "hamachi", "virtual",
        "vmware", "vbox", "docker", "wsl", "vethernet",
        "bluetooth", "teredo",
    ).any { token -> normalized.contains(token) }
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

internal fun isPrivateIpv4(raw: String): Boolean {
    val parts = raw.split(".").mapNotNull(String::toIntOrNull)
    if (parts.size != 4 || parts.any { it !in 0..255 }) return false
    return parts[0] == 10 ||
        (parts[0] == 172 && parts[1] in 16..31) ||
        (parts[0] == 192 && parts[1] == 168)
}
