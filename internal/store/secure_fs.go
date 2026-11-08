package store

import (
 "fmt"
 "io"
 "os"
 "path/filepath"
 "strings"

 "github.com/yecharlot/AbacoPhy/internal/domain"
)

func validStorageName(name string) bool {
 if name == "" || len(name) > 128 || name == "." || name == ".." || strings.TrimSpace(name) != name { return false }
 for _, r := range name { if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_') { return false } }
 return true
}

// openRootForPath anchors every component to an already-open parent directory.
// os.Root keeps subsequent operations confined even if pathnames are replaced.
func openRootForPath(path string) (*os.Root, error) {
 abs, err := filepath.Abs(path); if err != nil { return nil, err }
 volume := filepath.VolumeName(abs)
 rest := strings.TrimPrefix(abs, volume)
 current, err := os.OpenRoot(volume + string(filepath.Separator))
 if err != nil { return nil, err }
 for _, part := range strings.Split(strings.Trim(rest, string(filepath.Separator)), string(filepath.Separator)) {
  if part == "" { continue }
  info, err := current.Lstat(part)
  if err != nil { _ = current.Close(); return nil, err }
  if info.Mode()&os.ModeSymlink != 0 || !info.IsDir() { _ = current.Close(); return nil, fmt.Errorf("componente de ruta no seguro: %q", part) }
  next, err := current.OpenRoot(part)
  if err != nil { _ = current.Close(); return nil, err }
  opened, e1 := next.Stat(".")
  // Lstat is intentional: Stat would follow a symlink swapped into place
  // between the first Lstat and OpenRoot, hiding the substitution.
  named, e2 := current.Lstat(part)
  if e1 != nil || e2 != nil || named.Mode()&os.ModeSymlink != 0 || !named.IsDir() || !os.SameFile(opened, named) {
   _ = next.Close(); _ = current.Close()
   return nil, fmt.Errorf("el componente %q cambió durante su apertura", part)
  }
  _ = current.Close()
  current = next
 }
 return current, nil
}

func ensurePrivateDir(path string) error {
 abs, err := filepath.Abs(path); if err != nil { return err }
 parent, err := openRootForPath(filepath.Dir(abs)); if err != nil { return err }
 defer parent.Close()
 base := filepath.Base(abs)
 info, err := parent.Lstat(base)
 if os.IsNotExist(err) {
  if err = parent.Mkdir(base, 0700); err != nil && !os.IsExist(err) { return err }
  info, err = parent.Lstat(base)
 }
 if err != nil { return err }
 if info.Mode()&os.ModeSymlink != 0 || !info.IsDir() { return fmt.Errorf("directorio no seguro: %q", abs) }
 child, err := parent.OpenRoot(base); if err != nil { return err }
 defer child.Close()
 opened, err := child.Stat("."); if err != nil { return err }
 // Compare against Lstat, not Stat, so a symlink replacement cannot masquerade
 // as the directory that was inspected before OpenRoot.
 named, err := parent.Lstat(base)
 if err != nil || named.Mode()&os.ModeSymlink != 0 || !named.IsDir() || !os.SameFile(opened, named) {
  return fmt.Errorf("el directorio %q cambió durante su apertura", abs)
 }
 dirFile, err := child.OpenFile(".", os.O_RDONLY, 0)
 if err != nil { return err }
 defer dirFile.Close()
 return dirFile.Chmod(0700)
}

func (s *Store) ensureDataDirs() error {
 if err := ensurePrivateDir(s.dataDir); err != nil { return err }
 if err := ensurePrivateDir(filepath.Join(s.dataDir, "tenants")); err != nil { return err }
 return ensurePrivateDir(filepath.Join(s.dataDir, "cids"))
}

func validatePrivateFilename(name string) error {
 base := strings.TrimSuffix(name, filepath.Ext(name))
 if name != "tokens.json" && !validStorageName(base) { return fmt.Errorf("nombre de archivo no válido") }
 if filepath.Base(name) != name || strings.ContainsAny(name, "/\\") { return fmt.Errorf("ruta de archivo no válida") }
 return nil
}

func readPrivateFile(dir, name string) ([]byte, error) {
 if err := validatePrivateFilename(name); err != nil { return nil, err }
 root, err := openRootForPath(dir); if err != nil { return nil, err }; defer root.Close()
 before, err := root.Lstat(name); if err != nil { return nil, err }
 if before.Mode()&os.ModeSymlink != 0 || !before.Mode().IsRegular() { return nil, fmt.Errorf("archivo no regular o symlink: %q", name) }
 f, err := root.OpenFile(name, os.O_RDONLY, 0); if err != nil { return nil, err }; defer f.Close()
 opened, err := f.Stat(); if err != nil { return nil, err }
 after, err := root.Lstat(name)
 if err != nil || after.Mode()&os.ModeSymlink != 0 || !os.SameFile(opened, after) { return nil, fmt.Errorf("el archivo %q cambió durante su apertura", name) }
 if err := f.Chmod(0600); err != nil { return nil, err }
 return io.ReadAll(f)
}

// writePrivateFileAtomic uses a pinned directory root and an already-open file
// descriptor. It verifies the opened inode before truncating, so a concurrent
// symlink swap cannot redirect a write to another path. The name is retained
// for compatibility; descriptor-based replacement is intentionally non-atomic.
func writePrivateFileAtomic(dir, name string, data []byte) error {
 if err := validatePrivateFilename(name); err != nil { return err }
 root, err := openRootForPath(dir); if err != nil { return err }; defer root.Close()

 before, statErr := root.Lstat(name)
 var f *os.File
 if os.IsNotExist(statErr) {
  // O_EXCL makes creation fail if an attacker inserted any entry, including a symlink.
  f, err = root.OpenFile(name, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
 } else if statErr != nil {
  return statErr
 } else {
  if before.Mode()&os.ModeSymlink != 0 || !before.Mode().IsRegular() {
   return fmt.Errorf("destino no regular o symlink: %q", name)
  }
  // Do not use O_TRUNC until the opened inode has been compared with Lstat.
  f, err = root.OpenFile(name, os.O_WRONLY, 0)
 }
 if err != nil { return err }
 defer f.Close()

 opened, err := f.Stat(); if err != nil { return err }
 after, err := root.Lstat(name)
 if err != nil || after.Mode()&os.ModeSymlink != 0 || !after.Mode().IsRegular() || !os.SameFile(opened, after) {
  return fmt.Errorf("el archivo %q cambió durante su apertura", name)
 }
 if err := f.Chmod(0600); err != nil { return err }
 if err := f.Truncate(0); err != nil { return err }
 if _, err := f.Seek(0, io.SeekStart); err != nil { return err }
 if _, err := f.Write(data); err != nil { return err }
 return f.Sync()
}


// OpenTenantSnapshotJSON opens the persisted JSON snapshot for the tenant's
// current CID. The descriptor is validated against the confined cids root and
// remains safe to stream after the root handle is closed.
func (s *Store) OpenTenantSnapshotJSON(tenantID string) (*os.File, int64, *domain.StoreSnapshot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	snap := s.tenants[tenantID]
	if snap == nil || tenantID == "" || snap.RootCID == "" {
		return nil, 0, nil, fmt.Errorf("snapshot tenant no encontrado")
	}
	name := snap.RootCID + ".json"
	if err := validatePrivateFilename(name); err != nil {
		return nil, 0, nil, err
	}
	root, err := openRootForPath(filepath.Join(s.dataDir, "cids"))
	if err != nil { return nil, 0, nil, err }
	defer root.Close()
	before, err := root.Lstat(name)
	if err != nil { return nil, 0, nil, err }
	if before.Mode()&os.ModeSymlink != 0 || !before.Mode().IsRegular() {
		return nil, 0, nil, fmt.Errorf("snapshot CID no regular o symlink")
	}
	file, err := root.OpenFile(name, os.O_RDONLY, 0)
	if err != nil { return nil, 0, nil, err }
	opened, err := file.Stat()
	if err != nil { _ = file.Close(); return nil, 0, nil, err }
	after, err := root.Lstat(name)
	if err != nil || after.Mode()&os.ModeSymlink != 0 || !after.Mode().IsRegular() || !os.SameFile(opened, after) {
		_ = file.Close()
		return nil, 0, nil, fmt.Errorf("snapshot CID cambió durante su apertura")
	}
	if err := file.Chmod(0600); err != nil { _ = file.Close(); return nil, 0, nil, err }
	return file, opened.Size(), snap, nil
}
