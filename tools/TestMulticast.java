import java.net.InetAddress;
import java.net.MulticastSocket;
import java.net.NetworkInterface;

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
            NetworkInterface networkInterface =
                NetworkInterface.getByInetAddress(
                    InetAddress.getByName(PHYSICAL_IPV4)
                );

            if (networkInterface == null) {
                System.err.println(
                    "NO_INTERFACE_FOR_IP address=" + PHYSICAL_IPV4
                );
                System.exit(2);
            }

            System.out.println("INTERFACE=" + networkInterface.getName());
            System.out.println("DISPLAY_NAME=" + networkInterface.getDisplayName());
            System.out.println("UP=" + networkInterface.isUp());
            System.out.println("LOOPBACK=" + networkInterface.isLoopback());
            System.out.println("MULTICAST_SUPPORTED=" +
                networkInterface.supportsMulticast());

            try (MulticastSocket socket = new MulticastSocket()) {
                socket.setNetworkInterface(networkInterface);
                System.out.println("SOCKET_MULTICAST_OK");
            } catch (Exception e) {
                System.err.println("SOCKET_MULTICAST_FAILED");
                e.printStackTrace();
                System.exit(1);
            }
        } catch (Exception e) {
            System.err.println("DIAGNOSTIC_FAILED");
            e.printStackTrace();
            System.exit(1);
        }
    }
}
