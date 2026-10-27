package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"

	"github.com/yecharlot/AbacoPhy/internal/api"
	"github.com/yecharlot/AbacoPhy/internal/identity"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8090"
	}
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
	addr := ":" + port
	fmt.Printf("ÁbacoPhy listening on %s (0.0.0.0)\n", addr)
	fmt.Printf("  App (Local):  http://localhost%s/\n", addr)
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
				if ipnet, ok := a.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
					if ipnet.IP.To4() != nil {
						fmt.Printf("  App (LAN IP): http://%s%s/\n", ipnet.IP.String(), addr)
					}
				}
			}
		}
	}
	fmt.Printf("  ANS alias:    http://localhost%s/w/abacophy.app.ans\n", addr)
	fmt.Printf("  API:          http://localhost%s/api/v1/info\n", addr)
	fmt.Println("  Master:       master / AbacoPhy#Master1")
	fmt.Println("  Admin:        admin / admin123")
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Fatal(err)
	}
}
