# Distraction Blocker

A small, personal Chrome extension that temporarily blocks selected distracting websites during a timed focus session.

## Requirements

- Docker Engine with Docker Compose, or Docker Desktop
- Google Chrome 120 or newer

Node.js is not required on the host when using the canonical Docker workflow.

## Build the development image

```sh
docker compose build
```

The image installs dependencies with `npm ci`, then runs type-checking, unit tests, and a production build as verification.

## Run checks

```sh
docker compose run --rm app npm run typecheck
docker compose run --rm app npm test
docker compose run --rm app npm run build
```

The build output is written to the host workspace at `dist/`.

## Development watch mode

```sh
docker compose up dev
```

Vite watches the bind-mounted source and rebuilds `dist/`. Polling is enabled for reliable file detection through Docker Desktop on macOS and Windows. Stop the watcher with `Ctrl+C`.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this project's `dist/` directory.

After changing the source, wait for the container build to finish and select **Reload** on the extension card in Chrome. Chrome runs on the host and is not part of the container.

## Dependency isolation

Container dependencies are stored in the Compose-managed `node_modules` volume. Do not share host-installed `node_modules` with the container.

To recreate the dependency volume after changing Node.js versions or troubleshooting dependency state:

```sh
docker compose down --volumes
docker compose build --no-cache
```

## Optional host workflow

Docker is the supported contributor workflow. Direct host execution remains available for convenience when Node.js 22 is installed:

```sh
nvm use
npm ci
npm test
npm run build
```

Choose either the Docker workflow or the host workflow for dependency installation. Remove host `node_modules` before switching back to Docker.

## Privacy

All configuration and session state stay in local Chrome extension storage. The extension does not send analytics, browsing history, or any other data to a remote service.
