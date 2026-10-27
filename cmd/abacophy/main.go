package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/yecharlot/AbacoPhy/internal/api"
	"github.com/yecharlot/AbacoPhy/internal/identity"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

const defaultHost = "0.0.0.0"
const defaultPort = "8090"

// resolveBindAddress keeps the legacy PORT variable working while allowing
// deployments to configure the bind host and port independently.
func resolveBindAddress(getenv func(string) string) (host, port, address string) {
	host = strings.TrimSpace(getenv("ABACOPHY_HOST"))
	if host == "" {
		host = defaultHost
	}

	port = strings.TrimSpace(getenv("ABACOPHY_PORT"))
	if port == "" {
		port = strings.TrimSpace(getenv("PORT"))
	}
	if port == "" {
		port = defaultPort
	}

	return host, port, net.JoinHostPort(host, port)
}

func main() {
	host, port, addr := resolveBindAddress(os.Getenv)

	dataDir := os.Getenv("ABACOPHY_DATA")
	if dataDir == "" {
		dataDir = filepath.Join(".", "abacophy_data")
	}
	staticDir := os.Getenv("ABACOPHY_STATIC")
	if staticDir == "" {
		staticDir = "static"
	}

	instance, err := identity.LoadOrCreate(dataDir)
	if err != nil {
		log.Fatal("instance identity:", err)
	}
	fmt.Printf("AbacoPhy instance: %s\n", instance.InstanceID)

	st := store.New(dataDir)
	if err := api.EnsureBootstrap(st); err != nil {
		log.Fatal("bootstrap:", err)
	}

	srv := api.NewServer(st, staticDir)
	fmt.Printf("ÁbacoPhy listening on %s\n", addr)

	// A wildcard bind accepts loopback and LAN connections. A specific host
	// (for example 127.0.0.1) restricts the server to that interface.
	if isWildcardHost(host) {
		fmt.Printf("  App (Local):  http://localhost:%s/\n", port)
		if ifaces, err := net.Interfaces(); err == nil {
			for _, iface := range ifaces {
				if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
					continue
				}
				addrs, err := iface.Addrs()
				if err != nil {
					continue
				}
				for _, a := range addrs {
					if ipnet, ok := a.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
						fmt.Printf("  App (LAN IP): http://%s:%s/\n", ipnet.IP.String(), port)
					}
				}
			}
		}
	} else {
		fmt.Printf("  App:          http://%s/\n", net.JoinHostPort(host, port))
	}
	fmt.Printf("  ANS alias:    http://localhost:%s/w/abacophy.app.ans\n", port)
	fmt.Printf("  API:          http://localhost:%s/api/v1/info\n", port)
	fmt.Println("  Master:       master / AbacoPhy#Master1")
	fmt.Println("  Admin:        admin / admin123")

	handler := api.WithDiscoveryInfo(srv.Handler(), instance.InstanceID)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}

func isWildcardHost(host string) bool {
	return host == "" || host == "0.0.0.0" || host == "::"
}
