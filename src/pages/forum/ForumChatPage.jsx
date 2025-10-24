import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForumNavbar from '../../components/forum/ForumNavbar';
import { useApi } from '@/api';
import { useAuth } from '../../context/AuthContext';
import useChatSocket from '@/hooks/useChatSocket';

const FALLBACK_ROOMS = [
  {
    id: 'global',
    title: 'Global Announcements',
    description: 'Platform updates and community-wide news.',
    messages: [
      {
        id: 'global-1',
        author: 'Moderator',
        timestamp: '08:24',
        content: 'Welcome to the live chat! Share quick updates and link to your threads for deeper dives.',
      },
      {
        id: 'global-2',
        author: 'Zahra',
        timestamp: '08:27',
        content: 'We just published a new guide for inclusive co-design workshops. Feedback welcome.',
      },
    ],
  },
  {
    id: 'goal-3',
    title: 'SDG 3 · Health + Well-being',
    description: 'Healthcare delivery, nutrition, mental health initiatives.',
    messages: [
      {
        id: 'goal-3-1',
        author: 'Dr. Lina',
        timestamp: '07:55',
        content: 'Cold chain pilot reached 16 clinics this week. Solar units are holding temperature in rainy season.',
      },
      {
        id: 'goal-3-2',
        author: 'Santi',
        timestamp: '08:03',
        content: 'Sharing WHO data set updates for those syncing weekly dashboards.',
      },
    ],
  },
  {
    id: 'goal-6',
    title: 'SDG 6 · Clean Water',
    description: 'Water purification, sanitation systems, watershed protection.',
    messages: [
      {
        id: 'goal-6-1',
        author: 'Abena',
        timestamp: '09:10',
        content: 'We have spare capacity on our filtration units. DM if your community needs a shipment.',
      },
      {
        id: 'goal-6-2',
        author: 'Elisa',
        timestamp: '09:22',
        content: 'Does anyone have sample policies for community-led maintenance funding?',
      },
    ],
  },
  {
    id: 'goal-11',
    title: 'SDG 11 · Sustainable Cities',
    description: 'Urban planning, housing access, resilient infrastructure.',
    messages: [
      {
        id: 'goal-11-1',
        author: 'Ravi',
        timestamp: '10:01',
        content: 'Modular micro-housing prototypes are ready for review. Looking for testers in coastal regions.',
      },
    ],
  },
];

const MESSAGE_CHARACTER_LIMIT = 2000;
const SCROLL_THRESHOLD_PX = 120;

const generateFallbackId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const mapApiGroupToRoom = (group) => {
  if (!group || typeof group !== 'object') {
    return null;
  }

  const categories = Array.isArray(group.categories)
    ? group.categories.map((entry) => entry?.category?.name).filter(Boolean)
    : [];

  const fallbackDescription = categories.length > 0 ? `Focus: ${categories.join(', ')}` : 'Live discussion room.';
  const description =
    typeof group.description === 'string' && group.description.trim().length > 0
      ? group.description
      : fallbackDescription;

  return {
    id: group.id ?? group.slug ?? group.name ?? generateFallbackId(),
    title: group.name ?? 'SDG Forum Live Room',
    description,
    categories,
    source: 'api',
  };
};

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const extractUserName = (candidate) => {
  if (!candidate || typeof candidate === 'number') return undefined;
  if (typeof candidate === 'string') return candidate;
  if (typeof candidate === 'object') {
    return (
      candidate.name ??
      candidate.username ??
      candidate.displayName ??
      candidate.fullName ??
      candidate.handle ??
      undefined
    );
  }
  return undefined;
};

const extractUserId = (candidate, fallback) => {
  if (!candidate) return fallback;
  if (typeof candidate === 'object') {
    return (
      candidate.id ??
      candidate.userId ??
      candidate.user_id ??
      candidate.senderId ??
      candidate.sender_id ??
      candidate.authorId ??
      candidate.author_id ??
      fallback ??
      null
    );
  }
  return fallback ?? null;
};

