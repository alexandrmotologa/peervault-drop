# Security model and threat analysis

PeerVault Drop relies on client-side cryptography to keep plaintext secrets confidential from the server operator, network intermediaries, and unauthorized third parties.

## Threat model and boundaries

### Assumptions

1. The client device and browser environment are trusted and free from malware, malicious browser extensions, or keyloggers.
2. WebCrypto implementations adhere to the W3C recommendation for AES-GCM and PBKDF2.
3. Transport layer security (TLS) is used in production to protect transit integrity between the client and server.

### Protected against

- Server database inspection: An attacker who dumps the SQLite database gains only ciphertext and random IVs. Without the decryption key stored in the recipient's URL fragment, the ciphertext cannot be decrypted.
- Server access logs: Decryption keys are stored in the URL hash fragment (`#key=...`). Standard browser implementations do not send fragments in HTTP request lines, preventing keys from appearing in server access logs or proxy headers.
- Secret reuse and replay: Secrets marked as burn-on-read are removed from the database during the first retrieval transaction. A stolen link cannot be decoded a second time.
- Automated guessing and scraping: The server enforces IP rate limiting (100 requests per minute by default). Secret identifiers use 16-character alphanumeric nanoids with over 90 bits of entropy, making brute-force enumeration impractical.

### Out of scope

- Compromised recipient device: If an attacker controls the recipient's browser, clipboard, or operating system, decrypted plaintext can be intercepted at the application layer.
- Shoulder surfing: The secret is visible on the recipient's screen until the page is closed or reset.
- Link interception before read: If the communication channel used to send the secret link is monitored (for example, an unencrypted email), the eavesdropper can claim the secret before the intended recipient. Passphrase protection mitigates this risk by requiring a second factor shared through an alternate channel.

## Cryptographic details

### Encryption parameters

- Cipher: AES-GCM (Galois/Counter Mode)
- Key length: 256 bits (32 bytes)
- Initialization vector: 96 bits (12 bytes), unique per secret
- Tag length: 128 bits (16 bytes), verifying ciphertext authenticity and integrity

### Passphrase derivation

- Algorithm: PBKDF2-HMAC-SHA-256
- Iterations: 100,000
- Salt: 128 bits (16 bytes) generated per secret
- Output: 256-bit key used to wrap the primary AES-GCM data key

## Vulnerability reporting

To report a security vulnerability, please open a private security advisory on GitHub or contact the maintainer directly. Do not open public issues for undisclosed vulnerabilities.
