import { describe, it, expect } from 'vitest';
import {
  encryptSecret,
  decryptSecret,
  encryptFileSecret,
  decryptSecretUnified,
  bufferToBase64Url,
  base64UrlToBuffer
} from '../crypto/e2ee.js';
import { generateSecureCredential } from '../crypto/generator.js';

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

  it('should support binary file encryption and decryption', async () => {
    const originalFileBytes = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]); // "Hello World"
    const fileMeta = {
      name: 'id_rsa.pub',
      type: 'text/plain',
      size: originalFileBytes.length,
      data: originalFileBytes
    };

    const payload = await encryptFileSecret(fileMeta);
    expect(payload.isFile).toBe(true);

    const result = await decryptSecretUnified({
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      keyFragment: payload.keyFragment,
      hasPassphrase: false
    });

    expect(result.isFile).toBe(true);
    expect(result.file).toBeDefined();
    expect(result.file?.name).toBe('id_rsa.pub');
    expect(result.file?.size).toBe(originalFileBytes.length);
    expect(Array.from(result.file?.data || [])).toEqual(Array.from(originalFileBytes));
    expect(result.file?.textPreview).toBe('Hello World');
  });

  it('should support optional passphrase protection on files', async () => {
    const fileBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const payload = await encryptFileSecret(
      { name: 'secret.bin', type: 'application/octet-stream', size: 5, data: fileBytes },
      'vault-pass'
    );

    expect(payload.hasPassphrase).toBe(true);

    const result = await decryptSecretUnified({
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      keyFragment: payload.keyFragment,
      hasPassphrase: true,
      passphraseSalt: payload.passphraseSalt,
      passphrase: 'vault-pass'
    });

    expect(result.isFile).toBe(true);
    expect(result.file?.name).toBe('secret.bin');
    expect(Array.from(result.file?.data || [])).toEqual([1, 2, 3, 4, 5]);
  });

  it('should generate secure credentials correctly', () => {
    const pass = generateSecureCredential({ type: 'password', length: 20 });
    expect(pass.length).toBe(20);

    const diceware = generateSecureCredential({ type: 'passphrase', wordCount: 4 });
    expect(diceware.split('-').length).toBe(5); // 4 words + 1 number suffix

    const token = generateSecureCredential({ type: 'token', length: 32 });
    expect(token.length).toBe(32);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);

    const pin = generateSecureCredential({ type: 'pin', length: 6 });
    expect(pin.length).toBe(6);
    expect(/^\d+$/.test(pin)).toBe(true);
  });
});
