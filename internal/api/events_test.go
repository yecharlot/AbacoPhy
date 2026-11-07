package api

import (
	"bufio"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

func TestEventHubDoesNotCrossTenantBoundaries(t *testing.T) {
	hub := NewEventHub()
	tenantA := hub.Subscribe("tenant-a")
	defer hub.Unsubscribe("tenant-a", tenantA)
	tenantB := hub.Subscribe("tenant-b")
	defer hub.Unsubscribe("tenant-b", tenantB)

	hub.Publish("tenant-a", "inventory.updated", map[string]string{"tenant": "a"})
	select {
	case event := <-tenantA:
		if event.Event != "inventory.updated" {
			t.Fatalf("unexpected event: %#v", event)
		}
	case <-time.After(time.Second):
		t.Fatal("tenant A did not receive its own event")
	}
	select {
	case event := <-tenantB:
		t.Fatalf("tenant B received tenant A event: %#v", event)
	default:
	}
}

func TestEventHubUnsubscribeStopsFutureDelivery(t *testing.T) {
	hub := NewEventHub()
	ch := hub.Subscribe("tenant-a")
	hub.Unsubscribe("tenant-a", ch)
	hub.Publish("tenant-a", "inventory.updated", map[string]string{"tenant": "a"})
	select {
	case event := <-ch:
		t.Fatalf("unsubscribed channel received event: %#v", event)
	default:
	}
}

func TestEventsStreamClosesAfterSessionRevocation(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Tenant A", "tenant-a", "CUP")
	admin := userByName(snap, "admin")
	if admin == nil {
		t.Fatal("admin user missing")
	}
	admin.MustChangePassword = false
	admin.PasswordHash = mustHashForTenantIsolationTest(t, "events-revocation-password")
	if err := st.Put(snap); err != nil {
		t.Fatal(err)
	}
	sess, _, err := auth.Login(st, admin.Username, "events-revocation-password")
	if err != nil {
		t.Fatal(err)
	}

	server := NewServer(st, t.TempDir())
	httpServer := httptest.NewServer(server.Handler())
	defer httpServer.Close()

	req, err := http.NewRequest(http.MethodGet, httpServer.URL+"/api/v1/events", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("SSE status=%d body=%s", resp.StatusCode, body)
	}

	reader := bufio.NewReader(resp.Body)
	connected := false
	for i := 0; i < 8; i++ {
		line, readErr := reader.ReadString('\n')
		if readErr != nil {
			t.Fatalf("reading connected event: %v", readErr)
		}
		if strings.TrimSpace(line) == "event: connected" {
			connected = true
		}
		if connected && strings.TrimSpace(line) == "" {
			break
		}
	}
	if !connected {
		t.Fatal("SSE stream did not send connected event")
	}

	st.RevokeToken(sess.Token)
	server.Hub.Publish(sess.TenantID, "inventory.updated", map[string]string{"secret": "must-not-arrive"})

	type streamResult struct {
		body []byte
		err  error
	}
	finished := make(chan streamResult, 1)
	go func() {
		body, readErr := io.ReadAll(reader)
		finished <- streamResult{body: body, err: readErr}
	}()
	select {
	case result := <-finished:
		if result.err != nil {
			t.Fatalf("reading closed SSE stream: %v", result.err)
		}
		if strings.Contains(string(result.body), "must-not-arrive") {
			t.Fatalf("revoked session received an event: %s", result.body)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("SSE stream remained open after session revocation")
	}
}
