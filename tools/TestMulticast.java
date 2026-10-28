import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.MulticastSocket;
import java.net.NetworkInterface;
import java.util.Collections;

/**
 * Diagnóstico independiente de JmDNS para Windows.
 *
 * Ejecutar con el mismo JDK que utiliza AbacoPOS Desktop:
 *   javac tools/TestMulticast.java
 *   java -cp tools TestMulticast
 *
 * Ejecutar una vez con la VPN desconectada y otra con la VPN conectada.
 * No modifica la configuración de red ni el flujo de Android.
 */
public final class TestMulticast {
    private static final String PHYSICAL_IPV4 = "10.214.5.177";

    public static void main(String[] args) {
        try {
            InetAddress ipv4 = InetAddress.getByName(PHYSICAL_IPV4);
            NetworkInterface networkInterface =
                NetworkInterface.getByInetAddress(ipv4);

            if (networkInterface == null) {
                System.err.println("NO_INTERFACE_FOR_IP address=" + PHYSICAL_IPV4);
                System.exit(2);
                return;
            }

            System.out.println("JAVA_VERSION=" + System.getProperty("java.version"));
            System.out.println("JAVA_VENDOR=" + System.getProperty("java.vendor"));
            System.out.println("PREFER_IPV4_STACK=" +
                System.getProperty("java.net.preferIPv4Stack"));
            System.out.println("INTERFACE=" + networkInterface.getName());
            System.out.println("DISPLAY_NAME=" + networkInterface.getDisplayName());
            System.out.println("UP=" + networkInterface.isUp());
            System.out.println("LOOPBACK=" + networkInterface.isLoopback());
            System.out.println("MULTICAST_SUPPORTED=" +
                networkInterface.supportsMulticast());

            Collections.list(networkInterface.getInetAddresses()).forEach(address -> {
                String family = address instanceof Inet4Address ? "IPv4"
                    : address instanceof Inet6Address ? "IPv6" : "OTHER";
                System.out.println("ADDRESS_" + family + "=" + address.getHostAddress());
            });

            boolean modernSucceeded = testModernOption(networkInterface);
            boolean ipv4Succeeded = testIpv4Option(ipv4);

            System.out.println("RESULT_MODERN_NETWORK_INTERFACE=" + modernSucceeded);
            System.out.println("RESULT_IPV4_INTERFACE=" + ipv4Succeeded);

            if (!modernSucceeded && !ipv4Succeeded) {
                System.exit(1);
            }
        } catch (Exception e) {
            System.err.println("DIAGNOSTIC_FAILED");
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static boolean testModernOption(NetworkInterface networkInterface) {
        try (MulticastSocket socket = new MulticastSocket()) {
            socket.setNetworkInterface(networkInterface);
            System.out.println("MODERN_SET_NETWORK_INTERFACE_OK");
            return true;
        } catch (Exception e) {
            System.err.println("MODERN_SET_NETWORK_INTERFACE_FAILED");
            e.printStackTrace();
            return false;
        }
    }

    @SuppressWarnings("deprecation")
    private static boolean testIpv4Option(InetAddress ipv4) {
        try (MulticastSocket socket = new MulticastSocket()) {
            socket.setInterface(ipv4);
            System.out.println("IPV4_SET_INTERFACE_OK");
            return true;
        } catch (Exception e) {
            System.err.println("IPV4_SET_INTERFACE_FAILED");
            e.printStackTrace();
            return false;
        }
    }
}
