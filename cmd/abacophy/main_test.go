package main

import "testing"

func env(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestResolveBindAddressDefaultsToLocal(t *testing.T) {
	mode, host, port, address, err := resolveBindAddress(env(nil))
	if err != nil { t.Fatal(err) }
	if mode != bindModeLocal || host != "127.0.0.1" || port != "8090" || address != "127.0.0.1:8090" {
		t.Fatalf("got mode=%q host=%q port=%q address=%q", mode, host, port, address)
	}
}

func TestResolveBindAddressLocalRejectsNonLoopback(t *testing.T) {
	_, _, _, _, err := resolveBindAddress(env(map[string]string{"ABACOPHY_HOST":"0.0.0.0"}))
	if err == nil { t.Fatal("expected LOCAL to reject wildcard host") }
}

func TestResolveBindAddressLANDefaultsToWildcardOnlyWhenExplicit(t *testing.T) {
	mode, host, _, address, err := resolveBindAddress(env(map[string]string{"ABACOPHY_BIND_MODE":"LAN"}))
	if err != nil { t.Fatal(err) }
	if mode != bindModeLAN || host != "0.0.0.0" || address != "0.0.0.0:8090" {
		t.Fatalf("got mode=%q host=%q address=%q", mode, host, address)
	}
}

func TestResolveBindAddressLANAllowsSpecificInterface(t *testing.T) {
	_, host, _, address, err := resolveBindAddress(env(map[string]string{
		"ABACOPHY_BIND_MODE":"LAN", "ABACOPHY_HOST":"192.168.1.20", "PORT":"18090",
	}))
	if err != nil { t.Fatal(err) }
	if host != "192.168.1.20" || address != "192.168.1.20:18090" {
		t.Fatalf("got host=%q address=%q", host, address)
	}
}

func TestResolveBindAddressLANRejectsLoopback(t *testing.T) {
	_, _, _, _, err := resolveBindAddress(env(map[string]string{
		"ABACOPHY_BIND_MODE":"LAN", "ABACOPHY_HOST":"127.0.0.1",
	}))
	if err == nil { t.Fatal("expected LAN to reject loopback host") }
}

func TestResolveBindAddressProductionRequiresExplicitHost(t *testing.T) {
	_, _, _, _, err := resolveBindAddress(env(map[string]string{"ABACOPHY_BIND_MODE":"PRODUCTION"}))
	if err == nil { t.Fatal("expected PRODUCTION to require ABACOPHY_HOST") }
}

func TestResolveBindAddressProductionAllowsExplicitReverseProxyLoopback(t *testing.T) {
	mode, host, _, address, err := resolveBindAddress(env(map[string]string{
		"ABACOPHY_BIND_MODE":"PRODUCTION", "ABACOPHY_HOST":"127.0.0.1",
	}))
	if err != nil { t.Fatal(err) }
	if mode != bindModeProduction || host != "127.0.0.1" || address != "127.0.0.1:8090" {
		t.Fatalf("got mode=%q host=%q address=%q", mode, host, address)
	}
}

func TestResolveBindAddressProductionAllowsExplicitContainerWildcard(t *testing.T) {
	_, host, _, address, err := resolveBindAddress(env(map[string]string{
		"ABACOPHY_BIND_MODE":"PRODUCTION", "ABACOPHY_HOST":"0.0.0.0", "PORT":"10000",
	}))
	if err != nil { t.Fatal(err) }
	if host != "0.0.0.0" || address != "0.0.0.0:10000" {
		t.Fatalf("got host=%q address=%q", host, address)
	}
}

func TestResolveBindAddressRejectsUnknownMode(t *testing.T) {
	_, _, _, _, err := resolveBindAddress(env(map[string]string{"ABACOPHY_BIND_MODE":"PUBLIC"}))
	if err == nil { t.Fatal("expected invalid bind mode error") }
}

func TestResolveBindAddressLegacyPortAndNewPortPrecedence(t *testing.T) {
	_, _, port, _, err := resolveBindAddress(env(map[string]string{
		"ABACOPHY_PORT":"18091", "PORT":"18090",
	}))
	if err != nil { t.Fatal(err) }
	if port != "18091" { t.Fatalf("port=%q, want 18091", port) }
}

func TestIsWildcardHost(t *testing.T) {
	for _, host := range []string{"", "0.0.0.0", "::"} {
		if !isWildcardHost(host) { t.Errorf("isWildcardHost(%q) = false, want true", host) }
	}
	for _, host := range []string{"127.0.0.1", "localhost", "::1"} {
		if isWildcardHost(host) { t.Errorf("isWildcardHost(%q) = true, want false", host) }
	}
}
