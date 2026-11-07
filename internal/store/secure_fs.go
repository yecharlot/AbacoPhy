package store

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func validStorageName(name string) bool {
	if name == "" || len(name) > 128 || name == "." || name == ".." || strings.TrimSpace(name) != name { return false }
	for _, r := range name {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_') { return false }
	}
	return true
}

// ensurePrivateDir rejects symlinks and non-directories in every path component.
func ensurePrivateDir(path string) error {
	abs, err := filepath.Abs(path)
	if err != nil { return err }
	volume := filepath.VolumeName(abs)
	rest := strings.TrimPrefix(abs, volume)
	current := volume + string(filepath.Separator)
	for _, part := range strings.Split(strings.Trim(rest, string(filepath.Separator)), string(filepath.Separator)) {
		if part == "" { continue }
		current = filepath.Join(current, part)
		info, statErr := os.Lstat(current)
		if os.IsNotExist(statErr) {
			if err := os.Mkdir(current, 0700); err != nil && !os.IsExist(err) { return fmt.Errorf("crear directorio %q: %w", current, err) }
			info, statErr = os.Lstat(current)
		}
		if statErr != nil { return fmt.Errorf("inspeccionar directorio %q: %w", current, statErr) }
		if info.Mode()&os.ModeSymlink != 0 || !info.IsDir() { return fmt.Errorf("componente de directorio no seguro: %q", current) }
	}
	if err := os.Chmod(abs, 0700); err != nil { return fmt.Errorf("restringir permisos de %q: %w", abs, err) }
	return nil
}

func (s *Store) ensureDataDirs() error {
	if err := ensurePrivateDir(s.dataDir); err != nil { return err }
	if err := ensurePrivateDir(filepath.Join(s.dataDir, "tenants")); err != nil { return err }
	if err := ensurePrivateDir(filepath.Join(s.dataDir, "cids")); err != nil { return err }
	return nil
}

func safeRegularFile(dir, name string) (string, error) {
	base := strings.TrimSuffix(name, filepath.Ext(name))
	if name != "tokens.json" && !validStorageName(base) { return "", fmt.Errorf("nombre de archivo no válido") }
	if filepath.Base(name) != name || strings.ContainsAny(name, `/\\`) { return "", fmt.Errorf("ruta de archivo no válida") }
	if err := ensurePrivateDir(dir); err != nil { return "", err }
	path := filepath.Join(dir, name)
	info, err := os.Lstat(path)
	if err == nil {
		if info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() { return "", fmt.Errorf("archivo de datos no regular o symlink: %q", name) }
	} else if !os.IsNotExist(err) { return "", err }
	return path, nil
}

func readPrivateFile(dir, name string) ([]byte, error) {
	path, err := safeRegularFile(dir, name)
	if err != nil { return nil, err }
	raw, err := os.ReadFile(path)
	if err != nil { return nil, err }
	_ = os.Chmod(path, 0600)
	return raw, nil
}

func writePrivateFileAtomic(dir, name string, data []byte) error {
	path, err := safeRegularFile(dir, name)
	if err != nil { return err }
	tmp, err := os.CreateTemp(dir, ".abacophy-*.tmp")
	if err != nil { return err }
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err := tmp.Chmod(0600); err != nil { _ = tmp.Close(); return err }
	if _, err := tmp.Write(data); err != nil { _ = tmp.Close(); return err }
	if err := tmp.Sync(); err != nil { _ = tmp.Close(); return err }
	if err := tmp.Close(); err != nil { return err }
	if err := os.Rename(tmpName, path); err != nil { return err }
	if err := os.Chmod(path, 0600); err != nil { return err }
	return nil
}
