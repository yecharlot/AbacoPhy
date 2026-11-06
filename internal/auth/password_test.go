package auth

import (
	"errors"
	"strings"
	"testing"
)

func TestValidatePasswordPolicy(t *testing.T) {
	tests := []struct {
		name string
		password string
		wantErr error
	}{
		{name: "12 characters", password: "abcdefghijkl"},
		{name: "passphrase with spaces", password: "correct horse battery"},
		{name: "11 characters rejected", password: "abcdefghijk", wantErr: ErrPasswordTooShort},
		{name: "whitespace only rejected", password: "            ", wantErr: ErrPasswordBlank},
		{name: "72 bytes accepted", password: strings.Repeat("a", 72)},
		{name: "73 bytes rejected", password: strings.Repeat("a", 73), wantErr: ErrPasswordTooLong},
		{name: "unicode counted as characters", password: strings.Repeat("é", 12)},
		{name: "unicode byte limit enforced", password: strings.Repeat("界", 25), wantErr: ErrPasswordTooLong},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePassword(tt.password)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("ValidatePassword() error = %v, want %v", err, tt.wantErr)
			}
		})
	}
}

func TestHashPasswordRejectsInvalidPolicyInputs(t *testing.T) {
	if _, err := HashPassword("short"); !errors.Is(err, ErrPasswordTooShort) {
		t.Fatalf("HashPassword(short) error = %v, want ErrPasswordTooShort", err)
	}
	if _, err := HashPassword(strings.Repeat("x", 73)); !errors.Is(err, ErrPasswordTooLong) {
		t.Fatalf("HashPassword(73 bytes) error = %v, want ErrPasswordTooLong", err)
	}
}

func TestHashPasswordPreservesPassphraseExactly(t *testing.T) {
	password := "correct horse battery"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword(): %v", err)
	}
	if !CheckPassword(hash, password) {
		t.Fatal("the exact passphrase must verify")
	}
	if CheckPassword(hash, "correcthorsebattery") {
		t.Fatal("whitespace in the passphrase must remain significant")
	}
}
