package crypto

import "testing"

func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := HashPassword("rahasia123")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	ok, err := VerifyPassword(hash, "rahasia123")
	if err != nil || !ok {
		t.Fatalf("verify benar: ok=%v err=%v", ok, err)
	}
	ok, err = VerifyPassword(hash, "salah")
	if err != nil {
		t.Fatalf("verify salah: %v", err)
	}
	if ok {
		t.Fatal("password salah seharusnya ditolak")
	}
}

func TestEncryptDecrypt(t *testing.T) {
	key := "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=" // 32 byte
	enc, err := NewEncryptor(key)
	if err != nil {
		t.Fatalf("new encryptor: %v", err)
	}
	ciphertext, err := enc.Encrypt("kontak darurat 08123")
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	if ciphertext == "kontak darurat 08123" {
		t.Fatal("ciphertext sama dengan plaintext")
	}
	plaintext, err := enc.Decrypt(ciphertext)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}
	if plaintext != "kontak darurat 08123" {
		t.Fatalf("hasil decrypt = %q", plaintext)
	}
}
