> 公開用スナップショットです。実データ、認証情報、運用環境の識別子は含めていません。

# Hibi Log

Hibi Log is a Japanese, local-first personal record app for iOS and Android (Backlog TAGU-23). It covers diary, meals, expenses, running, sleep, condition, weight, and schedules. The Expo UI works without a server; sign-in and cross-device sync are provided by the included reference server.

## Implemented behavior

- Today view distinguishes recorded, missing, and intentionally skipped values.
- Quick entry supports reusable candidates, free text/numbers, draft auto-save, editing, soft deletion, and copying a past record.
- Review offers day/week/month timelines, weekly distance, monthly spending/category totals, and non-zero-filled sleep/condition/weight observations.
- Local JSON persistence permits entry and reading while offline. Revision-aware sync is idempotent and retries without dropping pending edits.
- Reminder defaults to 21:30 Asia/Tokyo, is permission-gated, excludes recorded/skipped targets, sends at most once per local day, deep-links to quick entry, and never includes sensitive details in its body.
- Strava has optional connection, server-side secrets/tokens, OAuth state validation, mock success/denial/expiry/rate-limit paths, incremental import by activity ID, status/error display, and disconnect. Manual running entry is always available.
- JSON export and confirmed account/data deletion are present.

## Local setup

No credentials are needed for tests or the Strava mock.

1. Copy `.env.example` to `.env` and keep `USE_STRAVA_MOCK=true`.
2. Install the declared packages when network/package installation is permitted: `npm install`.
3. Run `npm test` (pure Node, no installed packages required).
4. Run the reference API with `npm run server`.
5. Run Expo with `npm start`, then choose iOS or Android. On a physical phone, set `EXPO_PUBLIC_API_URL` to the development computer's reachable HTTPS/LAN address rather than `localhost`.

This isolated implementation did not install packages. The Expo dependency versions in `package.json` therefore require a normal package-install step before an Expo bundle can be built.

## Configuration and production boundary

Only `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_STRAVA_CLIENT_ID` may be exposed to the app. `STRAVA_CLIENT_SECRET`, refresh tokens, and `SESSION_SECRET` belong only on the server. The included server stores data in memory for safe local tests; production must replace it with an encrypted-at-rest authenticated datastore, HTTPS, durable sessions, password/passkey or identity-provider authentication, token encryption, backups, and rate limiting.

The current Strava API contract assumed by the adapter is OAuth authorization-code flow with `activity:read`, token refresh on expiry, webhook hints plus bounded differential fetch, and deduplication by activity ID. Rate-limit responses stop import and retain a retry time. The specification links are recorded in [external-services.md](docs/external-services.md); because this run was explicitly offline, live terms and limits must be rechecked before enabling real credentials.

Expo local notifications require user permission and physical-device verification. Remote cross-device reminders may incur Expo/cloud-provider operational costs. Strava and the local mock are free to develop against, but production hosting, authentication, database, mail/SMS, and app-store accounts can incur fees. Nothing in this repository deploys or purchases them.

## Commands

- `npm test`: domain, offline sync, notification, Strava, auth/server integration tests.
- `python -m unittest discover -s tests -v`: runs the same behavioral suite through Python test discovery used by the project orchestrator.
- `npm run check`: syntax checks plus all tests.
- `npm run server`: local in-memory API on `127.0.0.1:8787`.
- `npm start`: Expo development server after dependencies are installed.

See [HANDOVER.md](HANDOVER.md), [device-testing.md](docs/device-testing.md), and [architecture.md](docs/architecture.md).
