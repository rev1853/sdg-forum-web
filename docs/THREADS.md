# Threads & Interactions

This guide documents how thread listing, detail, and interaction tooling is assembled. Use it whenever you need to extend the social features of the app.

## Data flow

- `threadsService` (`src/api/services/threadsService.ts`) owns all thread endpoints.
- `ThreadList` views (`ForumThreadsPage`) consume `threads.listThreads`.
- `ThreadDetailPage` calls:
  - `threads.getThread(id)`
  - `threads.listReplies(id)`
  - `threads.createReply(id, payload)`
  - `threads.likeThread` / `threads.unlikeThread`
  - `threads.repostThread` / `threads.removeRepost`
  - `threads.reportThread`

Counts are stored locally in state so the UI remains responsive. After a successful interaction we optimistically mutate `counts` and reconcile when new data arrives.

## Thread list cards

Located in `src/pages/forum/ForumThreadsPage.jsx` with styling in `src/css/forum.css`:

- Entire card is a `<Link>` (`thread-card thread-card--link`).
- Structure:
  ```
  .thread-card
    .thread-card__media (optional)
    .thread-card__content
      .thread-card__body (meta, title, snippet)
      .thread-card__footer
        .thread-card__interactions (counts + CTA)
        .thread-card__author (avatar + timestamp)
  ```
- Interaction chips reuse `<ThreadStat>`; styling compresses them inside `thread-card__stats--compact`.

When adding info to the card, place it inside `thread-card__body` so the footer still pins to the bottom.

## Thread detail actions

`ThreadDetailPage` exposes four quick actions driven by service calls:

| Action        | Service method                     | Local feedback                                  |
|---------------|------------------------------------|-------------------------------------------------|
| Appreciate    | `threads.likeThread` / `unlikeThread` | Optimistically adjust `counts.likes`         |
| Share (repost)| `threads.repostThread` / `removeRepost` | Optimistically adjust `counts.reposts`    |
| Copy link     | Use Web Share API, clipboard fallback | Updates `interactionFeedback` toast       |
| Report        | `threads.reportThread` with payload | Opens modal, posts reason + notes               |

All buttons go through `ensureSignedIn` to prevent unauthenticated actions.

## Report modal

- State: `isReportModalOpen`, `reportReason`, `reportNotes`.
- Reasons list defined in-place; feel free to expand it.
- Modal is rendered at the bottom of `ThreadDetailPage` with accessible markup (`role="dialog"`, overlay button, ESC support).
- Styles live in the `thread-report-modal*` selectors in `src/css/forum.css`.

## Replies

- Replies use `ThreadSummary` models.
- Body strings are split by newline to support lightweight paragraphs.
- Avatar resolution uses `resolveProfileImageUrl` fallback helpers.

## Utilities

- `getAuthorInfo` normalises author block for threads & replies.
- `normalizeMessage` inside chat (see `docs/CHAT.md`) uses the same pattern so avatars stay consistent across the app.
- `ensureSignedIn` helper in thread detail can be reused elsewhere when you need to gate functionality.

## Adding new interactions

1. **Extend** `threadsService` if the endpoint does not yet exist.
2. **Update** local state optimistically (`setCounts` / custom state).
3. **Surface** a toast message via `setInteractionFeedback`.
4. **Keep UI responsive** by disabling buttons while awaiting the promise.

Following these steps ensures new actions feel consistent with the rest of the experience.
