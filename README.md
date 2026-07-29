# sinsei_umiusi_ui

[![Main CI](https://github.com/rogy-AquaLab/sinsei_UMIUSI_ui/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/rogy-AquaLab/sinsei_UMIUSI_ui/actions/workflows/main.yml)

## Browser terminal

The Terminal tab connects to the local terminal gateway. One browser may connect
at a time, and that browser can open up to six shell tabs over one WebSocket.
Each tab owns a separate PTY process.

### Local development

Install the UI and gateway dependencies separately:

```sh
npm install
npm --prefix terminal-gateway install
```

Run the gateway with a development-only plaintext password:

```sh
TERMINAL_PASSWORD=development-password npm run dev:terminal
```

In another terminal, start Vite:

```sh
npm run dev
```

Vite proxies `/api/terminal/*` and the terminal WebSocket to the gateway on
`127.0.0.1:3001`. Open `http://localhost:5173`, select Terminal, and enter the
development password.

### Gateway configuration

For production, generate a password hash:

```sh
npm run hash-terminal-password
```

Pass the output through `TERMINAL_PASSWORD_HASH`. The gateway intentionally
rejects plaintext `TERMINAL_PASSWORD` when `NODE_ENV=production`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `TERMINAL_HOST` | `127.0.0.1` | Gateway listen address |
| `TERMINAL_PORT` | `3001` | Gateway listen port |
| `TERMINAL_ALLOWED_ORIGINS` | localhost Vite origins | Comma-separated exact Origin allowlist |
| `TERMINAL_PASSWORD_HASH` | — | Production scrypt password hash |
| `TERMINAL_PASSWORD` | — | Local-development password only |
| `TERMINAL_SECURE_COOKIE` | enabled in production | Adds the Secure attribute to ticket cookies |
| `TERMINAL_MAX_TABS` | `6` | Maximum PTYs for the connected browser |
| `TERMINAL_SHELL` | `$SHELL`, then OS default | Shell executable |
| `TERMINAL_CWD` | current user's home | Initial shell working directory |

The gateway uses macOS's configured shell during local development and works
with a Linux shell on Raspberry Pi. HTTPS/WSS termination, systemd, and nginx
configuration are intentionally outside the current implementation.
