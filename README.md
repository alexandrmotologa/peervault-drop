<p align="center">
  <img src="docs/images/logo.png?raw=true" alt="PeerVault Drop Logo" width="140" style="border-radius: 28px;" />
</p>

<h1 align="center">PeerVault Drop</h1>

<p align="center">
  Zero-knowledge ephemeral secret sharing for Telegram Mini Apps and web browsers.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-emerald.svg" alt="License MIT" />
  <img src="https://img.shields.io/badge/encryption-AES--GCM--256-cyan.svg" alt="AES-GCM-256" />
  <img src="https://img.shields.io/badge/kdf-PBKDF2--100k-purple.svg" alt="PBKDF2" />
  <img src="https://img.shields.io/badge/telegram-Mini%20App-blue.svg" alt="Telegram Mini App" />
</p>

---

Plaintext secrets are encrypted in the client browser using the WebCrypto API with AES-GCM-256. The symmetric key is stored only in the URL hash fragment (`#key=...`), which browsers do not transmit over HTTP to web servers. The backend server stores only ciphertext and expiration metadata, with automatic deletion on first read.

## Brand Mascot: The Stealth Falcon

The official mascot of PeerVault Drop is the **Stealth Falcon**. Renowned in nature for its rapid aerial drop, the falcon represents silent, direct delivery of sensitive information. Its folded low-poly obsidian wings form an interlocking vault fortress around an emerald-cyan cryptographic keyhole shield, guarding the plaintext until the intended recipient opens it.

---

## Visual Walkthrough & Screenshots

### 1. Creation & Tools

| Main Secret Form | Built-in Credential Generator |
| :---: | :---: |
| ![Main Secret Creation](docs/images/01-main-screen.png?raw=true) | ![Credential Generator](docs/images/02-credential-generator.png?raw=true) |
| *Monospace input with byte counter, TTL selector, and burn options* | *Cryptographically secure passwords, Diceware passphrases, tokens, and PINs* |

| Secure File Drop (Max 5MB) | Dynamic QR Code Scanner |
| :---: | :---: |
| ![Secure File Drop](docs/images/03-secure-file-drop.png?raw=true) | ![QR Code Modal](docs/images/05-qr-code.png?raw=true) |
| *Client-side encryption for .env, SSH keys, certificates, or configs* | *High-contrast QR code for instant mobile camera scanning* |

### 2. Delivery & Decryption

| Share Modal (Telegram & Web Links) | Decrypted Secret (Syntax Formatted) |
| :---: | :---: |
| ![Share Modal](docs/images/04-share-modal.png?raw=true) | ![Decrypted Secret](docs/images/06-reveal-decrypted.png?raw=true) |
| *1-click copy, Telegram share, and revocation token tracker* | *Automatic .env/JSON syntax highlighting with Hold to Peek masking* |

| Auto-Clear Clipboard Protection | Sent Secrets Dashboard (Revocation) |
| :---: | :---: |
| ![Auto-Clear Clipboard](docs/images/07-auto-clear-clipboard.png?raw=true) | ![Sent Secrets Dashboard](docs/images/08-sent-secrets-dashboard.png?raw=true) |
| *30-second countdown before clearing clipboard memory* | *Delivery status receipts with instant Destroy Now revocation button* |

| Cryptographic Audit Model | Atomic Burn Verification |
| :---: | :---: |
| ![Security Audit Modal](docs/images/09-security-audit.png?raw=true) | ![Burned Secret Verification](docs/images/10-burned-confirmation.png?raw=true) |
| *Interactive explanation of client-side WebCrypto and RFC 3986 isolation* | *Server returns 404 once read; records are purged permanently* |

---

## Features