const mapApiMessage = (input, options = {}) => {
  const message = input?.message ?? input;
  if (!message || typeof message !== 'object') return null;

  const targetGroupId = getMessageGroupId(message) ?? options.groupId ?? null;

  const rawAuthorObject =
    message.user ?? message.sender ?? message.author ?? (typeof message.author === 'object' ? message.author : null);

  const authorName =
    extractUserName(rawAuthorObject) ??
    (typeof message.author === 'string' ? message.author : undefined) ??
    extractUserName(message.profile) ??
    'Participant';

  const authorId =
    message.user_id ??
    message.userId ??
    message.sender_id ??
    message.senderId ??
    message.author_id ??
    message.authorId ??
    extractUserId(rawAuthorObject, options.fallbackAuthorId ?? null);

  const rawTimestamp =
    message.created_at ?? message.createdAt ?? message.sent_at ?? message.sentAt ?? message.timestamp ?? null;

  let createdAtMs = null;
  let displayTimestamp = typeof message.timestamp === 'string' ? message.timestamp : '';
  let isoTimestamp = null;

  if (rawTimestamp) {
    const parsed = new Date(rawTimestamp);
    if (!Number.isNaN(parsed.getTime())) {
      createdAtMs = parsed.getTime();
      isoTimestamp = parsed.toISOString();
      displayTimestamp = formatTimestamp(parsed.toISOString()) ?? displayTimestamp;
    }
  }

  if (createdAtMs === null) {
    createdAtMs = Date.now();
    isoTimestamp = new Date(createdAtMs).toISOString();
  }

  if (!displayTimestamp) {
    displayTimestamp = formatTimestamp(isoTimestamp) ?? '';
  }

  const content =
    message.body ??
    message.content ??
    message.text ??
    message.message ??
    (typeof message === 'string' ? message : '');

  const normalizedContent = String(content).trim();
  if (!normalizedContent) {
    return null;
  }

  const replySource = message.reply_to ?? message.replyTo ?? message.reply ?? null;
  let reply = null;

  if (replySource && typeof replySource === 'object') {
    const replyAuthorObject = replySource.user ?? replySource.author ?? replySource.sender ?? null;
    reply = {
      id: replySource.id ?? null,
      author: extractUserName(replyAuthorObject) ?? (typeof replySource.author === 'string' ? replySource.author : 'Unknown'),
      content: replySource.body ?? replySource.content ?? replySource.text ?? '',
    };

    if (!reply.content) {
      reply = null;
    }
  }

  const identifier =
    message.id ??
    message.messageId ??
    message.message_id ??
    message.uuid ??
    message._id ??
    generateFallbackId();

  return {
    id: identifier,
    groupId: targetGroupId,
    author: authorName,
    authorId,
    timestamp: displayTimestamp,
    createdAt: isoTimestamp,
    createdAtMs,
    content: normalizedContent,
    reply,
  };
};

const getMessageGroupId = input => {
  const message = input?.message ?? input;

  return (
    message?.groupId ??
    message?.group_id ??
    message?.group?.id ??
    message?.roomId ??
    message?.room_id ??
    null
  );
};

const getMessageId = input => {
  const message = input?.message ?? input;
  return message?.id ?? message?.messageId ?? message?.message_id ?? null;
};

const isDesktopMatch = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(min-width: 1025px)').matches;
};

