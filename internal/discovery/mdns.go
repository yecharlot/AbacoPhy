package discovery

import (
	"fmt"
	"net"
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
	if strings.TrimSpace(cfg.InstanceID) == "" { return nil, fmt.Errorf("advertise AbacoPhy: instance ID is empty") }
	if port < 1 || port > 65535 { return nil, fmt.Errorf("advertise AbacoPhy: invalid port %d", port) }
	name := strings.TrimSpace(cfg.Name)
	if name == "" { name = DefaultServiceName }
	server, err := zeroconf.Register(name, ServiceType, ServiceDomain, port, TXTRecords(cfg), nil)
	if err != nil { return nil, fmt.Errorf("register AbacoPhy mDNS service: %w", err) }
	return server, nil
}
