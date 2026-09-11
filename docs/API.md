# REST API reference

The PeerVault Drop backend exposes HTTP endpoints under `/api`. All JSON request bodies require the `Content-Type: application/json` header.

## Endpoints

### 1. Health check

Verifies that the server process is responsive.

- Method: `GET`
- Path: `/api/health`
- Auth: None

#### Response example

```json
{
  "status": "ok",
  "service": "PeerVault Drop",
  "timestamp": 1773412000000,
  "uptime": 124
}
```

---

### 2. Store encrypted secret

Accepts an encrypted payload, validates size constraints, and saves the record in SQLite with a specified expiration time.

- Method: `POST`
- Path: `/api/secret`
- Auth: None

#### Request parameters

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `ciphertext` | string | Yes | | Base64URL-encoded AES-GCM ciphertext |
| `iv` | string | Yes | | Base64URL-encoded 12-byte initialization vector |
| `burn_after_read` | boolean | No | `true` | If true, deletes secret upon first successful read |
| `has_passphrase` | boolean | No | `false` | Indicates whether key derivation requires a passphrase |
| `passphrase_salt` | string | No | `null` | Base64URL-encoded salt when passphrase protection is used |
| `ttl_seconds` | integer | No | `86400` | Lifetime in seconds (min: 60, max: 604800) |

#### Request example

```bash
curl -X POST http://localhost:8080/api/secret \
  -H "Content-Type: application/json" \
  -d '{
    "ciphertext": "aW1tdXRhYmxlLXBheWxvYWQtY2lwaGVy",
    "iv": "cmFuZG9tLWl2LXZhbHVl",
    "burn_after_read": true,
    "ttl_seconds": 3600
  }'
```

#### Response (201 Created)

```json
{
  "id": "v1StGXR8_Z5jd8Lk",
  "expires_at": 1773415600000,
  "burn_after_read": true
}
```

#### Error responses

- `400 Bad Request`: Payload validation failed or maximum size exceeded.
- `429 Too Many Requests`: Rate limit exceeded.

---

### 3. Retrieve secret

Fetches the ciphertext and initialization vector for a secret ID. If `burn_after_read` is set to `true`, the record is removed from the database during this operation.

- Method: `GET`
- Path: `/api/secret/:id`
- Auth: None

#### Request parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string (path) | Yes | The 16-character identifier returned during creation |

#### Request example

```bash
curl http://localhost:8080/api/secret/v1StGXR8_Z5jd8Lk
```

#### Response (200 OK)

```json
{
  "id": "v1StGXR8_Z5jd8Lk",
  "ciphertext": "aW1tdXRhYmxlLXBheWxvYWQtY2lwaGVy",
  "iv": "cmFuZG9tLWl2LXZhbHVl",
  "burn_after_read": true,
  "has_passphrase": false,
  "burned": true
}
```

#### Error responses

- `404 Not Found`: Secret does not exist, has expired, or has already been burned.
- `400 Bad Request`: Invalid identifier format.
- `429 Too Many Requests`: Rate limit exceeded.