const ForumChatPage = () => {
  const { chat, baseUrl } = useApi();
  const { user, token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [isRoomsLoading, setIsRoomsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [roomsError, setRoomsError] = useState('');
  const [messagesError, setMessagesError] = useState('');
  const [sendError, setSendError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => isDesktopMatch());
  const [socketWarning, setSocketWarning] = useState('');
  const socketRoomRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRooms = async () => {
      setIsRoomsLoading(true);
      setRoomsError('');

      try {
        const response = await chat.listGroups({ pageSize: 12 });
        if (cancelled) return;

        const rawRooms = Array.isArray(response?.data) ? response.data : [];
        const mappedRooms = rawRooms.map(mapApiGroupToRoom).filter(Boolean);

        if (mappedRooms.length > 0) {
          setRooms(mappedRooms);
          setActiveRoomId((prev) =>
            prev && mappedRooms.some((room) => room.id === prev) ? prev : mappedRooms[0].id,
          );
          return;
        }

        setRooms(FALLBACK_ROOMS);
        setActiveRoomId(FALLBACK_ROOMS[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load chat rooms', error);
          setRoomsError('Unable to load live chat rooms right now. Showing a preview instead.');
          setRooms(FALLBACK_ROOMS);
          setActiveRoomId(FALLBACK_ROOMS[0]?.id ?? null);
        }
      } finally {
        if (!cancelled) {
          setIsRoomsLoading(false);
        }
      }
    };

    loadRooms();

    return () => {
      cancelled = true;
    };
  }, [chat]);

  useEffect(() => {
    if (rooms.length > 0 && !activeRoomId) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [rooms, activeRoomId],
  );

  const handleIncomingMessage = useCallback(
    (payload) => {
      const targetGroupId = getMessageGroupId(payload);
      if (!targetGroupId) return;
      if (!activeRoom || activeRoom.source !== 'api') return;
      if (targetGroupId !== activeRoom.id) return;

      const mapped = mapApiMessage(payload?.message ?? payload, { groupId: activeRoom.id });
      if (!mapped) return;

      setMessages((prev) => {
        if (prev.some((message) => message.id === mapped.id)) {
          return prev;
        }

        const next = [...prev, mapped];
        next.sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
        return next;
      });
    },
    [activeRoom],
  );

  const handleRemovedMessage = useCallback(
    (payload) => {
      const targetGroupId = getMessageGroupId(payload);
      const identifier = getMessageId(payload);
      if (!identifier) return;
      if (!activeRoom || activeRoom.source !== 'api') return;
      if (targetGroupId && targetGroupId !== activeRoom.id) return;
      setMessages((prev) => prev.filter((message) => message.id !== identifier));
    },
    [activeRoom],
  );

  const {
    status: socketStatus,
    error: socketError,
    joinGroup: joinSocketGroup,
    leaveGroup: leaveSocketGroup,
    sendMessage: socketSendMessage,
    isConnected: isSocketConnected,
  } = useChatSocket({
    baseUrl,
    token,
    enabled: Boolean(token),
    onMessage: handleIncomingMessage,
    onMessageRemoved: handleRemovedMessage,
  });

  useEffect(() => {
    if (socketError) {
      setSocketWarning(socketError.message ?? 'Live chat connection lost. Reconnecting…');
    } else {
      setSocketWarning('');
    }
  }, [socketError]);

  const loadMessages = useCallback(
    async (room) => {
      setSendError('');

      if (!room) {
        setMessages([]);
        setMessagesError('');
        return;
      }

      if (room.source !== 'api') {
        const fallbackMessages = Array.isArray(room.messages)
          ? room.messages
              .map((item) => mapApiMessage(item, { groupId: room.id, fallbackAuthorId: item?.authorId }))
              .filter(Boolean)
          : [];

        fallbackMessages.sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));

        setMessages(fallbackMessages);
        setMessagesError('');
        return;
      }

      if (!token) {
        setMessages([]);
        setMessagesError('Sign in to view live chat activity and participate in the conversation.');
        return;
      }

      setIsMessagesLoading(true);
      setMessagesError('');

      try {
        await chat.joinGroup(room.id).catch(() => undefined);
        const response = await chat.listMessages(room.id, { limit: 50 });
        const payload =
          (response && 'messages' in response ? response.messages : undefined) ??
          (response && Array.isArray(response?.data) ? response.data : undefined) ??
          [];
        const mappedMessages = Array.isArray(payload)
          ? payload.map((item) => mapApiMessage(item, { groupId: room.id })).filter(Boolean)
          : [];

        mappedMessages.sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
        setMessages(mappedMessages);
      } catch (error) {
        console.error('Failed to load chat messages', error);
        setMessages([]);
        setMessagesError('Unable to load messages from the SDG Forum API right now.');
      } finally {
        setIsMessagesLoading(false);
      }
    },
    [chat, token],
  );

  useEffect(() => {
    loadMessages(activeRoom);
  }, [activeRoom, loadMessages]);

  useEffect(() => {
    const node = streamRef.current;
    if (!node) return;

    requestAnimationFrame(() => {
      node.scrollTo({ top: node.scrollHeight, behavior: 'auto' });
    });
  }, [activeRoom?.id]);

  useEffect(() => {
    const node = streamRef.current;
    if (!node) return;

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    if (distanceFromBottom <= SCROLL_THRESHOLD_PX) {
      node.scrollTo({ top: node.scrollHeight, behavior: messages.length > 1 ? 'smooth' : 'auto' });
    }
  }, [messages]);

  useEffect(() => {
    if (!activeRoom || activeRoom.source !== 'api' || !token) {
      const previous = socketRoomRef.current;
      if (previous) {
        leaveSocketGroup(previous).catch(() => undefined);
        socketRoomRef.current = null;
      }
      return;
    }

    const targetRoomId = activeRoom.id;

    const ensureSubscription = async () => {
      try {
        await chat.joinGroup(targetRoomId).catch(() => undefined);
      } catch (error) {
        console.error('Failed to join chat room via API', error);
      }

      if (!isSocketConnected) {
        return;
      }

      if (socketRoomRef.current && socketRoomRef.current !== targetRoomId) {
        await leaveSocketGroup(socketRoomRef.current).catch(() => undefined);
        socketRoomRef.current = null;
      }

      if (socketRoomRef.current === targetRoomId) {
        return;
      }

      try {
        await joinSocketGroup(targetRoomId);
        socketRoomRef.current = targetRoomId;
      } catch (error) {
        console.error('Failed to subscribe to chat room', error);
        setSocketWarning('Unable to subscribe to live updates for this room.');
      }
    };

    ensureSubscription();
  }, [activeRoom, chat, isSocketConnected, joinSocketGroup, leaveSocketGroup, token]);

  useEffect(
    () => () => {
      if (socketRoomRef.current) {
        leaveSocketGroup(socketRoomRef.current).catch(() => undefined);
        socketRoomRef.current = null;
      }
    },
    [leaveSocketGroup],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(min-width: 1025px)');

    const handleChange = (event) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setIsSidebarOpen(false);
      }
    };

    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const connectionLabel = useMemo(() => {
    if (!activeRoom || activeRoom.source !== 'api') {
      return 'Preview';
    }
    if (!token) {
      return 'Sign in required';
    }
    if (socketStatus === 'connected') {
      return 'Live now';
    }
    if (socketStatus === 'connecting') {
      return 'Connecting…';
    }
    if (socketWarning) {
      return 'Offline';
    }
    return 'Idle';
  }, [activeRoom, socketStatus, socketWarning, token]);

  const trimmedDraft = draft.trim();
  const charactersRemaining = MESSAGE_CHARACTER_LIMIT - trimmedDraft.length;
  const isOverLimit = charactersRemaining < 0;
  const isNearLimit = !isOverLimit && charactersRemaining <= 50;
  const counterClassName = [
    'chat-composer__counter',
    isOverLimit ? 'is-error' : '',
    isNearLimit ? 'is-warning' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const counterText = trimmedDraft
    ? isOverLimit
      ? `${Math.abs(charactersRemaining)} over the limit`
      : `${charactersRemaining} characters left`
    : `${MESSAGE_CHARACTER_LIMIT} characters max`;

  const sidebarId = 'chat-sidebar-panel';
  const sidebarStyle = !isDesktop && !isSidebarOpen ? { display: 'none' } : undefined;
  const sidebarClassName = [
    'forum-sidebar',
    !isDesktop ? 'chat-sidebar-panel' : '',
    !isDesktop && isSidebarOpen ? 'is-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedContent = draft.trim();
    if (!normalizedContent || !activeRoom) return;

    if (normalizedContent.length > MESSAGE_CHARACTER_LIMIT) {
      setSendError(`Messages are limited to ${MESSAGE_CHARACTER_LIMIT} characters.`);
      return;
    }

    if (activeRoom.source !== 'api') {
      const fallbackMessage = mapApiMessage(
        {
          id: generateFallbackId(),
          author: 'You',
          body: normalizedContent,
          created_at: new Date().toISOString(),
          group_id: activeRoom.id,
        },
        { groupId: activeRoom.id, fallbackAuthorId: user?.id ?? 'local-user' },
      );

      if (fallbackMessage) {
        setMessages(prev => {
          const next = [...prev, fallbackMessage];
          next.sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
          return next;
        });
      }
      setDraft('');
      return;
    }

    if (!token) {
      setMessagesError('Sign in to join the conversation.');
      return;
    }

    if (!isSocketConnected) {
      setSendError('Reconnecting to live chat. Please try again momentarily.');
      return;
    }

    setIsSending(true);
    setSendError('');

    try {
      const result = await socketSendMessage({ groupId: activeRoom.id, content: normalizedContent });
      setDraft('');
      if (!result || result?.status !== 'pending') {
        await loadMessages(activeRoom);
      }
    } catch (error) {
      console.error('Failed to send message', error);
      setSendError(error?.message ?? 'Unable to send message right now.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="themed-page forum-page">
      <title>Forum Chat • SDG Forum</title>
      <ForumNavbar />

      <div className="forum-layout chat-layout">
        <aside
          id={sidebarId}
          className={sidebarClassName}
          aria-hidden={!isDesktop && !isSidebarOpen}
          style={sidebarStyle}
        >
          {!isDesktop && (
            <button
              type="button"
              className="chat-sidebar-close"
              aria-label="Close menu"
              onClick={() => setIsSidebarOpen(false)}
            >
              Close
            </button>
          )}
          <div className="sidebar-card">
            <h2>Forum rooms</h2>
            <p>Drop in for real-time updates, resource swaps, and quick coordination.</p>

            {roomsError ? (
              <p className="chat-status chat-status--info" role="status">
                {roomsError}
              </p>
            ) : null}

            <ul className="chat-room-list">
              {rooms.map(room => (
                <li key={room.id} className={room.id === activeRoom?.id ? 'is-active' : ''}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRoomId(room.id);
                      if (!isDesktop) {
                        setIsSidebarOpen(false);
                      }
                    }}
                  >
                    <strong>{room.title}</strong>
                    <span>{room.description}</span>
                  </button>
                </li>
              ))}
            </ul>

            {isRoomsLoading ? (
              <p className="chat-status" role="status">
                Loading rooms…
              </p>
            ) : null}
          </div>
        </aside>
        {!isDesktop && isSidebarOpen ? (
          <button
            type="button"
            className="chat-sidebar-backdrop"
            aria-label="Close menu"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        <main className="chat-main">
          {!isDesktop && (
            <button
              type="button"
              className="chat-sidebar-toggle"
              onClick={() => setIsSidebarOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isSidebarOpen ? 'true' : 'false'}
              aria-controls={sidebarId}
            >
              Browse rooms
            </button>
          )}
          <header className="chat-header">
            <div>
              <h2>{activeRoom?.title ?? 'Live chat'}</h2>
              <p>{activeRoom?.description}</p>
            </div>
            <span className="chat-meta">{connectionLabel}</span>
          </header>

          {messagesError ? (
            <div className="chat-status chat-status--error" role="alert">
              {messagesError}
            </div>
          ) : null}

          {socketWarning && !messagesError ? (
            <div className="chat-status chat-status--info" role="status">
              {socketWarning}
            </div>
          ) : null}

          <div className="chat-stream" ref={streamRef}>
            {isMessagesLoading ? (
              <div className="empty-state">
                <h3>Fetching the latest conversation…</h3>
                <p>This can take a moment the first time you open a room.</p>
              </div>
            ) : messages.length > 0 ? (
              messages.map((message) => {
                const isOwnMessage = Boolean(user?.id && message.authorId && message.authorId === user.id);
                const messageClassName = ['chat-message', isOwnMessage ? 'chat-message--self' : '']
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div key={message.id} className={messageClassName} data-message-id={message.id}>
                    <div className="chat-message__meta">
                      <span className="author">{isOwnMessage ? 'You' : message.author}</span>
                      {message.timestamp ? (
                        <span className="timestamp">{message.timestamp}</span>
                      ) : null}
                    </div>
                    {message.reply ? (
                      <div className="chat-message__reply">
                        <span className="chat-message__reply-author">{message.reply.author}</span>
                        {message.reply.content ? <p>{message.reply.content}</p> : null}
                      </div>
                    ) : null}
                    <p>{message.content}</p>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <h3>No messages yet</h3>
                <p>Start the conversation and invite collaborators from your thread.</p>
              </div>
            )}
          </div>

          {activeRoom?.source === 'api' ? (
            token ? (
              <form className="chat-composer" onSubmit={handleSubmit}>
                <textarea
                  placeholder={
                    isSocketConnected
                      ? 'Share a quick update, resource, or question'
                      : 'Connecting to live chat…'
                  }
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  onFocus={() => setSendError('')}
                  disabled={!isSocketConnected || isSending}
                  maxLength={MESSAGE_CHARACTER_LIMIT}
                />
                <div className="chat-composer__footer">
                  <span className={counterClassName}>{counterText}</span>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={!trimmedDraft || !isSocketConnected || isSending || isOverLimit}
                  >
                    {isSending ? 'Sending…' : 'Send'}
                  </button>
                </div>
                {sendError ? (
                  <p className="chat-status chat-status--error" role="alert">
                    {sendError}
                  </p>
                ) : null}
              </form>
            ) : (
              <div className="chat-composer chat-composer--disabled" aria-disabled="true">
                <textarea placeholder="Sign in to join the conversation." value="" disabled />
                <div className="chat-composer__footer">
                  <span className="chat-composer__counter">{MESSAGE_CHARACTER_LIMIT} characters max</span>
                  <button type="button" className="primary-button" disabled>
                    Send
                  </button>
                </div>
              </div>
            )
          ) : (
            <form
              className="chat-composer"
              onSubmit={event => {
                event.preventDefault();
                const normalizedContent = draft.trim();
                if (!normalizedContent) return;

                const fallbackMessage = mapApiMessage(
                  {
                    id: generateFallbackId(),
                    author: 'You',
                    body: normalizedContent,
                    created_at: new Date().toISOString(),
                    group_id: activeRoom?.id,
                  },
                  { groupId: activeRoom?.id ?? null, fallbackAuthorId: user?.id ?? 'local-user' },
                );

                if (fallbackMessage) {
                  setMessages(prev => {
                    const next = [...prev, fallbackMessage];
                    next.sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
                    return next;
                  });
                }
                setDraft('');
              }}
            >
              <textarea
                placeholder="Share a quick update, resource, or question"
                value={draft}
                onChange={event => setDraft(event.target.value)}
                maxLength={MESSAGE_CHARACTER_LIMIT}
              />
              <div className="chat-composer__footer">
                <span className={counterClassName}>{counterText}</span>
                <button type="submit" className="primary-button" disabled={!trimmedDraft}>
                  Send
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </section>
  );
};

export default ForumChatPage;
