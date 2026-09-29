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

The image installs dependencies with `npm ci` and provides the canonical Node.js environment for development commands.

## Run checks

```sh
docker compose run --rm app npm run verify
```

This runs type-checking, unit tests, and a production bundle in sequence. The build output is written to the host workspace at `dist/`.

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
npm run verify
```

Choose either the Docker workflow or the host workflow for dependency installation. Remove host `node_modules` before switching back to Docker.

## Create a release

Releases are triggered by semantic-version tags. Before creating a tag, update the matching version in both `package.json` and `public/manifest.json`, then commit the changes.

```sh
git tag v0.1.0
git push origin v0.1.0
```

The GitHub Actions workflow verifies the tag and versions, runs type-checking and tests in Docker, builds the extension, and publishes a GitHub Release containing:

- `distraction-blocker-<version>.zip`
- `distraction-blocker-<version>.zip.sha256`

The ZIP contains the contents of `dist/` at its root so it can be extracted and loaded through Chrome Developer Mode. Chrome Web Store publication is not part of this workflow.

## Privacy

All configuration and session state stay in local Chrome extension storage. The extension does not send analytics, browsing history, or any other data to a remote service.
