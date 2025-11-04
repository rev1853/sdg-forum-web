# Live Chat Overview

The chat feature blends REST calls (for room lists + history) with a Socket.IO connection for live updates. This document outlines how it works and what to touch when making changes.

## Components & Hooks

- `ForumChatPage` (`src/pages/forum/ForumChatPage.jsx`) renders the full chat experience.
- `useChatSocket` (`src/hooks/useChatSocket.js`) wraps Socket.IO and exposes a declarative API.

```
const {
  status,
  error,
  joinGroup,
  leaveGroup,
  sendMessage,
  reconnect,
  socket,
  isConnected
} = useChatSocket({ baseUrl, token, enabled, onMessage, onMessageRemoved });
```

### Connection lifecycle

1. We resolve the socket origin from the API base URL (`resolveSocketUrl`).
2. When a valid `token` is present and chat is supported, the hook `connect()`s.
3. Incoming events run through `onMessage`/`onMessageRemoved` callbacks provided by the page.
4. The hook exposes `joinGroup` / `leaveGroup` utilities that send ack-based events.
5. `sendMessage` tries every entry in `DEFAULT_SEND_EVENTS` until the server acknowledges.
6. `reconnect()` lets the UI trigger a shallow reconnect (e.g., after a network blip).

### Status labels

`ForumChatPage` maps the hook’s `status` to friendly UI badges (`Live now`, `Connecting…`, `Offline`).

## REST endpoints

The chat service (`src/api/services/chatService.ts`) provides:

- `listGroups()` – fetch available rooms (with fallback data when offline).
- `joinGroup()` / `leaveGroup()` – REST companion calls to ensure server state.
- `listMessages(roomId)` – initial history.

All API calls are guarded with try/catch and fall back to demo data when the backend is unavailable.

## UI structure

- **Rooms sidebar** – lists rooms and shows the connection badge + reconnect button.
- **Conversation header** – displays room name/description, connection badge, `Reconnect` button.
- **Message stream** – auto-scrolls to the bottom when new messages arrive; bubbles render avatars if available (see `normalizeMessage`).
- **Composer** – single-line textarea that auto-expands up to 140 px, with character counter and disabled states when offline or unauthenticated.

### Styling notes

Chat styling lives in the `.conversation-*`, `.chat-shell_*`, and `.chat-reconnect-button` selectors inside `src/css/forum.css`. The composer is intentionally compact (one-line default) to maximise space for the conversation.

## Message normalisation

`normalizeMessage(payload, baseUrl)` ensures each socket payload becomes a consistent object:

```ts
{
  id,
  groupId,
  author,
  authorId,
  content,
  timestamp,
  initials,
  avatar // resolved via resolveProfileImageUrl when available
}
```

That allows the stream to render avatars + fallback initials and data attributes uniformly, no matter how the backend structures nested fields.

## Interaction patterns

- **Optimistic UI** – incoming messages go straight into local state; out-going sends only mutate state if the socket acknowledges success.
- **Error handling** – `useChatSocket` records the last error; the page can surface a badge/toast as needed.
- **Reconnect** – both rooms header and conversation header expose the reconnect button (see `canReconnect` memo).

## Extending chat

1. **Add events** to `MESSAGE_EVENT_NAMES` / `MESSAGE_REMOVAL_EVENT_NAMES` if the server emits differently.
2. **Re-shape payloads** within `normalizeMessage` so the rest of the UI stays untouched.
3. **Update composer** logic if you introduce attachments or richer formatting (keep the auto-resize behaviour in mind).
4. **Expose new actions** (e.g. pinning) via the hook by adding helper functions that emit the correct socket events.

By following these patterns, enhancements can be layered on without upsetting the existing real-time flow.
