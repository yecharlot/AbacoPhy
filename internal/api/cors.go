package api

import (
	"encoding/json"
	"errors"
	"log"
	"os"
	"net/http"
	"net/netip"
	"net/url"
	"strconv"
	"strings"
)

const corsAllowlistEnv = "ABACOPHY_CORS_ALLOWED_ORIGINS"

type corsRule struct {
	host    string
	prefix  netip.Prefix
	port    int
	hasPort bool
	isIP    bool
	isCIDR  bool
}

func parseCORSRules(raw string) ([]corsRule, error) {
	var entries []string
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	if err := json.Unmarshal([]byte(raw), &entries); err != nil {
		return nil, err
	}
	rules := make([]corsRule, 0, len(entries))
	for _, entry := range entries {
		rule, err := parseCORSRule(entry)
		if err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	return rules, nil
}

func parseCORSRule(value string) (corsRule, error) {
	var rule corsRule
	value = strings.TrimSpace(value)
	if value == "" || strings.ContainsAny(value, " ?#@") {
		return rule, errors.New("invalid CORS allowlist entry")
	}

	host := value
	if i := strings.LastIndex(value, ":"); i >= 0 {
		host = value[:i]
		portText := value[i+1:]
		port, err := strconv.Atoi(portText)
		if err != nil || port < 1 || port > 65535 {
			return rule, errors.New("invalid CORS allowlist port")
		}
		rule.port, rule.hasPort = port, true
	}
	if host == "" {
		return rule, errors.New("missing CORS allowlist host")
	}
	if prefix, err := netip.ParsePrefix(host); err == nil {
		if !prefix.Addr().Is4() {
			return rule, errors.New("only IPv4 CIDR rules are supported")
		}
		rule.prefix, rule.isCIDR = prefix.Masked(), true
		return rule, nil
	}
	if addr, err := netip.ParseAddr(host); err == nil {
		if !addr.Is4() {
			return rule, errors.New("only IPv4 address rules are supported")
		}
		rule.prefix, rule.isIP = netip.PrefixFrom(addr, 32), true
		return rule, nil
	}
	// Exact DNS hostname (no wildcard, scheme, path, or embedded port).
	host = strings.TrimSuffix(strings.ToLower(host), ".")
	if len(host) == 0 || len(host) > 253 {
		return rule, errors.New("invalid CORS hostname")
	}
	for _, label := range strings.Split(host, ".") {
		if len(label) == 0 || len(label) > 63 || label[0] == '-' || label[len(label)-1] == '-' {
			return rule, errors.New("invalid CORS hostname")
		}
		for _, c := range label {
			if !(c >= 'a' && c <= 'z' || c >= '0' && c <= '9' || c == '-') {
				return rule, errors.New("invalid CORS hostname")
			}
		}
	}
	rule.host = host
	return rule, nil
}

func (rule corsRule) matches(origin string) bool {
	u, err := url.Parse(origin)
	if err != nil || u.Opaque != "" || u.User != nil || u.Host == "" ||
		(u.Scheme != "http" && u.Scheme != "https") ||
		(u.Path != "" && u.Path != "/") || u.RawQuery != "" || u.Fragment != "" {
		return false
	}
	port := 80
	if u.Scheme == "https" {
		port = 443
	}
	if explicit := u.Port(); explicit != "" {
		parsed, err := strconv.Atoi(explicit)
		if err != nil || parsed < 1 || parsed > 65535 {
			return false
		}
		port = parsed
	}
	if rule.hasPort && rule.port != port {
		return false
	}
	host := strings.TrimSuffix(strings.ToLower(u.Hostname()), ".")
	if rule.isIP || rule.isCIDR {
		addr, err := netip.ParseAddr(host)
		return err == nil && addr.Is4() && rule.prefix.Contains(addr)
	}
	return host == rule.host
}

func withCORS(next http.Handler, rules []corsRule) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			next.ServeHTTP(w, r)
			return
		}
		w.Header().Add("Vary", "Origin")
		allowed := false
		for _, rule := range rules {
			if rule.matches(origin) {
				allowed = true
				break
			}
		}
		if !allowed {
			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				http.Error(w, "CORS origin not allowed", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
			return
		}

		w.Header().Set("Access-Control-Allow-Origin", origin)
		if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-AbacoPhy-Client, X-AbacoPhy-Client-Id, X-Offline-Rev")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func corsRulesFromEnv() []corsRule {
	rules, err := parseCORSRules(strings.TrimSpace(os.Getenv(corsAllowlistEnv)))
	if err != nil {
		// Invalid configuration fails closed: no cross-origin rules are loaded.
		log.Printf("security.cors.invalid_allowlist error=%q", err.Error())
		return nil
	}
	return rules
}
