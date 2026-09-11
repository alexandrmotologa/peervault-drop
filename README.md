<p align="center">
  <img src="web/public/logo.svg" width="100" height="100" alt="PeerVault Drop Logo" />
</p>

# PeerVault Drop

Zero-knowledge ephemeral secret sharing for Telegram Mini Apps and web browsers.

Plaintext secrets are encrypted in the client browser using the WebCrypto API with AES-GCM-256. The symmetric key is stored only in the URL hash fragment (`#key=...`), which browsers do not transmit over HTTP to web servers. The backend server stores only ciphertext and expiration metadata, with automatic deletion on first read.

## Features

- Client-side encryption: Plaintext never leaves your browser unencrypted.
- URL hash key isolation: Decryption keys remain in the client URL fragment per RFC 3986.
- Atomic burn on read: Ciphertext is purged from the database upon the first successful retrieval.
- Configurable expiration: Set secret lifetimes from 5 minutes to 7 days, backed by an automatic 60-second database cleanup job.
- Optional passphrase protection: Add an extra decryption passphrase derived using PBKDF2 with 100,000 iterations.
- Telegram Mini App and web support: Runs inside Telegram chats or as a standalone website in any modern browser.
- Local execution: Runs without external domains or paid infrastructure.

## Cryptographic design

The service relies on the browser WebCrypto standard (`window.crypto.subtle`):

1. The sender creates a message in the browser.
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
10. The recipient browser decrypts the ciphertext locally and displays the plaintext.

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
├── Dockerfile           Multi-stage container build
└── docker-compose.yml   Production compose file
```

## Documentation

- [Architecture specification](docs/ARCHITECTURE.md)
- [Security model](docs/SECURITY.md)
- [REST API reference](docs/API.md)

## License

MIT License. See [LICENSE](LICENSE) for details.
