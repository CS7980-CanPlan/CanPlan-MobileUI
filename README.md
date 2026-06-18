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
- **AWS Amplify** (`aws-amplify`) for Cognito User Pool authentication
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
│   │   ├── auth/                # config/ (Amplify), api/ (Cognito), lib/ (token provider), hooks/ (useSignIn/useSignOut/useCurrentUser)
│   │   ├── home/                # api/ (day summary), hooks/useHomeData, types
│   │   ├── tasks/               # api/, graphql/, hooks/ (useTasks, useTask), mappers/, types
│   │   ├── users/               # api/, graphql/, hooks/useMyProfile, mappers/, types
│   │   └── progress/            # api/, graphql/, hooks/useRecentActivity, mappers/, types
│   ├── shared/
│   │   ├── api/                 # graphqlClient, authTokenProvider, pagination, errors, healthCheck
│   │   ├── query/               # queryClient (defaults) + queryKeys (cache keys)
│   │   ├── components/          # Reusable UI (Header, TaskCard)
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

2. **Set the Cognito User Pool** in `.env.local` (CloudFormation outputs):

   ```bash
   EXPO_PUBLIC_COGNITO_USER_POOL_ID=YOUR-REGION_XXXXXXXXX
   EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

When these are present, [`src/app/AppProviders.tsx`](./src/app/AppProviders.tsx)
configures **AWS Amplify** and registers a Cognito-backed auth token provider
automatically — no manual wiring needed. The GraphQL client then reads the
Cognito **ID token** from the shared provider
([`src/shared/api/authTokenProvider.ts`](./src/shared/api/authTokenProvider.ts))
and sends it as the `Authorization` header.

Sign the user in to obtain that token:

```tsx
import { useSignIn, useSignOut, useCurrentUser } from './src/features/auth';

const { mutate: signIn, isPending } = useSignIn();
signIn({ username: email, password });   // Cognito SRP sign-in
```

Until a user is signed in (or if the Cognito env vars are missing), API calls
fail fast with a clear "authentication is not configured" / "not signed in"
error instead of sending unauthenticated requests.

> **React Native native deps for Amplify v6.** Amplify Auth needs a few native
> polyfills at runtime. Install them and rebuild the dev client before testing
> sign-in on a device/simulator:
>
> ```bash
> npx expo install @react-native-async-storage/async-storage \
>   react-native-get-random-values
> ```
>
> Import `react-native-get-random-values` at the very top of `App.tsx`. (Type
> checking and fake/no-auth flows work without these; only live Cognito sign-in
> requires them.)

The endpoint URL and tokens are **never hardcoded** — the URL comes from
`EXPO_PUBLIC_GRAPHQL_URL`, the Cognito config from `EXPO_PUBLIC_COGNITO_*`, and
the token from Amplify at runtime. The AppSync API key is not shipped in the app
(it may only be used by a dev `healthCheck` utility).

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

- **Authentication uses Amazon Cognito (via AWS Amplify).** On startup the app
  configures Amplify and registers a Cognito-backed token provider behind the
  runtime-injected seam (`src/shared/api/authTokenProvider.ts`). The GraphQL
  client obtains its Cognito **ID token** from that provider; if the Cognito env
  vars are missing or no user is signed in, API calls fail fast with a clear
  error instead of sending unauthenticated requests.
- **No AWS credentials or secrets are committed.** Backend URLs, Cognito tokens,
  API keys, and user ids are never hardcoded. The endpoint comes from
  `EXPO_PUBLIC_GRAPHQL_URL`; the ID token comes from the auth provider. The
  AppSync **API key is not shipped** in the app (it may only be used by a dev
  `healthCheck` utility). Use EAS secrets or runtime configuration for
  environment-specific values.
- `.env*` files (except `.env.example`) and generated AWS config files are
  git-ignored.

## Roadmap (future phases)

- Verify the AppSync GraphQL operation selection sets against the deployed
  `schema.graphql` and exercise them end-to-end (the client, operations,
  mappers, and hooks are implemented but not yet run against the live backend;
  e.g. confirm the `ProgressEvent` field names and `Assignment.active`).
- Build the auth UI flows on top of the wired-up Cognito provider (sign-in
  exists via `useSignIn`; still to add: sign-up, password reset, MFA challenges)
  and add the RN native polyfills Amplify needs for live sign-in.
- Add an offline cache + sync queue (assigned tasks and media available without internet — SRS FR-OFF-01..04).
- Add a Task Detail screen with step-by-step execution, photo/audio/video support, and progress events.
- Add scheduling + reminders (local notifications).
- Add real-time help requests and supporter messaging.
- Add Bluetooth switch accessibility input and terminal-mode support.
- Add the Employment / Education / Seniors & Dementia onboarding modules.
