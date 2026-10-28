package main

import "testing"

func env(values map[string]string) func(string) string {
	return func(key string) string {
		return values[key]
	}
}

func TestResolveBindAddressDefaults(t *testing.T) {
	host, port, address := resolveBindAddress(env(nil))
	if host != "0.0.0.0" {
		t.Fatalf("host = %q, want 0.0.0.0", host)
	}
	if port != "8090" {
		t.Fatalf("port = %q, want 8090", port)
	}
	if address != "0.0.0.0:8090" {
		t.Fatalf("address = %q, want 0.0.0.0:8090", address)
	}
}

func TestResolveBindAddressLegacyPort(t *testing.T) {
	host, port, address := resolveBindAddress(env(map[string]string{
		"PORT": "18090",
	}))
	if host != "0.0.0.0" || port != "18090" || address != "0.0.0.0:18090" {
		t.Fatalf("got host=%q port=%q address=%q", host, port, address)
	}
}

func TestResolveBindAddressNewVariablesTakePrecedence(t *testing.T) {
	host, port, address := resolveBindAddress(env(map[string]string{
		"ABACOPHY_HOST": "127.0.0.1",
		"ABACOPHY_PORT": "18091",
		"PORT":          "18090",
	}))
	if host != "127.0.0.1" || port != "18091" || address != "127.0.0.1:18091" {
		t.Fatalf("got host=%q port=%q address=%q", host, port, address)
	}
}

func TestResolveBindAddressAllowsLocalhostOnly(t *testing.T) {
	host, port, address := resolveBindAddress(env(map[string]string{
		"ABACOPHY_HOST": "127.0.0.1",
		"PORT":          "8095",
	}))
	if host != "127.0.0.1" || port != "8095" || address != "127.0.0.1:8095" {
		t.Fatalf("got host=%q port=%q address=%q", host, port, address)
	}
}

func TestResolveBindAddressSupportsIPv6Host(t *testing.T) {
	_, _, address := resolveBindAddress(env(map[string]string{
		"ABACOPHY_HOST": "::1",
		"ABACOPHY_PORT": "8096",
	}))
	if address != "[::1]:8096" {
		t.Fatalf("address = %q, want [::1]:8096", address)
	}
}

func TestIsWildcardHost(t *testing.T) {
	for _, host := range []string{"", "0.0.0.0", "::"} {
		if !isWildcardHost(host) {
			t.Errorf("isWildcardHost(%q) = false, want true", host)
		}
	}
	for _, host := range []string{"127.0.0.1", "localhost", "::1"} {
		if isWildcardHost(host) {
			t.Errorf("isWildcardHost(%q) = true, want false", host)
		}
	}
}