- Client-side encryption: Plaintext and files never leave your browser unencrypted.
- Secure file drop: Attach certificates (.pem), SSH keys, .env configurations, or documents up to 5 MB with client-side encryption and direct decrypted download.
- Built-in credential generator: Generate random passwords, Diceware passphrases, API keys, and PINs directly inside the app.
- Dynamic QR codes: Generate high-contrast QR codes for mobile camera scanning.
- Anti-shoulder surfing: Mask secrets in public spaces with an interactive hold-to-peek control.
- Auto-clear clipboard: Clears copied credentials from the system clipboard after 30 seconds.
- Syntax highlighting: Automatically formats .env variables, JSON, and PEM certificates.
- Sender revocation and receipts: Check delivery status (Active, Burned, Expired) and permanently destroy unread secrets using an authorized revocation token.
- URL hash key isolation: Decryption keys remain in the client URL fragment per RFC 3986.
- Atomic burn on read: Ciphertext is purged from the database upon the first successful retrieval.
- Configurable expiration: Set secret lifetimes from 5 minutes to 7 days, backed by an automatic 60-second database cleanup job.
- Optional passphrase protection: Add an extra decryption passphrase derived using PBKDF2 with 100,000 iterations.
- Telegram Mini App and web support: Runs inside Telegram chats or as a standalone website in any modern browser.
- Local execution: Runs without external domains or paid infrastructure.

## Cryptographic design

The service relies on the browser WebCrypto standard (`window.crypto.subtle`):

1. The sender creates a message or drops a file in the browser.
2. The browser generates a random 256-bit AES-GCM key and a 96-bit initialization vector (IV).
3. The browser encrypts the plaintext into ciphertext.
4. The client sends only the ciphertext, IV, and expiration options to `POST /api/secret`.
5. The backend generates a random identifier and stores the record in SQLite.
6. The client formats the share link:
   - Telegram: `https://t.me/<bot_name>/<app_name>?startapp=<id>#key=<base64url_key>`
   - Direct web: `http://localhost:8080/#id=<id>&key=<base64url_key>`
7. The recipient opens the link. The client extracts the secret ID from query parameters and the key from the URL hash.
8. The client fetches the ciphertext from `GET /api/secret/:id`.
9. The backend returns the ciphertext and deletes the record from the database if burn-on-read is enabled.
10. The recipient browser decrypts the ciphertext locally and displays the plaintext or triggers the decrypted file download.

## Quickstart

### Prerequisites

- Node.js 20 or later
- npm 9 or later

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/alexandrmotologa/peervault-drop.git
cd peervault-drop
npm install
```

### Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Default values in `.env.example` allow you to run the application locally without extra configuration. If you have a Telegram bot token from `@BotFather`, set it in `TELEGRAM_BOT_TOKEN`. If left blank, the application runs in web-only mode without errors.

### Running locally

Build the frontend and start the server:

```bash
npm run build
npm start
```

For local development with hot reload:

```bash
npm run dev
```

The application is accessible at `http://localhost:8080`.

### Running tests

Run the test suite across both packages:

```bash
npm test
```

### Docker deployment

Build and run using Docker Compose:

```bash
docker compose up -d --build
```

The service stores SQLite data in a persistent volume at `/data`.

## Project structure

```
peervault-drop/
├── server/              Fastify backend and Telegram bot
│   ├── src/
│   │   ├── bot/         Telegram bot and inline query handlers
│   │   ├── db/          SQLite store and background pruner
│   │   ├── routes/      REST API endpoints
│   │   ├── config.ts    Configuration parser
│   │   └── index.ts     Server entry point
│   └── package.json
├── web/                 React and Tailwind frontend
│   ├── src/
│   │   ├── components/  UI views and modals
│   │   ├── crypto/      WebCrypto AES-GCM and PBKDF2 logic
│   │   ├── hooks/       Telegram WebApp integration hook
│   │   └── App.tsx      Application shell
│   └── package.json
├── docs/                Architecture, security, and API documentation
│   └── images/          Official mascot logo and UI screenshots
├── Dockerfile           Multi-stage container build
└── docker-compose.yml   Production compose file
```

## Documentation

- [Architecture specification](docs/ARCHITECTURE.md)
- [Security model](docs/SECURITY.md)
- [REST API reference](docs/API.md)

## License

MIT License. See [LICENSE](LICENSE) for details.
