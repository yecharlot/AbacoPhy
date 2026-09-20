package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/yecharlot/AbacoPhy/internal/api"
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

	st := store.New(dataDir)
	if err := api.EnsureBootstrap(st); err != nil {
		log.Fatal("bootstrap:", err)
	}

	srv := api.NewServer(st, staticDir)
	addr := ":" + port
	fmt.Printf("ÁbacoPhy listening on %s\n", addr)
	fmt.Printf("  App / PWA:  http://localhost%s/\n", addr)
	fmt.Printf("  ANS alias:  http://localhost%s/w/abacophy.app.ans\n", addr)
	fmt.Printf("  API:        http://localhost%s/api/v1/info\n", addr)
	fmt.Println("  Master:     master / AbacoPhy#Master1")
	fmt.Println("  Admin:      admin / admin123")
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Fatal(err)
	}
}
