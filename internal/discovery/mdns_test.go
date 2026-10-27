package discovery

import (
	"reflect"
	"testing"
)

func TestTXTRecords(t *testing.T) {
	got := TXTRecords(Config{
		InstanceID: "0123456789abcdef0123456789abcdef",
		Name: "AbacoPhy Oficina",
		Version: "0.1.0",
		APIVersion: 1,
		Web: true,
		PairingRequired: false,
	})
	want := []string{
		"id=0123456789abcdef0123456789abcdef",
		"name=AbacoPhy Oficina",
		"version=0.1.0",
		"api=1",
		"web=1",
		"pairing=0",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("TXTRecords() = %#v, want %#v", got, want)
	}
}

func TestTXTRecordsDefaults(t *testing.T) {
	got := TXTRecords(Config{InstanceID: "instance"})
	want := []string{
		"id=instance",
		"name=" + DefaultServiceName,
		"version=" + ServerVersion,
		"api=1",
		"web=0",
		"pairing=0",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("TXTRecords() = %#v, want %#v", got, want)
	}
}

func TestShouldAdvertise(t *testing.T) {
	cases := []struct {
		host string
		want bool
	}{
		{"", true},
		{"0.0.0.0", true},
		{"::", true},
		{"192.168.1.20", true},
		{"localhost", false},
		{"127.0.0.1", false},
		{"::1", false},
	}
	for _, tc := range cases {
		if got := ShouldAdvertise(tc.host); got != tc.want {
			t.Errorf("ShouldAdvertise(%q) = %v, want %v", tc.host, got, tc.want)
		}
	}
}
