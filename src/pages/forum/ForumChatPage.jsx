import { useEffect, useMemo, useRef, useState } from 'react';
import ForumNavbar from '../../components/forum/ForumNavbar';
import { useApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import useChatSocket from '@/hooks/useChatSocket';

const MESSAGE_LIMIT = 500;

const FALLBACK_ROOMS = [
  {
    id: 'global',
    name: 'Global announcements',
    description: 'Platform updates and community-wide news.',
    messages: [
      {
        id: 'global-1',
        author: 'Moderator',
        content: 'Welcome to the live chat! Share quick updates and link to your threads for deeper dives.',
        timestamp: '08:24',
      },
      {
        id: 'global-2',
        author: 'Zahra',
        content: 'We just published a new guide for inclusive co-design workshops. Feedback welcome.',
        timestamp: '08:27',
      },
    ],
  },
  {
    id: 'goal-6',
    name: 'SDG 6 • Clean Water',
    description: 'Water purification, sanitation systems, watershed protection.',
    messages: [
      {
        id: 'goal-6-1',
        author: 'Abena',
        content: 'We have spare capacity on our filtration units. DM if your community needs a shipment.',
        timestamp: '09:10',
      },
      {
        id: 'goal-6-2',
        author: 'Elisa',
        content: 'Does anyone have sample policies for community-led maintenance funding?',
        timestamp: '09:22',
      },
    ],
  },
];

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getInitials = (value) => {
  if (!value) return 'U';
  const tokens = value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]);
  if (tokens.length === 0) return 'U';
  if (tokens.length === 1) return tokens[0].toUpperCase();
  return `${tokens[0]}${tokens[tokens.length - 1]}`.toUpperCase();
};

const normalizeRoom = (room) => {
  if (!room) return null;
  return {
    id: room.id ?? room.slug ?? room.name ?? null,
    name: room.name ?? 'SDG Forum Live Room',
    description:
      room.description && room.description.trim().length > 0
        ? room.description
        : room.categories && room.categories.length > 0
          ? `Focus: ${room.categories.map((entry) => entry?.category?.name).filter(Boolean).join(', ')}`
          : 'Live conversation with the community.',
  };
};

const normalizeMessage = (message) => {
  if (!message) return null;
  const raw = message?.message ?? message;
  if (!raw || typeof raw !== 'object') return null;

  const content = raw.content ?? raw.body ?? raw.text ?? '';
  const trimmed = typeof content === 'string' ? content.trim() : '';
  if (!trimmed) return null;

  const authorObject = raw.sender ?? raw.author ?? raw.user ?? raw.profile ?? null;
  const authorName =
    (typeof authorObject === 'string' && authorObject.trim().length > 0
      ? authorObject.trim()
      : authorObject?.name ?? authorObject?.username ?? authorObject?.displayName) || 'Community member';

  const timestampValue =
    raw.created_at ?? raw.createdAt ?? raw.sent_at ?? raw.sentAt ?? raw.timestamp ?? new Date().toISOString();

  return {
    id:
      raw.id ??
      raw.messageId ??
      raw.message_id ??
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    groupId: raw.groupId ?? raw.group_id ?? null,
    author: authorName,
    authorId:
      raw.sender_id ??
      raw.senderId ??
      raw.author_id ??
      raw.authorId ??
      raw.user_id ??
      raw.userId ??
      null,
    content: trimmed,
    timestamp: formatTime(timestampValue),
    initials: getInitials(authorName),
  };
};

