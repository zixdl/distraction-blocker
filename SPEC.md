# Distraction Blocker — Personal MVP Specification

**Status:** Approved for implementation
**Version:** 0.2
**Date:** 2026-09-28
**Distribution:** Local installation through Chrome Developer Mode

## 1. Purpose

Distraction Blocker is a small Chrome extension for personal use. It temporarily prevents access to user-selected distracting websites, such as Facebook and X, during a timed focus session.

This version is not intended for the Chrome Web Store or public distribution. The extension is for the owner's personal use, but its development environment must support future collaboration. The priority is a small, understandable implementation with a reproducible contributor workflow.

## 2. MVP goals

The extension must let the user:

1. Maintain a simple list of blocked domains.
2. Start a timed focus session.
3. See a local blocked page when navigating to a selected domain.
4. See the remaining focus time.
5. End a session early only after a 10-second confirmation delay.
6. Keep an active session working after Chrome restarts.
7. Provide a consistent build and test environment for contributors across supported host operating systems.

## 3. Included features

### 3.1 Block list

- The initial list contains `facebook.com` and `x.com`.
- The user can enable, disable, add, and remove domains while no session is active.
- The list is global and is reused for every session.
- At least one domain must be enabled before a session can start.
- Adding a hostname or HTTP/HTTPS URL is supported.
- A URL is normalized to a hostname.
- A blocked domain includes all of its subdomains.
- Duplicate domains are ignored with a clear message.
- Only HTTP and HTTPS websites are supported.

Examples:

- `https://www.facebook.com/messages` becomes `facebook.com`.
- Blocking `facebook.com` also blocks `www.facebook.com` and `m.facebook.com`.

### 3.2 Focus session

- The popup provides 25-, 50-, and 90-minute presets.
- The user may enter a custom duration from 1 minute through 24 hours.
- Only one session can be active at a time.
- The selected block list is fixed for the duration of the session.
- The popup displays the remaining time while a session is active.
- Remaining time is calculated from an absolute end timestamp, not from an in-memory counter.
- The session continues to elapse while Chrome is closed or the computer is asleep.
- When the end time is reached, blocking rules are removed automatically.

### 3.3 Early termination

- The active popup provides an **End session early** action.
- Selecting it starts a visible 10-second countdown.
- The final confirmation button remains disabled until the countdown completes.
- No written reason is required.
- Closing the popup cancels the early-termination flow.
- Reopening the popup requires starting the 10-second countdown again.

### 3.4 Blocking behavior

- Only top-level page navigations are blocked.
- Blocking applies to new navigations and reloads after the session starts.
- Tabs that were already open are not redirected automatically.
- A matching navigation is redirected to a local extension page.
- The blocked page displays:
  - the blocked domain;
  - the remaining time; and
  - **Go back** and **Close tab** actions.
- The blocked page does not provide a bypass or an early-end action.
- The attempted full URL is not stored.

### 3.5 Persistence

- Settings, the domain list, and the active session are stored locally with `chrome.storage.local`.
- A timed session stores `startedAt` and `endAt` timestamps.
- `chrome.alarms` is used to schedule session completion.
- On service-worker startup, the extension compares the current time with `endAt`:
  - if the session is still active, its blocking rules remain active;
  - if the session has expired, its blocking rules are removed and the session is cleared.
- No cloud sync or remote storage is used.

## 4. User interface

### 4.1 Popup

The popup is the primary interface.

#### Idle state

- Duration presets
- Custom-duration field
- Summary of enabled domains
- **Start focus session** button
- Link to manage domains

#### Active state

- Remaining time
- Number of blocked domains
- **End session early** button
- Early-termination countdown and confirmation when requested

### 4.2 Options page

The Options page contains:

- the domain list;
- enable/disable controls;
- add-domain input;
- remove actions; and
- a short explanation that list changes are disabled during an active session.

### 4.3 Blocked page

The Blocked Page is intentionally minimal. It contains:

- **This site is blocked during your focus session**;
- the canonical domain;
- the remaining time;
- **Go back**; and
- **Close tab**.

When the session has expired, the page shows **Focus session complete** and allows normal navigation again.

## 5. Technical approach

### 5.1 Stack

- Manifest V3
- TypeScript
- Vite
- Plain HTML and CSS
- No frontend framework

### 5.2 Development environment

Docker is the canonical environment for installing dependencies, type-checking, testing, and building the extension. Chrome itself continues to run on the developer's host machine.

The development model is:

```text
Source code on the host
        │
        ▼
Docker container
├── npm ci
├── TypeScript type-check
├── Vitest
└── Vite build/watch
        │
        ▼
dist/ on the host
        │
        ▼
Host Chrome → Load unpacked → Reload after rebuild
```

Requirements:

- A project `Dockerfile` pins the Node.js major version and installs dependencies reproducibly from `package-lock.json`.
- The container runs application commands as a non-root user.
- `compose.yaml` provides the standard development and one-off command workflow.
- The project source is bind-mounted into the container.
- `node_modules` uses a Docker named volume and is never shared with host-installed modules.
- Build output is written to the host workspace's `dist/` directory so host Chrome can load it.
- Watch mode supports Docker Desktop on macOS and Windows; polling may be enabled when native filesystem events are unreliable.
- `.dockerignore` excludes `node_modules`, `dist`, version-control metadata, and other unnecessary local files from the build context.
- The Docker workflow must work without requiring Node.js or npm to be installed on the host.
- Chrome is not installed or run inside the development container.
- Reloading the unpacked extension in `chrome://extensions` remains a manual host-browser step.

