package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/yecharlot/AbacoPhy/internal/api"
	"github.com/yecharlot/AbacoPhy/internal/discovery"
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
	host, _, addr := resolveBindAddress(os.Getenv)

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

	handler := api.WithDiscoveryInfo(api.NewServer(st, staticDir).Handler(), instance.InstanceID)
	// Record one event per LAN IP when a remote client reaches the REST API.
	// The launcher consumes this log to expose live client connection status.
	apiHandler := handler
	var seenClients sync.Map
	handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host, _, splitErr := net.SplitHostPort(r.RemoteAddr)
		if splitErr == nil && strings.HasPrefix(r.URL.Path, "/api/") {
			ip := net.ParseIP(host)
			if ip != nil && !ip.IsLoopback() && !ip.IsUnspecified() {
				if _, loaded := seenClients.LoadOrStore(ip.String(), struct{}{}); !loaded {
					log.Printf("CLIENT_CONNECTED remote=%s path=%s", ip.String(), r.URL.Path)
				}
			}
		}
		apiHandler.ServeHTTP(w, r)
	})
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatal("listen:", err)
	}
	actualPort := listener.Addr().(*net.TCPAddr).Port
	httpServer := &http.Server{Handler: handler}

	// Start serving before announcing the service. The listener is already bound,
	// so clients that discover it can immediately reach the HTTP server.
	go func() {
		if err := httpServer.Serve(listener); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP server: %v", err)
		}
	}()

	fmt.Printf("ÁbacoPhy listening on %s\n", listener.Addr().String())
	if isWildcardHost(host) {
		fmt.Printf("  App (Local):  http://localhost:%d/\n", actualPort)
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
						fmt.Printf("  App (LAN IP): http://%s:%d/\n", ipnet.IP.String(), actualPort)
					}
				}
			}
		}
	} else {
		fmt.Printf("  App:          http://%s/\n", net.JoinHostPort(host, fmt.Sprint(actualPort)))
	}
	fmt.Printf("  ANS alias:    http://localhost:%d/w/abacophy.app.ans\n", actualPort)
	fmt.Printf("  API:          http://localhost:%d/api/v1/info\n", actualPort)
	fmt.Println("  Master:       master / AbacoPhy#Master1")
	fmt.Println("  Admin:        admin / admin123")

	var mdnsServer interface{ Shutdown() }
	if discovery.ShouldAdvertise(host) {
		mdnsServer, err = discovery.Advertise(discovery.Config{
			InstanceID:      instance.InstanceID,
			Name:            discovery.DefaultServiceName,
			Version:         discovery.ServerVersion,
			APIVersion:      discovery.APIVersion,
			Web:             true,
			PairingRequired: false,
		}, actualPort)
		if err != nil {
			log.Printf("mDNS discovery unavailable (HTTP server remains active): %v", err)
		} else {
			fmt.Printf("  Discovery:    _abacophy._tcp.local (port %d)\n", actualPort)
		}
	} else {
		log.Printf("mDNS discovery disabled for local-only bind host %q", host)
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	if mdnsServer != nil {
		mdnsServer.Shutdown()
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("HTTP shutdown: %v", err)
	}
}

func isWildcardHost(host string) bool {
	return host == "" || host == "0.0.0.0" || host == "::"
}
