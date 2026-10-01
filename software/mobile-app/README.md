# ClampPlay-1 Mobile App

A mobile-first PWA for preparing songs, rehearsing assisted actions, calibrating channels, reviewing safety state, and monitoring ClampPlay-1.

## Scope

- Local song library with event editing
- Piano, guitar, and pedal simulation workspaces
- Ten-channel calibration records
- Emergency stop, manual reset, and audit log
- Local JSON import and export
- Web Serial connection entry for Chrome or Edge
- PWA manifest and offline cache
- Docker and Compose deployment configuration

## Safety boundary

This application defaults to local simulation. It does not prove that an actuator is safe to operate. Before connecting real hardware, verify current limiting, soft contact surfaces, mechanical travel, return behavior, emergency stop, communication timeout, and instrument compatibility.

## Run locally without Docker

Use any static file server from this directory. For PWA and Web Serial behavior, use `localhost` or HTTPS.

Example with Python:

```text
python -m http.server 8088
```

Open `http://localhost:8088`.

## Run with Docker

1. Start Docker Desktop.
2. From this directory run:

```text
docker compose up --build -d
```

3. Open `http://localhost:8088`.
4. Stop the service with:

```text
docker compose down
```

## Web Serial

Use Chrome or Edge. The application opens in demo mode by default. Use Settings > Connect Web Serial only after the real controller firmware, emergency stop path, and low-force single-channel test are verified.

## Files

- `index.html`: application shell
- `app.js`: state, pages, safety workflow, local simulation
- `styles.css`: mobile-first visual system
- `locales/zh-CN.json`: user-facing Chinese labels
- `manifest.webmanifest`: installable PWA metadata
- `sw.js`: offline cache
- `Dockerfile`, `nginx.conf`, `compose.yaml`: container deployment
