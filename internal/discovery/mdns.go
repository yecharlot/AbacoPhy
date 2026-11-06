package discovery

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"

	"github.com/grandcat/zeroconf"
)

const (
	ServiceType = "_abacophy._tcp"
	ServiceDomain = "local."
	DefaultServiceName = "AbacoPhy Oficina"
	ServerVersion = "0.1.0"
	APIVersion = 1
)

type Config struct {
	InstanceID string
	Name string
	Version string
	APIVersion int
	Web bool
	PairingRequired bool
}

func TXTRecords(cfg Config) []string {
	name := strings.TrimSpace(cfg.Name)
	if name == "" { name = DefaultServiceName }
	version := strings.TrimSpace(cfg.Version)
	if version == "" { version = ServerVersion }
	apiVersion := cfg.APIVersion
	if apiVersion <= 0 { apiVersion = APIVersion }
	web := "0"
	if cfg.Web { web = "1" }
	pairing := "0"
	if cfg.PairingRequired { pairing = "1" }
	return []string{
		"id=" + strings.TrimSpace(cfg.InstanceID),
		"name=" + name,
		"version=" + version,
		"api=" + strconv.Itoa(apiVersion),
		"web=" + web,
		"pairing=" + pairing,
	}
}

func ShouldAdvertise(host string) bool {
	host = strings.TrimSpace(host)
	if host == "" || host == "0.0.0.0" || host == "::" { return true }
	if strings.EqualFold(host, "localhost") { return false }
	if ip := net.ParseIP(host); ip != nil { return !ip.IsLoopback() && !ip.IsUnspecified() }
	return true
}

func Advertise(cfg Config, port int) (*zeroconf.Server, error) {
	return AdvertiseOnInterface(cfg, port, "")
}

// AdvertiseOnInterface publishes the service only through the interface that
// owns interfaceIP. An empty interfaceIP preserves the legacy all-interface
// behavior for callers that explicitly choose it.
func AdvertiseOnInterface(cfg Config, port int, interfaceIP string) (*zeroconf.Server, error) {
	if strings.TrimSpace(cfg.InstanceID) == "" {
		return nil, fmt.Errorf("advertise AbacoPhy: instance ID is empty")
	}
	if port < 1 || port > 65535 {
		return nil, fmt.Errorf("advertise AbacoPhy: invalid port %d", port)
	}
	name := strings.TrimSpace(cfg.Name)
	if name == "" {
		name = DefaultServiceName
	}

	if strings.TrimSpace(interfaceIP) == "" {
		server, err := zeroconf.Register(name, ServiceType, ServiceDomain, port, TXTRecords(cfg), nil)
		if err != nil {
			return nil, fmt.Errorf("register AbacoPhy mDNS service: %w", err)
		}
		return server, nil
	}

	ip := net.ParseIP(strings.TrimSpace(interfaceIP))
	if ip == nil || ip.To4() == nil || ip.IsLoopback() || ip.IsUnspecified() {
		return nil, fmt.Errorf("advertise AbacoPhy: invalid LAN IPv4 address %q", interfaceIP)
	}
	iface, err := interfaceForIPv4(ip)
	if err != nil {
		return nil, err
	}
	hostname, err := os.Hostname()
	if err != nil {
		return nil, fmt.Errorf("resolve host name for mDNS: %w", err)
	}
	server, err := zeroconf.RegisterProxy(
		name, ServiceType, ServiceDomain, port,
		hostname+"."+strings.TrimSuffix(ServiceDomain, ".")+".",
		[]string{ip.String()}, TXTRecords(cfg), []net.Interface{*iface},
	)
	if err != nil {
		return nil, fmt.Errorf("register AbacoPhy mDNS on %s: %w", ip.String(), err)
	}
	return server, nil
}

func interfaceForIPv4(ip net.IP) (*net.Interface, error) {
	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, fmt.Errorf("list network interfaces: %w", err)
	}
	for i := range interfaces {
		iface := &interfaces[i]
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			var candidate net.IP
			switch value := addr.(type) {
			case *net.IPNet:
				candidate = value.IP
			case *net.IPAddr:
				candidate = value.IP
			}
			if candidate != nil && candidate.To4() != nil && candidate.Equal(ip) {
				return iface, nil
			}
		}
	}
	return nil, fmt.Errorf("LAN IPv4 address %s is not assigned to an active network interface", ip.String())
}
