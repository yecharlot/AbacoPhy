package store

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

func TestStoreRejectsTenantPathTraversal(t *testing.T) {
	st := New(t.TempDir())
	snap := domain.BootstrapTenant("Traversal", "traversal", "CUP")
	snap.Tenant.ID = "../outside"
	if err := st.Put(snap); err == nil {
		t.Fatal("tenant ID containing path traversal must be rejected")
	}
}

func TestStoreRejectsSymlinkedCIDDirectory(t *testing.T) {
	if runtime.GOOS == "windows" { t.Skip("creating symlinks may require elevated Windows privileges") }
	root := t.TempDir()
	outside := t.TempDir()
	if err := os.Symlink(outside, filepath.Join(root, "cids")); err != nil { t.Fatal(err) }
	st := New(root)
	snap := domain.BootstrapTenant("Symlink directory", "symlink-dir", "CUP")
	if err := st.Put(snap); err == nil {
		t.Fatal("store must fail closed when cids/ is a symlink")
	}
	entries, err := os.ReadDir(outside)
	if err != nil { t.Fatal(err) }
	if len(entries) != 0 { t.Fatalf("outside directory was modified: %#v", entries) }
}

func TestStoreRejectsSymlinkedTenantSnapshot(t *testing.T) {
	if runtime.GOOS == "windows" { t.Skip("creating symlinks may require elevated Windows privileges") }
	root := t.TempDir()
	tenants := filepath.Join(root, "tenants")
	if err := os.Mkdir(tenants, 0700); err != nil { t.Fatal(err) }
	outside := filepath.Join(t.TempDir(), "outside.json")
	if err := os.WriteFile(outside, []byte("do not overwrite"), 0600); err != nil { t.Fatal(err) }
	snap := domain.BootstrapTenant("Symlink file", "symlink-file", "CUP")
	if err := os.Symlink(outside, filepath.Join(tenants, snap.Tenant.ID+".json")); err != nil { t.Fatal(err) }

	st := New(root)
	if err := st.Put(snap); err == nil {
		t.Fatal("store must reject a tenant snapshot path that is a symlink")
	}
	got, err := os.ReadFile(outside)
	if err != nil { t.Fatal(err) }
	if string(got) != "do not overwrite" { t.Fatalf("outside target was modified: %q", got) }
}

func TestStoreUsesPrivateFilesystemPermissions(t *testing.T) {
	if runtime.GOOS == "windows" { t.Skip("POSIX permission bits are not portable on Windows") }
	root := t.TempDir()
	st := New(root)
	snap := domain.BootstrapTenant("Private storage", "private-storage", "CUP")
	if err := st.Put(snap); err != nil { t.Fatal(err) }

	for _, dir := range []string{root, filepath.Join(root, "tenants"), filepath.Join(root, "cids")} {
		info, err := os.Stat(dir)
		if err != nil { t.Fatal(err) }
		if got := info.Mode().Perm(); got != 0700 { t.Errorf("%s permissions = %04o, want 0700", dir, got) }
	}
	for _, file := range []string{
		filepath.Join(root, "tenants", snap.Tenant.ID+".json"),
		filepath.Join(root, "cids", snap.RootCID+".json"),
	} {
		info, err := os.Stat(file)
		if err != nil { t.Fatal(err) }
		if got := info.Mode().Perm(); got != 0600 { t.Errorf("%s permissions = %04o, want 0600", file, got) }
	}
}

func TestValidStorageNameRejectsPathSyntax(t *testing.T) {
	for _, name := range []string{"", ".", "..", "../tenant", "a/b", `a\\b`, "tenant id", " tenant"} {
		if validStorageName(name) { t.Errorf("validStorageName(%q) = true, want false", name) }
	}
	for _, name := range []string{"tenant-1", "Tenant_2", "bafkrei0123456789"} {
		if !validStorageName(name) { t.Errorf("validStorageName(%q) = false, want true", name) }
	}
}
