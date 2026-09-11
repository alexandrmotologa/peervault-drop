/**
 * PeerVault Drop - Client-Side Zero-Knowledge Cryptographic Engine
 *
 * Implements AES-GCM-256 authenticated encryption using WebCrypto API.
 * Plaintext secrets never leave the client device unencrypted.
 * Decryption keys are stored strictly in the URL hash fragment (#key=...)
 * which browsers never transmit to web servers over HTTP.
 */

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  keyFragment: string;
  hasPassphrase: boolean;
  passphraseSalt?: string;
}

export interface DecryptOptions {
  ciphertext: string;
  iv: string;
  keyFragment: string;
  hasPassphrase?: boolean;
  passphraseSalt?: string;
  passphrase?: string;
}

/**
 * Resolves WebCrypto subtle instance in both Browser and Node.js environments.
 */
function getCryptoSubtle(): SubtleCrypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('WebCrypto API (crypto.subtle) is not supported in this environment.');
}

function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    return globalThis.crypto.getRandomValues(bytes);
  }
  throw new Error('WebCrypto getRandomValues is not available.');
}

/**
 * Converts ArrayBuffer / Uint8Array to RFC 4648 Base64URL string (no padding).
 */
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converts RFC 4648 Base64URL string back to Uint8Array.
 */
export function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a 256-bit AES-GCM key from a passphrase using PBKDF2 (100,000 iterations, SHA-256).
 */
async function derivePassphraseKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getCryptoSubtle();
  const encoder = new TextEncoder();
  const passphraseKey = await subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext string using AES-GCM-256.
 * If optionalPassphrase is provided, the data key is wrapped with a PBKDF2-derived key.
 */
export async function encryptSecret(
  plaintext: string,
  optionalPassphrase?: string
): Promise<EncryptedPayload> {
  const subtle = getCryptoSubtle();
  const encoder = new TextEncoder();

  // 1. Generate primary 256-bit AES-GCM key
  const dataKey = await subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 2. Encrypt plaintext
  const iv = getRandomBytes(12);
  const plaintextBytes = encoder.encode(plaintext);
  const ciphertextBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    dataKey,
    plaintextBytes
  );

  const rawDataKey = await subtle.exportKey('raw', dataKey);

  // 3. Handle optional passphrase protection
  if (optionalPassphrase && optionalPassphrase.trim().length > 0) {
    const salt = getRandomBytes(16);
    const wrapKey = await derivePassphraseKey(optionalPassphrase.trim(), salt);
    const wrapIv = getRandomBytes(12);

    const wrappedKeyBuffer = await subtle.encrypt(
      { name: 'AES-GCM', iv: wrapIv as BufferSource },
      wrapKey,
      rawDataKey
    );

    // Combine wrapIv (12 bytes) + wrappedKeyBuffer for keyFragment
    const combined = new Uint8Array(wrapIv.length + wrappedKeyBuffer.byteLength);
    combined.set(wrapIv, 0);
    combined.set(new Uint8Array(wrappedKeyBuffer), wrapIv.length);

    return {
      ciphertext: bufferToBase64Url(ciphertextBuffer),
      iv: bufferToBase64Url(iv),
      keyFragment: bufferToBase64Url(combined),
      hasPassphrase: true,
      passphraseSalt: bufferToBase64Url(salt)
    };
  }

  return {
    ciphertext: bufferToBase64Url(ciphertextBuffer),
    iv: bufferToBase64Url(iv),
    keyFragment: bufferToBase64Url(rawDataKey),
    hasPassphrase: false
  };
}

/**
 * Decrypts ciphertext using keyFragment and IV.
 * If secret was encrypted with a passphrase, passphrase must be provided.
 */
export async function decryptSecret(options: DecryptOptions): Promise<string> {
  const subtle = getCryptoSubtle();
  const { ciphertext, iv, keyFragment, hasPassphrase, passphraseSalt, passphrase } = options;

  let rawDataKeyBytes: Uint8Array;

  if (hasPassphrase) {
    if (!passphrase || passphrase.trim().length === 0) {
      throw new Error('This secret is passphrase-protected. Passphrase is required.');
    }
    if (!passphraseSalt) {
      throw new Error('Missing passphrase salt metadata.');
    }

    const salt = base64UrlToBuffer(passphraseSalt);
    const wrapKey = await derivePassphraseKey(passphrase.trim(), salt);
    const combined = base64UrlToBuffer(keyFragment);

    if (combined.length < 13) {
      throw new Error('Corrupted encrypted key fragment.');
    }

    const wrapIv = combined.slice(0, 12);
    const wrappedKey = combined.slice(12);

    try {
      const unwrappedBuffer = await subtle.decrypt(
        { name: 'AES-GCM', iv: wrapIv as BufferSource },
        wrapKey,
        wrappedKey as BufferSource
      );
      rawDataKeyBytes = new Uint8Array(unwrappedBuffer);
    } catch {
      throw new Error('Incorrect passphrase or corrupted key.');
    }
  } else {
    rawDataKeyBytes = base64UrlToBuffer(keyFragment);
  }

  // Import data key for decryption
  const dataKey = await subtle.importKey(
    'raw',
    rawDataKeyBytes as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const ivBytes = base64UrlToBuffer(iv);
  const cipherBytes = base64UrlToBuffer(ciphertext);

  try {
    const decryptedBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes as BufferSource },
      dataKey,
      cipherBytes as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    throw new Error('Decryption failed. The secret has been tampered with or the link is invalid.');
  }
}
