package identity

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const fileName = "instance.json"

// Instance identifies one AbacoPhy installation independently of its IP address or port.
// The identity is persisted in ABACOPHY_DATA so restarting the server does not create
// a new discoverable instance.
type Instance struct {
	InstanceID string `json:"instanceId"`
}

// LoadOrCreate loads the installation identity from dataDir or creates it on first run.
// An existing invalid identity is treated as an error instead of being silently replaced,
// because replacing it would make trusted clients see the installation as a new server.
func LoadOrCreate(dataDir string) (*Instance, error) {
	if strings.TrimSpace(dataDir) == "" {
		return nil, fmt.Errorf("identity data directory is empty")
	}

	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("create identity data directory: %w", err)
	}

	path := filepath.Join(dataDir, fileName)
	data, err := os.ReadFile(path)
	if err == nil {
		var instance Instance
		if err := json.Unmarshal(data, &instance); err != nil {
			return nil, fmt.Errorf("read instance identity: %w", err)
		}
		if !validID(instance.InstanceID) {
			return nil, fmt.Errorf("read instance identity: invalid instanceId")
		}
		return &instance, nil
	}
	if !os.IsNotExist(err) {
		return nil, fmt.Errorf("read instance identity: %w", err)
	}

	id, err := newID()
	if err != nil {
		return nil, fmt.Errorf("generate instance identity: %w", err)
	}
	instance := &Instance{InstanceID: id}

	payload, err := json.MarshalIndent(instance, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("encode instance identity: %w", err)
	}
	payload = append(payload, '\n')

	// Write to a temporary file first so a crash cannot leave a partial identity.
	tmp, err := os.CreateTemp(dataDir, ".instance-*.tmp")
	if err != nil {
		return nil, fmt.Errorf("create temporary identity: %w", err)
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	if err := tmp.Chmod(0600); err != nil {
		_ = tmp.Close()
		return nil, fmt.Errorf("secure temporary identity: %w", err)
	}
	if _, err := tmp.Write(payload); err != nil {
		_ = tmp.Close()
		return nil, fmt.Errorf("write instance identity: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return nil, fmt.Errorf("close instance identity: %w", err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return nil, fmt.Errorf("persist instance identity: %w", err)
	}

	return instance, nil
}

func validID(id string) bool {
	if len(id) != 32 {
		return false
	}
	_, err := hex.DecodeString(id)
	return err == nil
}

func newID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
