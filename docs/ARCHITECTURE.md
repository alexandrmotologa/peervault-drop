# Architecture specification

PeerVault Drop provides end-to-end encrypted secret sharing for Telegram Mini Apps and web browsers.

## Core design principles

1. Client authority: The client generates cryptographic keys, executes encryption algorithms, and processes decrypted output.
2. Zero server knowledge: The backend server stores and transmits ciphertext, initialization vectors, and expiration metadata. It never receives plaintext or decryption keys.
3. Isolated key transmission: Decryption keys travel inside the URL fragment identifier (`#`), which the user agent keeps local and does not include in HTTP requests.
4. Ephemeral lifetime: Records are removed either immediately after first retrieval or through a background sweeper once their time-to-live expires.

## System components

### 1. Client application (`web/`)

The frontend is a single-page application built with React, Vite, and Tailwind CSS. It interacts with the platform in two ways:

- Within Telegram: Integrates with the Telegram WebApp interface to read theme parameters, trigger haptic feedback, and pass initialization data.
- Within general browsers: Runs as a standalone responsive web application with identical cryptographic guarantees.

#### Cryptographic pipeline

- Algorithm: AES-GCM (Galois/Counter Mode) with 256-bit symmetric keys.
- Initialization vector: 96-bit (12-byte) cryptographically secure pseudorandom bytes generated via `window.crypto.getRandomValues`.
- Encoding: ArrayBuffer payloads are serialized to RFC 4648 Base64URL without padding characters.
- Passphrase key derivation: When a user enables passphrase protection, the system runs PBKDF2 with 100,000 iterations, SHA-256, and a random 16-byte salt to derive a key-wrapping key.

### 2. Backend service (`server/`)

The server uses Fastify and Node.js. It manages persistence, rate limits, Telegram bot long polling, and static file delivery.

#### Database layer

The system uses SQLite via `node:sqlite` in WAL (Write-Ahead Logging) mode.

Table schema:
```sql
CREATE TABLE IF NOT EXISTS secrets (
  id TEXT PRIMARY KEY,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  burn_after_read INTEGER NOT NULL DEFAULT 1,
  has_passphrase INTEGER NOT NULL DEFAULT 0,
  passphrase_salt TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_secrets_expires_at ON secrets(expires_at);
```

#### Atomic read-and-burn

When a recipient requests a secret marked for single use, the database executes the query and deletion in an atomic sequence:

```sql
SELECT * FROM secrets WHERE id = ? AND expires_at > ?;
-- If found and burn_after_read = 1:
DELETE FROM secrets WHERE id = ?;
```

Concurrent or subsequent requests for the same identifier receive an HTTP 404 response.

#### Background cleanup

A timer runs every 60 seconds and deletes records where `expires_at <= ?`. This removes expired secrets that were never opened.

### 3. Telegram bot integration (`server/src/bot/`)

The bot operates through long polling using the `grammY` library. It requires no incoming public webhook or domain registration.

- `/start`: Returns service details and an inline button to open the Mini App.
- `/help`: Describes the encryption model.
- Inline queries: Responds to `@bot_name` queries with a result card directing users to create an encrypted secret.

## Data flow diagram

```
Sender Browser                         Server & SQLite                      Recipient Browser
      │                                       │                                     │
      ├─ 1. WebCrypto AES-GCM-256             │                                     │
      │     Encrypt plaintext                 │                                     │
      │                                       │                                     │
      ├─ 2. POST /api/secret                  │                                     │
      │     { ciphertext, iv, ttl } ─────────►│                                     │
      │                                       ├─ 3. Store record in DB              │
      │◄──────────────────────────────────────┤     Return secret ID                │
      │                                       │                                     │
      ├─ 4. Construct URL:                    │                                     │
      │     https://t.me/app?startapp=ID#key  │                                     │
      │     (Key stays after #)               │                                     │
      │                                       │                                     │
      └────────────────────────── Send link to recipient ──────────────────────────►│
                                              │                                     │
                                              │◄─── 5. GET /api/secret/:id ─────────┤
                                              │                                     │
                                              ├─ 6. Return ciphertext               │
                                              ├─ 7. DELETE FROM secrets             │
                                              │     (if burn on read)               │
                                              │                                     │
                                              │──── Returns { ciphertext, iv } ────►│
                                              │                                     │
                                              │                                     ├─ 8. Read #key from hash
                                              │                                     └─ 9. WebCrypto Decrypt
                                              │                                           Display plaintext
```
