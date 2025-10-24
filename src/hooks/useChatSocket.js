import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { DEFAULT_API_BASE_URL } from '@/api/client';

const MESSAGE_EVENT_NAMES = ['chat:new-message', 'chat:message:new', 'chat:message:created', 'chat:message'];
const MESSAGE_REMOVAL_EVENT_NAMES = ['chat:message:deleted', 'chat:message:removed'];
const DEFAULT_SEND_EVENTS = ['chat:send', 'chat:message:send', 'chat:message:create', 'chat:message'];

const resolveSocketUrl = (value) => {
  try {
    const parsed = new URL(value ?? DEFAULT_API_BASE_URL);
    return parsed.origin;
  } catch (error) {
    console.error('Invalid chat socket base URL provided. Falling back to default.', error);
    const fallback = new URL(DEFAULT_API_BASE_URL);
    return fallback.origin;
  }
};

const normalizeToken = (token) => {
  if (!token) return undefined;
  if (typeof token !== 'string') return undefined;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

const createSocket = ({ baseUrl, token }) => {
  const preparedToken = normalizeToken(token);
  const auth = preparedToken ? { token: preparedToken } : undefined;

  return io(baseUrl, {
    auth,
    autoConnect: false,
    transports: ['websocket', 'polling'],
  });
};

const emitWithAck = async (socket, event, payload) => {
  try {
    const response = await socket.timeout(5000).emitWithAck(event, payload);
    const isErrorResponse = response && typeof response === 'object' && response.status === 'error';
    if (isErrorResponse) {
      const error = new Error(response.message ?? 'Socket operation failed');
      error.code = response.code;
      return { ok: false, error, response };
    }

    return { ok: true, response };
  } catch (error) {
    return { ok: false, error };
  }
};

export const useChatSocket = ({
  baseUrl,
  token,
  enabled = true,
  onMessage,
  onMessageRemoved,
  sendEventVariants = DEFAULT_SEND_EVENTS,
} = {}) => {
  const [status, setStatus] = useState(token && enabled ? 'connecting' : 'idle');
  const [lastError, setLastError] = useState(null);
  const socketRef = useRef(null);

  const resolvedBaseUrl = useMemo(() => resolveSocketUrl(baseUrl), [baseUrl]);

  useEffect(() => {
    if (!enabled || !token) {
      setStatus('idle');
      setLastError(null);

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      return;
    }

    const socket = createSocket({ baseUrl: resolvedBaseUrl, token });
    socketRef.current = socket;
    setStatus('connecting');
    setLastError(null);

    const handleConnect = () => {
      setStatus('connected');
      setLastError(null);
    };

    const handleDisconnect = (reason) => {
      setStatus(reason === 'io client disconnect' ? 'idle' : 'disconnected');
    };

    const handleError = (error) => {
      setStatus('error');
      setLastError(error ?? new Error('Socket connection failed'));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleError);

    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, resolvedBaseUrl, token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return undefined;

    if (typeof onMessage !== 'function') return undefined;

    const handleIncomingMessage = (payload) => {
      try {
        onMessage(payload);
      } catch (error) {
        console.error('Failed processing incoming chat message', error);
      }
    };

    MESSAGE_EVENT_NAMES.forEach((event) => socket.on(event, handleIncomingMessage));

    return () => {
      MESSAGE_EVENT_NAMES.forEach((event) => socket.off(event, handleIncomingMessage));
    };
  }, [onMessage, status]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return undefined;

    if (typeof onMessageRemoved !== 'function') return undefined;

    const handleRemoved = (payload) => {
      try {
        onMessageRemoved(payload);
      } catch (error) {
        console.error('Failed processing removed chat message event', error);
      }
    };

    MESSAGE_REMOVAL_EVENT_NAMES.forEach((event) => socket.on(event, handleRemoved));

    return () => {
      MESSAGE_REMOVAL_EVENT_NAMES.forEach((event) => socket.off(event, handleRemoved));
    };
  }, [onMessageRemoved, status]);

  const joinGroup = useCallback(async (groupId) => {
    if (!groupId) return { status: 'skipped', reason: 'missing-group-id' };

    const socket = socketRef.current;
    if (!socket) throw new Error('Live chat is offline. Please try again in a moment.');

    const { ok, response, error } = await emitWithAck(socket, 'chat:join', { groupId });
    if (ok) {
      return response ?? { status: 'ok' };
    }

    setLastError(error);
    throw error ?? new Error('Unable to join the chat room.');
  }, []);

  const leaveGroup = useCallback(async (groupId) => {
    if (!groupId) return { status: 'skipped', reason: 'missing-group-id' };

    const socket = socketRef.current;
    if (!socket) return { status: 'offline' };

    const { ok, error } = await emitWithAck(socket, 'chat:leave', { groupId });

    if (!ok && error?.message !== 'operation has timed out') {
      console.warn('Failed to leave chat room cleanly', error);
    }

    return { status: 'ok' };
  }, []);

  const sendMessage = useCallback(
    async ({ groupId, content }) => {
      const socket = socketRef.current;
      if (!socket) throw new Error('Live chat is offline. Please try again in a moment.');

      const trimmed = typeof content === 'string' ? content.trim() : '';
      if (!groupId || !trimmed) {
        throw new Error('Missing chat room or message content.');
      }

      let lastFailure = null;

      for (const event of sendEventVariants) {
        const payload = { groupId, body: trimmed, content: trimmed };
        const result = await emitWithAck(socket, event, payload);

        if (result.ok) {
          return result.response ?? { status: 'ok' };
        }

        lastFailure = result.error;

        // If the server does not acknowledge the event, trying alternative names risks duplicates.
        // Only fall through when the current attempt clearly failed to reach the server.
        if (lastFailure?.message === 'operation has timed out') {
          continue;
        }
        break;
      }

      if (lastFailure?.message === 'operation has timed out') {
        // Fire-and-forget fallback for servers that do not use acknowledgements.
        const fallbackEvent = sendEventVariants[sendEventVariants.length - 1] ?? 'chat:message';
        socket.emit(fallbackEvent, { groupId, content: trimmed });
        return { status: 'pending' };
      }

      setLastError(lastFailure);
      throw lastFailure ?? new Error('Unable to send your message right now.');
    },
    [sendEventVariants],
  );

  return useMemo(
    () => ({
      status,
      error: lastError,
      joinGroup,
      leaveGroup,
      sendMessage,
      socket: socketRef.current,
      isConnected: status === 'connected',
    }),
    [status, lastError, joinGroup, leaveGroup, sendMessage],
  );
};

export default useChatSocket;