Standard contributor commands:

```sh
docker compose build
docker compose run --rm app npm test
docker compose run --rm app npm run typecheck
docker compose run --rm app npm run build
docker compose up dev
```

Direct host execution remains an optional convenience, not the canonical workflow. When used, its Node.js version must match the version declared by the project through `package.json` and a version file such as `.nvmrc` or `.node-version`. Host and container workflows must use the same npm scripts and lockfile.

### 5.3 Extension components

- Service worker for session and blocking-rule management
- Popup page
- Options page
- Blocked page
- Shared TypeScript modules for storage, domain normalization, and time calculations

### 5.4 Blocking engine

- Use `chrome.declarativeNetRequest` dynamic redirect rules.
- Each enabled domain creates one rule scoped to `main_frame` requests.
- Rules redirect matching navigations to the local Blocked Page.
- Dynamic rules are removed when the session ends.
- The extension uses a reserved rule-ID range and modifies only its own rules.
- The service worker reconciles stored session state with installed rules whenever it starts.

### 5.5 Permissions

Because this version is installed locally for one known user, it favors implementation simplicity over granular permission prompts.

Expected manifest permissions:

- `storage`
- `alarms`
- `declarativeNetRequestWithHostAccess`
- HTTP/HTTPS host access through `<all_urls>`

The extension does not request `tabs`, `webNavigation`, browsing history, cookies, notifications, or incognito access.

### 5.6 Minimal data model

```ts
type ExtensionState = {
  enabledDomains: string[];
  activeSession: {
    id: string;
    startedAt: number;
    endAt: number;
    domains: string[];
    ruleIds: number[];
  } | null;
};
```

The exact representation may change during implementation, but no browsing history, statistics, or full attempted URLs may be added without revising this specification.

## 6. Error handling

- Invalid or unsupported domain input is rejected with a clear message.
- Failure to install every required blocking rule prevents the session from starting.
- If session state is missing or invalid, the extension removes its own orphaned rules and returns to the idle state.
- If a session is expired when Chrome starts, the extension removes its rules and clears the session.
- The UI must never claim that a session is active unless its rules were installed successfully.

## 7. Privacy

- All data remains on the local device.
- The extension makes no developer or third-party network requests.
- No analytics, telemetry, crash reporting, accounts, advertisements, or remote configuration are included.
- No remote scripts, fonts, images, or other runtime dependencies are loaded.
- Only the configured domains and current session timestamps are stored.

## 8. Testing

Automated tests are limited to high-value logic:

- domain and URL normalization;
- duplicate and subdomain handling;
- duration validation;
- remaining-time calculation;
- rule generation; and
- session expiration and recovery.

Manual verification must cover:

1. Loading the unpacked extension in Chrome.
2. Adding and removing a domain.
3. Starting a session with each duration type.
4. Blocking a selected domain and allowing an unselected domain.
5. Ending a session through the 10-second confirmation.
6. Automatic completion.
7. Recovery after restarting Chrome during a session.

Development-environment verification must cover:

1. Building the image from a clean Docker cache.
2. Installing dependencies with `npm ci` inside the container.
3. Running type-check and automated tests inside the container.
4. Producing `dist/` in the host workspace from a container build.
5. Rebuilding after a source change in watch mode.
6. Loading the container-produced `dist/` directory into host Chrome.

## 9. Acceptance criteria

The Personal MVP is complete when:

1. The unpacked extension loads successfully in Chrome.
2. The user can manage a persistent list of domains.
3. The user can start a 25-, 50-, 90-minute, or custom-duration session.
4. Selected domains and their subdomains show the local Blocked Page during the session.
5. Unselected domains continue to work normally.
6. The popup shows an accurate remaining time.
7. Early termination requires the popup to remain open for a 10-second confirmation.
8. Natural or early completion removes every rule owned by the session.
9. An active session is restored correctly after Chrome restarts.
10. Invalid state fails open instead of leaving websites permanently blocked.
11. No full browsing URL, statistics, or remote data is collected.
12. A clean checkout can be built and tested through Docker without host Node.js or npm.
13. Container builds write a Chrome-loadable `dist/` directory to the host workspace.
14. Dependency files remain isolated in a Docker named volume rather than mixing Linux and host `node_modules`.
15. A short README explains the canonical Docker workflow, optional host workflow, and unpacked-extension reload process.

## 10. Out of scope

The following are explicitly excluded from this version:

- Chrome Web Store publication
- Privacy Policy and store disclosures
- Production packaging and store assets
- Onboarding
- Accounts or cloud sync
- Notifications
- Statistics and browsing history
- Focus intentions
- Indefinite sessions
- Pause or temporary bypass
- Preset categories beyond the initial Facebook and X entries
- Automatic handling of already-open tabs
- Incognito mode
- Multiple profiles or schedules
- Import/export
- Localization
- React or another UI framework
- End-to-end browser automation
- Running Chrome or another GUI browser inside Docker
- Containerizing the installed extension or browser profile
- Advanced schema migrations
- Gamification or branding work

## 11. Implementation gate

This document is the source of truth for Personal MVP implementation. Features listed as out of scope must not be added unless this specification is explicitly revised first.
