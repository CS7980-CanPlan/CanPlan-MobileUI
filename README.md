# CanPlan 2.0 — Mobile UI

The cross-platform **mobile app** for CanPlan 2.0, used by **primary users**:
the people who follow tasks step-by-step inside the app. Companion to the
[CanPlan-WebPortal](../CanPlan-WebPortal-main) project, which is the same
product viewed from the **supporter / admin** side.

> ⚠️ **Initial setup — mocked data.** This repository is the *first* version of
> the mobile app. It is intentionally limited to a home screen and project
> scaffolding. **All data is currently mocked.** There is no real backend,
> authentication, or AWS connection yet. The fake API layer is designed to be
> swapped for real AWS AppSync GraphQL calls later with minimal changes to
> screen and component code.

## Tech stack

- **React Native** + **TypeScript**
- **Expo SDK 51** (managed workflow — easy local development, EAS Build for releases)
- **React Navigation** (native stack) for screen routing
- **StyleSheet + design tokens** (`src/theme/tokens.ts`) — shared visual language with the web portal
- A **fake GraphQL API service** (`src/api/fakeGraphqlClient.ts`) backed by in-memory mock data
- Build / submit pipeline compatible with **EAS Build** (`eas.json`)

## Project structure

```
.
├── app.json                 # Expo app configuration
├── eas.json                 # EAS Build / Submit configuration
├── babel.config.js
├── App.tsx                  # NavigationContainer + screen stack
├── assets/                  # App icons, splash, images (add real assets later)
├── src/
│   ├── api/                 # Data-access layer (fake GraphQL client for now)
│   │   └── fakeGraphqlClient.ts
│   ├── components/          # Reusable UI components (Header, TaskCard, StepIndicator)
│   ├── data/                # In-memory mock data (NOT imported by components)
│   │   └── mockData.ts
│   ├── screens/             # Route-level screens (HomeScreen for now)
│   ├── theme/               # Design tokens (colors, spacing, typography)
│   └── types/               # Shared TypeScript domain types
└── README.md
```

### How data flows

Components **never** import mock data directly. They call async functions from
`src/api/fakeGraphqlClient.ts`, which simulate network latency and return data
shaped like the future AppSync GraphQL responses:

- `getMyProfile()` — the signed-in primary user's profile
- `getMyTasks()` — tasks assigned to the current user, ordered by due date
- `getTaskById(taskId)` — a single task with its ordered steps
- `getMyDaySummary()` — counts for the home-screen summary tiles
- `getMyRecentActivity(limit?)` — recent progress events for the current user

When the real backend is ready, reimplement these functions using the Amplify
GraphQL client (e.g. `generateClient().graphql(...)`). As long as the function
signatures and return types stay the same, no UI code needs to change.

The shared `src/types/index.ts` mirrors the web portal's domain types so both
clients consume the same AppSync schema.

## Local setup

Requires **Node.js 18+** and the Expo CLI (installed automatically via `npx`).

```bash
# 1. Install dependencies
npm install

# 2. Start the Expo dev server
npm start

# 3. Run on a specific platform (optional)
npm run ios       # iOS Simulator (macOS only)
npm run android   # Android emulator
npm run web       # Run as a web preview
```

When the dev server is running, scan the QR code with the **Expo Go** app on
your phone, or press `i` / `a` / `w` in the terminal to launch the simulator,
Android emulator, or web preview.

| Script            | Description                                   |
| ----------------- | --------------------------------------------- |
| `npm start`       | Start the Expo dev server                     |
| `npm run ios`     | Start and open iOS Simulator                  |
| `npm run android` | Start and open Android emulator               |
| `npm run web`     | Start the Expo web preview                    |
| `npm run lint`    | Type-check only (`tsc --noEmit`)              |

## Building for release with EAS

This project is ready to build with **EAS Build** for distribution to the App
Store and Google Play.

1. Install the EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Configure your project: `eas build:configure` (uses [`eas.json`](./eas.json))
4. Build for internal testing: `eas build --profile preview`
5. Build for production: `eas build --profile production`

The `eas.json` profiles included here are the Expo defaults — adjust them as
the release process matures.

## Security notes

- **No real authentication yet.** Amazon Cognito will be added in a later phase.
- **No AWS credentials or secrets are committed.** Do not hardcode secrets in
  this repo. Environment-specific values should come from EAS secrets or runtime
  configuration.
- `.env*` files and generated AWS config files are git-ignored.

## Roadmap (future phases)

- Replace the fake API layer with AWS AppSync GraphQL (DynamoDB-backed).
- Add Amazon Cognito authentication (sign-in, sign-up, password reset).
- Add an offline cache + sync queue (assigned tasks and media available without internet — SRS FR-OFF-01..04).
- Add a Task Detail screen with step-by-step execution, photo/audio/video support, and progress events.
- Add scheduling + reminders (local notifications).
- Add real-time help requests and supporter messaging.
- Add Bluetooth switch accessibility input and terminal-mode support.
- Add the Employment / Education / Seniors & Dementia onboarding modules.
