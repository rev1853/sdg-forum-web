import { useEffect, useMemo, useRef, useState } from 'react';
import { FiSend, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import ForumNavbar from '../../components/forum/ForumNavbar';
import { useApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import useChatSocket from '@/hooks/useChatSocket';
import { resolveProfileImageUrl } from '@utils/media';

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

const normalizeMessage = (message, baseUrl) => {
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
  const avatar =
    (typeof authorObject === 'object' && authorObject ? resolveProfileImageUrl(authorObject, baseUrl) : null) ??
    resolveProfileImageUrl(raw, baseUrl);

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
    avatar: avatar ?? null,
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
  const [joinedRoomId, setJoinedRoomId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const streamRef = useRef(null);
  const composerRef = useRef(null);

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
    reconnect: reconnectSocket,
    isConnected,
    error: socketError,
  } = useChatSocket({
    baseUrl,
    token,
    enabled: Boolean(token && supportsLiveChat),
    onMessage: (payload) => {
      const mapped = normalizeMessage(payload, baseUrl);
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
          avatar: null,
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
          avatar: null,
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
      setJoinedRoomId(null); // Reset join status
      try {
        // Attempt to join via REST API first
        try {
          await chat.joinGroup(activeRoomId);
        } catch (err) {
          // Ignore "already member" errors, but log others
          console.warn('REST joinGroup warning:', err);
        }
        setJoinedRoomId(activeRoomId); // Mark as ready for socket connection

        const response = await chat.listMessages(activeRoomId, { limit: 50 });
        if (cancelled) return;

        const rawMessages = Array.isArray(response?.messages)
          ? response.messages
          : Array.isArray(response?.data)
            ? response.data
            : [];
        const normalized = rawMessages.map((entry) => normalizeMessage(entry, baseUrl)).filter(Boolean);
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
    if (!isConnected || joinedRoomId !== activeRoomId) return undefined; // Wait for REST join for THIS room

    let isMounted = true;

    const ensureSocketSubscription = async () => {
      try {
        await joinSocketGroup(activeRoomId);
        if (isMounted) {
          setStatusMessage(''); // Clear any previous error messages on success
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to subscribe to chat room', error);
          setStatusMessage(`Live updates are offline: ${error.message || 'Connection failed'}`);
        }
      }
    };

    ensureSocketSubscription();

    return () => {
      isMounted = false;
      leaveSocketGroup(activeRoomId).catch(() => undefined);
      // We do NOT call chat.leaveGroup here to avoid thrashing REST membership when switching views
    };
  }, [activeRoomId, chat, joinSocketGroup, leaveSocketGroup, supportsLiveChat, token, isConnected, joinedRoomId]);

  // Expose socket error to UI
  useEffect(() => {
    if (socketError) {
      console.error('Socket connection error:', socketError);
      setStatusMessage(`Connection issue: ${socketError.message || 'Unknown error'}`);
    }
  }, [socketError]);

  useEffect(() => {
    const element = streamRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 32), 140);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 140 ? 'auto' : 'hidden';
  }, [draft, activeRoomId]);

  const connectionLabel = useMemo(() => {
    if (!token) return 'Preview';
    if (socketStatus === 'connected') return 'Live now';
    if (socketStatus === 'connecting') return 'Connecting…';
    if (socketStatus === 'error') return 'Offline';
    if (socketStatus === 'disconnected') return 'Offline';
    return 'Idle';
  }, [socketStatus, token]);

  const isSocketOffline = socketStatus === 'error' || socketStatus === 'disconnected';
  const showConversationOverlay = !token;

  const canReconnect = useMemo(
    () => Boolean(token && supportsLiveChat && (isSocketOffline || socketStatus === 'idle')),
    [isSocketOffline, socketStatus, supportsLiveChat, token],
  );

  const renderConnectionAction = () => {
    if (canReconnect) {
      return (
        <button
          type="button"
          className="text-xs text-[var(--color-accent-secondary)] hover:text-white underline"
          onClick={reconnectSocket}
          disabled={socketStatus === 'connecting'}
        >
          {socketStatus === 'connecting' ? 'Reconnecting…' : 'Reconnect'}
        </button>
      );
    }

    if (!token) {
      return (
        <Link to="/auth/login" className="text-xs text-[var(--color-accent-secondary)] hover:text-white underline">
          Sign in
        </Link>
      );
    }

    return null;
  };

  const renderConversationAction = () => {
    if (showConversationOverlay) {
      return null;
    }

    if (!token) {
      return (
        <Link to="/auth/login" className="primary-button my-4">
          Sign in to chat
        </Link>
      );
    }

    if (isSocketOffline) {
      return (
        <button
          type="button"
          className="primary-button my-4"
          onClick={reconnectSocket}
          disabled={socketStatus === 'connecting'}
        >
          {socketStatus === 'connecting' ? 'Reconnecting…' : 'Reconnect to chat'}
        </button>
      );
    }

    return null;
  };

  const trimmedDraft = draft.trim();
  const charactersRemaining = MESSAGE_LIMIT - trimmedDraft.length;
  const composerCounterClass = [
    'conversation-composer__counter',
    charactersRemaining < 0 ? 'text-red-400' : '',
    charactersRemaining <= 50 && charactersRemaining >= 0 ? 'text-yellow-400' : '',
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
      <main className="chat-page bg-[var(--color-bg-primary)]" role="main">
        <div className="chat-shell">
          <aside className="chat-shell__rooms">
            <header className="chat-shell__rooms-header">
              <div>
                <h2>Live rooms</h2>
                <p>Select a space that matches your focus area.</p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${connectionState === 'live-now' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{connectionLabel}</span>
                {renderConnectionAction()}
              </div>
            </header>
            <ul>
              {isLoadingRooms
                ? [...Array(3)].map((_, index) => (
                  <li key={`room-skeleton-${index}`} className="p-4 animate-pulse" aria-hidden="true">
                    <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-700/30 rounded w-1/2"></div>
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
              <div className="conversation-header__status flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${connectionState === 'live-now' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {connectionLabel}
                </span>
                {renderConnectionAction()}
              </div>
            </header>

            {statusMessage ? <div className="p-2 text-center text-sm text-yellow-200 bg-yellow-900/20">{statusMessage}</div> : null}
            {renderConversationAction()}
            {/* Removed blocking overlay to allow previewing messages */}

            <div className="conversation-stream" ref={streamRef}>
              {isLoadingMessages ? (
                <div className="conversation-message animate-pulse" aria-hidden="true">
                  <div className="conversation-message__avatar bg-gray-700"></div>
                  <div className="conversation-message__content w-full">
                    <header className="conversation-message__meta">
                      <div className="h-3 bg-gray-700/50 rounded w-20"></div>
                    </header>
                    <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="forum-empty">
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
                  const avatarAlt = `${message.author}'s avatar`;

                  return (
                    <div
                      key={message.id}
                      className={`conversation-message${isSelf ? ' conversation-message--self' : ''}`}
                      aria-live="polite"
                    >
                      <div className={`conversation-message__avatar${message.avatar ? ' has-image' : ''}`}>
                        {message.avatar ? (
                          <img src={message.avatar} alt={avatarAlt} />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="conversation-message__body">
                        <header className="conversation-message__meta">
                          <strong>{message.author}</strong>
                          <time title={message.timestamp}>{message.timestamp}</time>
                        </header>
                        <div className="conversation-message__bubble">
                          <p>{message.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <footer className={`conversation-composer${!supportsLiveChat ? ' opacity-50 pointer-events-none' : ''}`}>
              <form onSubmit={handleSend}>
                <label htmlFor="chat-draft" className="sr-only">
                  Message
                </label>
                <textarea
                  id="chat-draft"
                  rows={1}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="conversation-composer__input"
                  placeholder={
                    !supportsLiveChat
                      ? 'Live chat is temporarily unavailable.'
                      : token
                        ? 'Share a quick update or link to a thread.'
                        : 'Sign in to send messages.'
                  }
                  disabled={!supportsLiveChat || !token || isSending}
                  maxLength={MESSAGE_LIMIT + 20}
                  ref={composerRef}
                  style={{
                    minHeight: '32px',
                    maxHeight: '140px',
                    padding: '0.8rem 1rem',
                    fontSize: '0.95rem',
                    lineHeight: '1.4',
                    overflow: 'hidden',
                  }}
                />
                <div className="conversation-composer__footer">
                  <span className={composerCounterClass}>
                    {trimmedDraft
                      ? charactersRemaining >= 0
                        ? `${charactersRemaining} characters left`
                        : `${Math.abs(charactersRemaining)} over the limit`
                      : `${MESSAGE_LIMIT} characters max`}
                  </span>
                  <div className="conversation-composer__actions flex items-center gap-4">
                    {sendError && <span className="text-red-400 text-sm">{sendError}</span>}
                    <button type="submit" className="primary-button !py-2 !px-6 gap-2" disabled={!supportsLiveChat || !token || isSending}>
                      {isSending ? 'Sending…' : <><FiSend size={16} /> Send</>}
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
