# Authentication Guide

This repository centralises authentication and session handling so product code can stay focused on UI concerns. This guide captures everything you need to know when touching auth-related features.

## Overview

- All network calls go through the typed `ApiProvider` (`src/api/ApiProvider.tsx`).
- Auth state (user + token) lives inside `AuthProvider` (`src/context/AuthContext.jsx`).
- Login, register, password reset, and Google sign-in pages re-use the hooks exposed by these providers.

```
<ApiProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</ApiProvider>
```

## Endpoints & Services

Defined in `src/api/services/authService.ts`:

| Action                    | Method + Path                       | Payload / Notes                                   |
|--------------------------|-------------------------------------|---------------------------------------------------|
| Register                 | `POST /auth/register`               | `{ email, username, password, name? }`            |
| Login (email/username)   | `POST /auth/login`                  | `{ identifier, password }`                        |
| Login with Google        | `POST /auth/google`                 | `{ idToken }` (GIS token)                         |
| Request password reset   | `POST /auth/reset-password/request` | `{ email }`                                       |
| Confirm password reset   | `POST /auth/reset-password/confirm` | `{ token, password }`                             |

Every successful response returns an access token. The `AuthContext` stores it via `storeToken` and triggers a profile refresh when a user object is present.

## Hooks

### `useAuth()`

Located at `src/context/AuthContext.jsx`:

- `user`, `token`, `isReady`
- `login(credentials)`
- `loginWithGoogle(idToken)`
- `logout()`
- `refreshUser()`

Under the hood, `login` calls the auth service, persists the token, and optionally enriches the user via `users.getUser`.

### `useApi()`

Convenience hook that exposes the configured services (`auth`, `threads`, `users`, `chat`, `categories`) along with `baseUrl`. Use these functions rather than creating ad-hoc fetch calls.

## Google Sign-In

`src/hooks/useGoogleSignIn.js` wraps Google Identity Services:

```js
const { ready, loading, error, signIn } = useGoogleSignIn(handleCredential);
```

- Lazily injects the GIS script.
- Initialises the client with the configured `clientId`.
- `signIn()` triggers the popup and returns the raw credential to `handleCredential`.
- Surfaces load errors so UI can present a fallback path.

## Token Storage

- Stored in `localStorage` under `sdgForumAccessToken` (`src/api/tokenStorage.ts`).
- Cleared on `logout`.
- Automatically attached to every request through `ApiProvider`'s `getAccessToken` callback.

## Patterns to Keep

1. **Guard interactions** &mdash; wrap mutating handlers with an `ensureSignedIn` helper so unauthenticated users see a meaningful prompt.
2. **Optimistic UI** &mdash; update counts locally, then reconcile when you fetch fresh data.
3. **Surface API feedback** &mdash; prefer `error?.data?.message` so backend messaging reaches users.
4. **Shared feedback component** &mdash; Thread detail uses `interactionFeedback` to show a toast-like message; re-use this pattern for new actions.

## Related Screens

| Screen                | Path                   | Notes                                      |
|-----------------------|------------------------|--------------------------------------------|
| `LoginPage`           | `/auth/login`          | Email/password + Google popup flow         |
| `RegisterPage`        | `/auth/register`       | Creates account, reuses auth hooks         |
| `ForgotPasswordPage`  | `/auth/reset-password` | Sends reset email                          |
| `ResetPasswordPage`   | `/auth/reset-password/confirm` | Submits the new password               |

Copy the patterns used here whenever adding new auth-dependent experiences.
