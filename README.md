# SDG Forum Web

React + Vite front-end for the SDG Forum experience. Contributors can browse threads, join live chat conversations, and manage their profile. The project is opinionated about developer ergonomics: hooks hide network plumbing, UI components keep interaction patterns consistent, and documentation explains how to extend each subsystem.

---

## Getting started

```bash
npm install
npm run dev
```

The dev server boots on <http://localhost:5173>. Make sure the API base URL is available via `VITE_API_BASE_URL` in your `.env` (defaults to `https://sdg-forum-api.truesurvi4.xyz` when unset).

### Scripts

| Script            | Description                              |
|-------------------|------------------------------------------|
| `npm run dev`     | Vite dev server with HMR                 |
| `npm run build`   | Production bundle                        |
| `npm run preview` | Preview the production build locally     |
| `npm run lint`    | ESLint (see `eslint.config.js`)          |

---

## Project structure

```
src/
  api/            API client + typed services
  components/     Reusable UI (nav, auth layout, etc.)
  context/        Auth provider
  hooks/          Client-side helpers (chat, Google sign-in)
  pages/          Route components (forum, auth, landing)
  css/            Global styling (imported via src/styles.css)
docs/
  AUTH.md         Authentication guide
  THREADS.md      Thread list/detail interactions
  CHAT.md         Live chat implementation notes
```

Key entry points:

- `src/main.jsx` wires up `ApiProvider`, `AuthProvider`, and the root router.
- `src/api/client.ts` handles token injection and error normalisation.
- `src/pages/forum/ForumThreadsPage.jsx` renders the threaded feed with inline stats.
- `src/pages/forum/ThreadDetailPage.jsx` exposes per-thread interactions (appreciate, share, repost, report).
- `src/pages/forum/ForumChatPage.jsx` is the live chat surface using Socket.IO.

---

## Documentation

- [Authentication](./docs/AUTH.md)
- [Threads & interactions](./docs/THREADS.md)
- [Live chat](./docs/CHAT.md)

These guides explain how the hooks and services fit together so you can add features without spelunking through the entire codebase.

---

## Contributing tips

1. **Reuse hooks** – fetch data via `useApi()` services and mutate via the helper functions already in place.
2. **Optimistic updates** – thread detail shows how to mirror server counts locally; follow that model for new actions.
3. **UI consistency** – check existing CSS tokens (e.g. `thread-action`, `thread-card__stats--compact`) before inventing new ones.
4. **Docs first** – update the relevant file under `docs/` whenever you extend a subsystem.

Happy building!🎉
