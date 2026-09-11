import { describe, it, expect } from 'vitest';
import {
  encryptSecret,
  decryptSecret,
  bufferToBase64Url,
  base64UrlToBuffer
} from '../crypto/e2ee.js';

describe('WebCrypto E2EE Module', () => {
  it('should encode and decode base64url losslessly', () => {
    const raw = new Uint8Array([0, 1, 2, 255, 254, 128, 64, 32, 16, 8, 4, 2]);
    const encoded = bufferToBase64Url(raw);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');

    const decoded = base64UrlToBuffer(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(raw));
  });

  it('should encrypt and decrypt plaintext losslessly', async () => {
    const secret = 'super-secret-api-key-12345!@#$%^&*()';
    const payload = await encryptSecret(secret);

    expect(payload.ciphertext).toBeDefined();
    expect(payload.iv).toBeDefined();
    expect(payload.keyFragment).toBeDefined();
    expect(payload.hasPassphrase).toBe(false);

    const decrypted = await decryptSecret({
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      keyFragment: payload.keyFragment,
      hasPassphrase: false
    });

    expect(decrypted).toBe(secret);
  });

  it('should support unicode, emoji, and multi-line formatting', async () => {
    const multiLine = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7V...
🔐 Confidențial: Cheie privată de producție
🚀 Emoji test: ⚡🔥✨
-----END PRIVATE KEY-----`;

    const payload = await encryptSecret(multiLine);
    const decrypted = await decryptSecret({
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      keyFragment: payload.keyFragment,
      hasPassphrase: false
    });

    expect(decrypted).toBe(multiLine);
  });

  it('should handle large payloads (50KB)', async () => {
    const largeText = 'A'.repeat(50 * 1024);
    const payload = await encryptSecret(largeText);
    const decrypted = await decryptSecret({
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      keyFragment: payload.keyFragment,
      hasPassphrase: false
    });

    expect(decrypted.length).toBe(50 * 1024);
    expect(decrypted).toBe(largeText);
  });

  it('should reject tampered ciphertext', async () => {
    const secret = 'immutable-message';
    const payload = await encryptSecret(secret);

    // Tamper with the ciphertext by altering the last character
    const tamperedCipher = payload.ciphertext.slice(0, -2) + (payload.ciphertext.endsWith('A') ? 'B' : 'A') + '=';

    await expect(
      decryptSecret({
        ciphertext: tamperedCipher,
        iv: payload.iv,
        keyFragment: payload.keyFragment,
        hasPassphrase: false
      })
    ).rejects.toThrow();
  });

  it('should reject tampered IV', async () => {
    const secret = 'immutable-iv-message';
    const payload = await encryptSecret(secret);

    // Replace IV with another random IV
    const tamperedIv = bufferToBase64Url(new Uint8Array(12));

    await expect(
      decryptSecret({
        ciphertext: payload.ciphertext,
        iv: tamperedIv,
        keyFragment: payload.keyFragment,
        hasPassphrase: false
      })
    ).rejects.toThrow();
  });

  it('should support optional passphrase protection (PBKDF2)', async () => {
    const secret = 'classified-vault-secret';
    const passphrase = 'correct-horse-battery-staple';

    const payload = await encryptSecret(secret, passphrase);

    expect(payload.hasPassphrase).toBe(true);
    expect(payload.passphraseSalt).toBeDefined();

    // Successful decryption with correct passphrase
    const decrypted = await decryptSecret({
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      keyFragment: payload.keyFragment,
      hasPassphrase: true,
      passphraseSalt: payload.passphraseSalt,
      passphrase: passphrase
    });

    expect(decrypted).toBe(secret);

    // Rejection with incorrect passphrase
    await expect(
      decryptSecret({
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        keyFragment: payload.keyFragment,
        hasPassphrase: true,
        passphraseSalt: payload.passphraseSalt,
        passphrase: 'wrong-passphrase'
      })
    ).rejects.toThrow('Incorrect passphrase or corrupted key.');

    // Rejection when passphrase is required but omitted
    await expect(
      decryptSecret({
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        keyFragment: payload.keyFragment,
        hasPassphrase: true,
        passphraseSalt: payload.passphraseSalt
      })
    ).rejects.toThrow('This secret is passphrase-protected. Passphrase is required.');
  });
});
