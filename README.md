# CanPlan 2.0 — Mobile UI

The cross-platform **mobile app** for CanPlan 2.0, used by **primary users**:
the people who follow tasks step-by-step inside the app. Companion to the
[CanPlan-WebPortal](../CanPlan-WebPortal-main) project, which is the same
product viewed from the **supporter / admin** side.

> ⚠️ **Early setup.** This repository is the *first* version of the mobile app.
> It is intentionally limited to a home screen and project scaffolding. It ships
> a real AWS AppSync GraphQL client that is **ready to use once the endpoint and
> Cognito authentication are configured** (see [API setup](#api-setup-aws-appsync)).
> Screens talk to feature hooks (TanStack Query) rather than the network
> directly, so data fetching, caching, and the data source can change without
> touching screen rendering.

## Tech stack

- **React Native** + **TypeScript**
- **Expo SDK 51** (managed workflow — easy local development, EAS Build for releases)
- **React Navigation** (native stack) for screen routing
- **TanStack Query** (`@tanstack/react-query`) for caching, loading/error state, retries, and request deduplication
- A **fetch-based AWS AppSync GraphQL client** (`src/shared/api/`) with a pluggable Cognito token provider
- **StyleSheet + design tokens** (`src/shared/theme/tokens.ts`) — shared visual language with the web portal
- Build / submit pipeline compatible with **EAS Build** (`eas.json`)

## Architecture

Data flows in one direction through clearly-separated layers:

```text
Screen  →  Feature hook (TanStack Query)  →  Feature API facade  →  Shared GraphQL client  →  AWS AppSync
```

The code is organized by **feature** (`users`, `tasks`, `progress`, `home`) on
top of a **shared** layer (GraphQL client, query client, UI components, theme,
domain types).

```
.
├── app.json                 # Expo app configuration
├── eas.json                 # EAS Build / Submit configuration
├── App.tsx                  # AppProviders + NavigationContainer + screen stack
├── assets/
├── src/
│   ├── app/
│   │   └── AppProviders.tsx     # Wraps the app in the TanStack Query provider
│   ├── features/
│   │   ├── home/                # api/ (day summary), hooks/useHomeData, types
│   │   ├── tasks/               # api/, graphql/, hooks/ (useTasks, useTask), mappers/, types
│   │   ├── users/               # api/, graphql/, hooks/useMyProfile, mappers/, types
│   │   └── progress/            # api/, graphql/, hooks/useRecentActivity, mappers/, types
│   ├── shared/
│   │   ├── api/                 # graphqlClient, authTokenProvider, pagination, errors, healthCheck
│   │   ├── query/               # queryClient (defaults) + queryKeys (cache keys)
│   │   ├── components/          # Reusable UI (Header, TaskCard, StepIndicator)
│   │   ├── theme/               # Design tokens (colors, spacing, typography)
│   │   └── types/               # Shared UI domain types
│   ├── screens/                 # Route-level screens (HomeScreen for now)
│   └── env.d.ts
└── README.md
```

### How data flows

Screens **never** call the network directly. They use feature hooks, which wrap
a feature API facade in a TanStack Query `useQuery`:

| Hook                       | Feature API facade        | Returns                                  |
| -------------------------- | ------------------------- | ---------------------------------------- |
| `useMyProfile()`           | `users/api/userApi`       | the signed-in user's profile             |
| `useTasks()`               | `tasks/api/taskApi`       | the user's tasks, ordered by due date    |
| `useTask(taskId)`          | `tasks/api/taskApi`       | a single task with its ordered steps     |
| `useRecentActivity(limit)` | `progress/api/progressApi`| recent progress events                   |
| `useHomeData()`            | combines the above        | home-screen view-model (incl. day summary) |

Feature APIs call the AppSync GraphQL operations in each feature's `graphql/`
folder via the shared client (`src/shared/api/graphqlClient.ts`) and use that
feature's `mappers/` to convert raw backend shapes onto the shared UI domain
types in `src/shared/types`. "My tasks", for example, lists the user's
assignments, then fetches each referenced task and its steps.

The day summary is **derived from the already-cached task list** inside
`useHomeData` (via the pure `computeDaySummary`), so the home screen fetches
tasks only once instead of fetching them again for the summary.

## Local setup

Requires **Node.js 18+** and the Expo CLI (installed automatically via `npx`).

```bash
# 1. Install dependencies
npm install

# 2. Create your local environment file and set your GraphQL endpoint
cp .env.example .env.local
#    Edit .env.local to point EXPO_PUBLIC_GRAPHQL_URL at your AppSync endpoint
#    (see "API setup" below). A Cognito token provider must also be wired up
#    before requests succeed.

# 3. Start the Expo dev server
npm start

# 4. Run on a specific platform (optional)
npm run ios       # iOS Simulator (macOS only)
npm run android   # Android emulator
npm run web       # Run as a web preview
```

When the dev server is running, scan the QR code with the **Expo Go** app on
your phone, or press `i` / `a` / `w` in the terminal to launch the simulator,
Android emulator, or web preview.

> Environment variables are read at build time, so **restart the Expo dev
> server after changing `.env.local`**.

| Script            | Description                                   |
| ----------------- | --------------------------------------------- |
| `npm start`       | Start the Expo dev server                     |
| `npm run ios`     | Start and open iOS Simulator                  |
| `npm run android` | Start and open Android emulator               |
| `npm run web`     | Start the Expo web preview                    |
| `npm run lint`    | Type-check only (`tsc --noEmit`)              |

## API setup (AWS AppSync)

Screens never call the network directly — they use feature hooks, which call
feature API facades, which talk to a single GraphQL endpoint via a lightweight
fetch wrapper ([`src/shared/api/graphqlClient.ts`](./src/shared/api/graphqlClient.ts)).
Two things must be configured before requests succeed:

1. **Point the app at your endpoint** in `.env.local`:

   ```bash
   EXPO_PUBLIC_GRAPHQL_URL=https://YOUR-APP-ID.appsync-api.YOUR-REGION.amazonaws.com/graphql
   ```

2. **Wire up Cognito auth.** Authentication is *not* fully wired up in this app
   yet. The GraphQL client gets its Cognito **ID token** from a pluggable
   provider in [`src/shared/api/authTokenProvider.ts`](./src/shared/api/authTokenProvider.ts).
   Until you register one (e.g. early in `App.tsx`), API calls throw a clear
   "Authentication is not configured yet" error:

   ```ts
   import { setAuthTokenProvider } from './src/shared/api/authTokenProvider';
   // import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

   setAuthTokenProvider({
     getIdToken: async () =>
       (await fetchAuthSession()).tokens?.idToken?.toString() ?? null,
     getCurrentUserId: async () => (await getCurrentUser()).userId,
   });
   ```

The endpoint URL and tokens are **never hardcoded** — the URL comes from
`EXPO_PUBLIC_GRAPHQL_URL` and the token from the provider above. The AppSync API
key is not shipped in the app (it may only be used by a dev `healthCheck`
utility).

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

- **Authentication is not fully wired up yet.** Amazon Cognito will be added in
  a later phase. The real GraphQL client obtains its Cognito **ID token** from a
  runtime-injected provider (`src/shared/api/authTokenProvider.ts`); until one is
  registered, real API calls fail fast with a clear error instead of sending
  unauthenticated requests.
- **No AWS credentials or secrets are committed.** Backend URLs, Cognito tokens,
  API keys, and user ids are never hardcoded. The endpoint comes from
  `EXPO_PUBLIC_GRAPHQL_URL`; the ID token comes from the auth provider. The
  AppSync **API key is not shipped** in the app (it may only be used by a dev
  `healthCheck` utility). Use EAS secrets or runtime configuration for
  environment-specific values.
- `.env*` files (except `.env.example`) and generated AWS config files are
  git-ignored.

## Roadmap (future phases)

- Finish the AWS AppSync GraphQL integration (client scaffolded — verify
  operation selections against the deployed schema).
- Add Amazon Cognito authentication (sign-in, sign-up, password reset) and wire
  it to the `authTokenProvider`.
- Add an offline cache + sync queue (assigned tasks and media available without internet — SRS FR-OFF-01..04).
- Add a Task Detail screen with step-by-step execution, photo/audio/video support, and progress events.
- Add scheduling + reminders (local notifications).
- Add real-time help requests and supporter messaging.
- Add Bluetooth switch accessibility input and terminal-mode support.
- Add the Employment / Education / Seniors & Dementia onboarding modules.
