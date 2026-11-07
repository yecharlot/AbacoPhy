package store

import (
 "crypto/rand"
 "encoding/hex"
 "fmt"
 "io"
 "os"
 "path/filepath"
 "strings"
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
  named, e2 := current.Stat(part)
  if e1 != nil || e2 != nil || !os.SameFile(opened, named) {
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
 named, err := parent.Stat(base)
 if err != nil || !os.SameFile(opened, named) { return fmt.Errorf("el directorio %q cambió durante su apertura", abs) }
 return child.Chmod(".", 0700)
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

func writePrivateFileAtomic(dir, name string, data []byte) error {
 if err := validatePrivateFilename(name); err != nil { return err }
 root, err := openRootForPath(dir); if err != nil { return err }; defer root.Close()
 if info, statErr := root.Lstat(name); statErr == nil {
  if info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() { return fmt.Errorf("destino no regular o symlink: %q", name) }
 } else if !os.IsNotExist(statErr) { return statErr }
 var nonce [16]byte
 if _, err := rand.Read(nonce[:]); err != nil { return err }
 tmpName := ".abacophy-" + hex.EncodeToString(nonce[:]) + ".tmp"
 tmp, err := root.OpenFile(tmpName, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600); if err != nil { return err }
 removeTemp := true
 defer func() { _ = tmp.Close(); if removeTemp { _ = root.Remove(tmpName) } }()
 if _, err := tmp.Write(data); err != nil { return err }
 if err := tmp.Sync(); err != nil { return err }
 if err := tmp.Close(); err != nil { return err }
 // Rename relative to the pinned root replaces a raced symlink entry; it never follows it.
 if err := root.Rename(tmpName, name); err != nil { return err }
 removeTemp = false
 return root.Chmod(name, 0600)
}