const ForumChatPage = () => {
  const { chat, baseUrl } = useApi();
  const { user, token } = useAuth();
  const supportsLiveChat = typeof chat?.listGroups === 'function';

  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const streamRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!supportsLiveChat) {
      setRooms(FALLBACK_ROOMS);
      setActiveRoomId((current) => current ?? FALLBACK_ROOMS[0]?.id ?? null);
      setStatusMessage('Live rooms preview is shown because the chat API is unavailable.');
      setIsLoadingRooms(false);
      return undefined;
    }

    const loadRooms = async () => {
      setIsLoadingRooms(true);
      try {
        const response = await chat.listGroups({ pageSize: 8 });
        if (cancelled) return;

        const mappedRooms = (Array.isArray(response?.data) ? response.data : [])
          .map(normalizeRoom)
          .filter((room) => room && room.id);

        if (mappedRooms.length > 0) {
          setRooms(mappedRooms);
          setActiveRoomId((current) => {
            if (current && mappedRooms.some((room) => room.id === current)) {
              return current;
            }
            return mappedRooms[0].id;
          });
          return;
        }

        setRooms(FALLBACK_ROOMS);
        setActiveRoomId(FALLBACK_ROOMS[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load chat rooms', error);
          setRooms(FALLBACK_ROOMS);
          setActiveRoomId(FALLBACK_ROOMS[0]?.id ?? null);
          setStatusMessage('Unable to load live rooms. Showing a preview instead.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRooms(false);
        }
      }
    };

    loadRooms();
    return () => {
      cancelled = true;
    };
  }, [chat, supportsLiveChat]);

  const {
    status: socketStatus,
    joinGroup: joinSocketGroup,
    leaveGroup: leaveSocketGroup,
    sendMessage,
  } = useChatSocket({
    baseUrl,
    token,
    enabled: Boolean(token && supportsLiveChat),
    onMessage: (payload) => {
      const mapped = normalizeMessage(payload);
      if (!mapped || !mapped.groupId) return;
      setMessages((current) => {
        if (mapped.groupId !== activeRoomId) {
          return current;
        }
        return [...current, mapped];
      });
    },
    onMessageRemoved: (payload) => {
      const id = payload?.id ?? payload?.message?.id;
      if (!id) return;
      setMessages((current) => current.filter((message) => message.id !== id));
    },
  });

  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }

    if (!supportsLiveChat) {
      const fallbackRoom = FALLBACK_ROOMS.find((room) => room.id === activeRoomId);
      const fallbackMessages = fallbackRoom
        ? fallbackRoom.messages.map((message) => ({
            ...message,
            groupId: fallbackRoom.id,
            initials: getInitials(message.author),
          }))
        : [];
      setMessages(fallbackMessages);
      setStatusMessage('Live chat API is unavailable. Showing a preview instead.');
      setIsLoadingMessages(false);
      return;
    }

    if (!token) {
      const fallbackRoom = FALLBACK_ROOMS.find((room) => room.id === activeRoomId);
      const fallbackMessages = fallbackRoom
        ? fallbackRoom.messages.map((message) => ({
            ...message,
            groupId: fallbackRoom.id,
            initials: getInitials(message.author),
          }))
        : [];
      setMessages(fallbackMessages);
      setStatusMessage('Sign in to join the live conversation. Showing a preview instead.');
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      setStatusMessage('');
      try {
        await chat.joinGroup(activeRoomId).catch(() => undefined);
        const response = await chat.listMessages(activeRoomId, { limit: 50 });
        if (cancelled) return;

        const rawMessages = Array.isArray(response?.messages)
          ? response.messages
          : Array.isArray(response?.data)
            ? response.data
            : [];
        const normalized = rawMessages.map(normalizeMessage).filter(Boolean);
        setMessages(normalized);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load chat messages', error);
          setMessages([]);
          setStatusMessage('Unable to load recent messages. New ones will appear when the connection is ready.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeRoomId, chat, supportsLiveChat, token]);

  useEffect(() => {
    if (!supportsLiveChat || !activeRoomId || !token) return undefined;

    let isMounted = true;

    const ensureSocketSubscription = async () => {
      try {
        await joinSocketGroup(activeRoomId);
      } catch (error) {
        if (isMounted) {
          console.error('Failed to subscribe to chat room', error);
          setStatusMessage('Live updates are offline. New messages may be delayed.');
        }
      }
    };

    ensureSocketSubscription();

    return () => {
      isMounted = false;
      leaveSocketGroup(activeRoomId).catch(() => undefined);
      chat.leaveGroup(activeRoomId).catch(() => undefined);
    };
  }, [activeRoomId, chat, joinSocketGroup, leaveSocketGroup, supportsLiveChat, token]);

  useEffect(() => {
    const element = streamRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages]);

  const connectionLabel = useMemo(() => {
    if (!token) return 'Preview';
    if (socketStatus === 'connected') return 'Live now';
    if (socketStatus === 'connecting') return 'Connecting…';
    if (socketStatus === 'error') return 'Offline';
    if (socketStatus === 'disconnected') return 'Offline';
    return 'Idle';
  }, [socketStatus, token]);

  const trimmedDraft = draft.trim();
  const charactersRemaining = MESSAGE_LIMIT - trimmedDraft.length;
  const composerCounterClass = [
    'conversation-composer__counter',
    charactersRemaining < 0 ? 'is-error' : '',
    charactersRemaining <= 50 && charactersRemaining >= 0 ? 'is-warning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleSend = async (event) => {
    event.preventDefault();
    if (!token) {
      setSendError('Sign in to send messages.');
      return;
    }

    if (!activeRoomId) {
      setSendError('Choose a room before sending a message.');
      return;
    }

    if (!supportsLiveChat) {
      setSendError('Live chat is temporarily unavailable.');
      return;
    }

    if (charactersRemaining < 0) {
      setSendError('Message is over the character limit.');
      return;
    }

    if (!trimmedDraft) {
      return;
    }

    try {
      setIsSending(true);
      setSendError('');
      await sendMessage({ groupId: activeRoomId, content: trimmedDraft });
      setDraft('');
    } catch (error) {
      console.error('Failed to send message', error);
      setSendError(error?.message || 'Unable to send your message right now.');
    } finally {
      setIsSending(false);
    }
  };

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? null;
  const connectionState = connectionLabel.toLowerCase().replace(/\s+/g, '-');

  return (
    <>
      <ForumNavbar />
      <main className="chat-page" role="main">
        <div className="chat-shell">
          <aside className="chat-shell__rooms">
            <header className="chat-shell__rooms-header">
              <div>
                <h2>Live rooms</h2>
                <p>Select a space that matches your focus area.</p>
              </div>
              <span className={`chat-status-badge chat-status-badge--${connectionState}`}>{connectionLabel}</span>
            </header>
            <ul>
              {isLoadingRooms
                ? [...Array(3)].map((_, index) => (
                    <li key={`room-skeleton-${index}`} className="chat-room chat-room--skeleton" aria-hidden="true">
                      Loading room…
                    </li>
                  ))
                : rooms.length === 0
                  ? (
                    <li className="chat-room chat-room--empty">No rooms available right now.</li>
                  ) : (
                    rooms.map((room) => (
                      <li key={room.id}>
                        <button
                          type="button"
                          className={`chat-room${room.id === activeRoomId ? ' is-active' : ''}`}
                          onClick={() => setActiveRoomId(room.id)}
                        >
                          <strong>{room.name}</strong>
                          <span>{room.description}</span>
                        </button>
                      </li>
                    ))
                  )}
            </ul>
          </aside>

          <section className="chat-shell__conversation">
            <header className="conversation-header">
              <div>
                <h2>{activeRoom?.name ?? 'Live chat'}</h2>
                <p>{activeRoom?.description ?? 'Jump into the conversation with fellow builders.'}</p>
              </div>
              <span className={`conversation-header__badge conversation-header__badge--${connectionState}`}>
                {connectionLabel}
              </span>
            </header>

            {statusMessage ? <div className="conversation-status">{statusMessage}</div> : null}

            <div className="conversation-stream" ref={streamRef}>
              {isLoadingMessages ? (
                <div className="conversation-message conversation-message--skeleton" aria-hidden="true">
                  <div className="conversation-message__avatar">…</div>
                  <div className="conversation-message__content">
                    <header className="conversation-message__meta">
                      <strong>Connecting</strong>
                      <time>Now</time>
                    </header>
                    <p>Preparing the latest messages…</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="conversation-empty">
                  <h3>No messages yet</h3>
                  <p>
                    {token
                      ? 'Kick off the conversation with a quick note.'
                      : 'Sign in to join the live chat and see what the community is sharing.'}
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const isSelf =
                    (user?.id && message.authorId && String(message.authorId) === String(user.id)) ||
                    (user?.name && message.author && message.author.trim() === user.name.trim());
                  const initials = message.initials || getInitials(message.author);

                  return (
                    <div
                      key={message.id}
                      className={`conversation-message${isSelf ? ' conversation-message--self' : ''}`}
                      aria-live="polite"
                    >
                      <div className="conversation-message__avatar">{initials}</div>
                      <div className="conversation-message__content">
                        <header className="conversation-message__meta">
                          <strong>{message.author}</strong>
                          <time>{message.timestamp}</time>
                        </header>
                        <p>{message.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <footer className={`conversation-composer${(!token || !supportsLiveChat) ? ' conversation-composer--disabled' : ''}`}>
              <form onSubmit={handleSend}>
                <label htmlFor="chat-draft" className="sr-only">
                  Message
                </label>
                <textarea
                  id="chat-draft"
                  rows={4}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={
                    !supportsLiveChat
                      ? 'Live chat is temporarily unavailable.'
                      : token
                        ? 'Share a quick update or link to a thread.'
                        : 'Sign in to send messages.'
                  }
                  disabled={!supportsLiveChat || !token || isSending}
                  maxLength={MESSAGE_LIMIT + 20}
                />
                <div className="conversation-composer__footer">
                  <span className={composerCounterClass}>
                    {trimmedDraft
                      ? charactersRemaining >= 0
                        ? `${charactersRemaining} characters left`
                        : `${Math.abs(charactersRemaining)} over the limit`
                      : `${MESSAGE_LIMIT} characters max`}
                  </span>
                  <div className="conversation-composer__actions">
                    {sendError && <span className="conversation-composer__error">{sendError}</span>}
                    <button type="submit" className="primary-button" disabled={!supportsLiveChat || !token || isSending}>
                      {isSending ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </div>
              </form>
            </footer>
          </section>
        </div>
      </main>
    </>
  );
};

export default ForumChatPage;
