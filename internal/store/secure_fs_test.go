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
	
	root := t.TempDir()
	outside := t.TempDir()
	if err := os.Symlink(outside, filepath.Join(root, "cids")); err != nil { t.Skipf("symlink creation unavailable on %s: %v", runtime.GOOS, err) }
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
	root := t.TempDir()
	tenants := filepath.Join(root, "tenants")
	if err := os.Mkdir(tenants, 0700); err != nil { t.Fatal(err) }
	outside := filepath.Join(t.TempDir(), "outside.json")
	if err := os.WriteFile(outside, []byte("do not overwrite"), 0600); err != nil { t.Fatal(err) }
	snap := domain.BootstrapTenant("Symlink file", "symlink-file", "CUP")
	if err := os.Symlink(outside, filepath.Join(tenants, snap.Tenant.ID+".json")); err != nil { t.Skipf("symlink creation unavailable on %s: %v", runtime.GOOS, err) }

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

func TestPinnedRootRemainsConfinedAfterDirectorySwap(t *testing.T) {
 rootPath, outside := t.TempDir(), t.TempDir()
 originalPath := filepath.Join(rootPath, "tenants")
 if err := os.Mkdir(originalPath, 0700); err != nil { t.Fatal(err) }
 pinned, err := openRootForPath(originalPath); if err != nil { t.Fatal(err) }; defer pinned.Close()
 moved := filepath.Join(rootPath, "tenants-original")
 if err := os.Rename(originalPath, moved); err != nil { t.Fatal(err) }
 if err := os.Symlink(outside, originalPath); err != nil { t.Skipf("symlink creation unavailable: %v", err) }
 f, err := pinned.OpenFile("confined.json", os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0600); if err != nil { t.Fatal(err) }
 if _, err := f.Write([]byte("confined")); err != nil { t.Fatal(err) }; if err := f.Close(); err != nil { t.Fatal(err) }
 if _, err := os.Stat(filepath.Join(outside, "confined.json")); !os.IsNotExist(err) { t.Fatalf("operation escaped pinned root: %v", err) }
 got, err := os.ReadFile(filepath.Join(moved, "confined.json")); if err != nil { t.Fatal(err) }
 if string(got) != "confined" { t.Fatalf("unexpected contents: %q", got) }
}

func TestPrivateFileOperationsRejectSymlinkTargets(t *testing.T) {
 dir, outsideDir := t.TempDir(), t.TempDir()
 outside := filepath.Join(outsideDir, "outside.json")
 if err := os.WriteFile(outside, []byte("keep"), 0600); err != nil { t.Fatal(err) }
 if err := os.Symlink(outside, filepath.Join(dir, "tenant-1.json")); err != nil { t.Skipf("symlink creation unavailable: %v", err) }
 if _, err := readPrivateFile(dir, "tenant-1.json"); err == nil { t.Fatal("expected symlink read rejection") }
 if err := writePrivateFileAtomic(dir, "tenant-1.json", []byte("overwrite")); err == nil { t.Fatal("expected symlink write rejection") }
 got, err := os.ReadFile(outside); if err != nil { t.Fatal(err) }
 if string(got) != "keep" { t.Fatalf("outside file modified: %q", got) }
}


func TestOpenRootRejectsSymlinkedPathComponent(t *testing.T) {
 root := t.TempDir()
 outside := t.TempDir()
 link := filepath.Join(root, "linked")
 if err := os.Symlink(outside, link); err != nil { t.Skipf("symlink creation unavailable on %s: %v", runtime.GOOS, err) }
 if _, err := openRootForPath(link); err == nil { t.Fatal("expected symlink path component to be rejected") }
}

func TestEnsurePrivateDirRejectsSymlinkSubdirectory(t *testing.T) {
 root := t.TempDir()
 outside := t.TempDir()
 link := filepath.Join(root, "private")
 if err := os.Symlink(outside, link); err != nil { t.Skipf("symlink creation unavailable on %s: %v", runtime.GOOS, err) }
 if err := ensurePrivateDir(link); err == nil { t.Fatal("expected symlink directory to be rejected") }
}


func TestResetAllDoesNotFollowReplacedTenantDirectory(t *testing.T) {
 root := t.TempDir()
 st := New(root)
 outside := t.TempDir()
 sentinel := filepath.Join(outside, "keep.json")
 if err := os.WriteFile(sentinel, []byte("preserve"), 0600); err != nil { t.Fatal(err) }
 tenants := filepath.Join(root, "tenants")
 moved := filepath.Join(root, "tenants-original")
 if err := os.Rename(tenants, moved); err != nil { t.Fatal(err) }
 if err := os.Symlink(outside, tenants); err != nil { t.Skipf("symlink creation unavailable on %s: %v", runtime.GOOS, err) }
 if err := st.ResetAll(); err == nil { t.Fatal("ResetAll should reject a replaced tenant directory") }
 got, err := os.ReadFile(sentinel)
 if err != nil { t.Fatal(err) }
 if string(got) != "preserve" { t.Fatalf("outside sentinel changed: %q", got) }
}


func TestOpenTenantSnapshotJSONStreamsCurrentPersistedCID(t *testing.T) {
	root := t.TempDir()
	st := New(root)
	snap := domain.BootstrapTenant("Stream snapshot", "stream-snapshot", "CUP")
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	file, size, current, err := st.OpenTenantSnapshotJSON(snap.Tenant.ID)
	if err != nil { t.Fatal(err) }
	defer file.Close()
	if current.RootCID != snap.RootCID { t.Fatalf("CID=%q, want %q", current.RootCID, snap.RootCID) }
	info, err := os.Stat(filepath.Join(root, "cids", snap.RootCID+".json"))
	if err != nil { t.Fatal(err) }
	if size != info.Size() { t.Fatalf("reported size=%d, file size=%d", size, info.Size()) }
	data := make([]byte, size)
	if _, err := file.Read(data); err != nil { t.Fatal(err) }
	if len(data) == 0 || data[0] != '{' { t.Fatalf("snapshot JSON not found: %q", data[:min(len(data), 32)]) }
}

func TestOpenTenantSnapshotJSONRejectsUnknownTenant(t *testing.T) {
	st := New(t.TempDir())
	if file, _, _, err := st.OpenTenantSnapshotJSON("missing-tenant"); err == nil {
		if file != nil { _ = file.Close() }
		t.Fatal("expected unknown tenant to fail")
	}
}
