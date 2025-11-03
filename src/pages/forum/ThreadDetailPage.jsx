import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ForumNavbar from '../../components/forum/ForumNavbar';
import { useApi } from '../../api';
import { useAuth } from '@/context/AuthContext';
import { resolveProfileImageUrl, resolveThreadImage } from '@utils/media';

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const createAvatarDataUrl = (name) => {
  const initials = getInitials(name);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'>\n  <defs>\n    <linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>\n      <stop offset='0%' stop-color='#4C1D95'/>\n      <stop offset='100%' stop-color='#1E40AF'/>\n    </linearGradient>\n  </defs>\n  <rect width='72' height='72' rx='36' fill='url(#bg)'/>\n  <text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='28' font-weight='700' fill='#F8FAFC'>${initials}</text>\n</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const formatGoalLabel = (category) => {
  const sdgNumber = category?.sdg_number ?? category?.sdgNumber;
  if (sdgNumber !== undefined && sdgNumber !== null) {
    return `Goal ${String(sdgNumber).padStart(2, '0')} • ${category?.name ?? 'Untitled'}`;
  }
  return category?.name ?? 'Untitled category';
};

const getAuthorInfo = (entity, baseUrl) => {
  const candidates = [
    entity?.author,
    entity?.author_profile,
    entity?.authorProfile,
    entity?.user,
    entity?.user_profile,
    entity?.userProfile,
    entity?.profile,
    entity?.sender,
    entity,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === 'string') {
      const name = candidate.trim() || 'Community member';
      return {
        name,
        avatar: createAvatarDataUrl(name),
        initials: getInitials(name),
      };
    }

    if (typeof candidate === 'object') {
      const name = candidate?.name ?? candidate?.username ?? candidate?.displayName ?? 'Community member';
      const avatar = resolveProfileImageUrl(candidate, baseUrl) ?? createAvatarDataUrl(name);
      return { name, avatar, initials: getInitials(name) };
    }
  }

  return {
    name: 'Community member',
    avatar: createAvatarDataUrl('Community member'),
    initials: 'CM',
  };
};

const ThreadDetailSkeleton = () => (
  <section className="thread-hero thread-hero--skeleton">
    <div className="skeleton-chip" />
    <div className="skeleton-line skeleton-line--lg" />
    <div className="skeleton-line" />
    <div className="skeleton-line skeleton-line--short" />
  </section>
);

const ThreadDetailPage = () => {
  const { threadId } = useParams();
  const { user, token } = useAuth();
  const { threads, baseUrl } = useApi();
  const [thread, setThread] = useState(null);
  const [isLoadingThread, setIsLoadingThread] = useState(true);
  const [threadError, setThreadError] = useState('');
  const [replies, setReplies] = useState([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [replyStatus, setReplyStatus] = useState({ type: null, message: '' });
  const [replyBody, setReplyBody] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadThread = useCallback(async () => {
    if (!threadId) return;

    setIsLoadingThread(true);
    setThreadError('');

    try {
      const response = await threads.getThread(threadId);
      const fetched = response?.thread ?? response ?? null;

      if (!fetched) {
        setThread(null);
        setThreadError('Unable to locate this thread.');
        return;
      }

      setThread(fetched);
    } catch (error) {
      console.error('Failed to load thread detail', error);
      const message =
        error?.status === 404
          ? 'This thread was not found or may have been removed.'
          : error?.data?.message || error?.data?.error || error?.message || 'Unable to load this thread right now.';
      setThreadError(message);
      setThread(null);
    } finally {
      setIsLoadingThread(false);
    }
  }, [threadId, threads]);

  const loadReplies = useCallback(async () => {
    if (!threadId) {
      setReplies([]);
      return;
    }

    setIsLoadingReplies(true);

    try {
      const response = await threads.listReplies(threadId, { page: 1, pageSize: 20 });
      const data = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.messages)
          ? response.messages
          : [];
      setReplies(data);
    } catch (error) {
      console.error('Failed to load replies', error);
    } finally {
      setIsLoadingReplies(false);
    }
  }, [threadId, threads]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  const threadImageUrl = useMemo(
    () => resolveThreadImage(thread?.image ?? thread?.image_url, baseUrl),
    [thread?.image, thread?.image_url, baseUrl],
  );

  const threadAuthor = useMemo(() => getAuthorInfo(thread ?? {}, baseUrl), [thread, baseUrl]);
  const bodySegments = useMemo(
    () =>
      (thread?.body ?? '')
        .split(/\n{2,}|\r\n\r\n/)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0),
    [thread?.body],
  );
  const postedAt = formatDateTime(thread?.created_at ?? thread?.createdAt);
  const categories = Array.isArray(thread?.categories) ? thread.categories : [];
  const tags = Array.isArray(thread?.tags) ? thread.tags.filter(Boolean) : [];
  const counts = {
    likes: thread?.counts?.likes ?? 0,
    replies:
      thread?.counts?.replies ??
      (Array.isArray(thread?.replies) ? thread.replies.length : replies.length),
    reposts: thread?.counts?.reposts ?? 0,
  };

  const handleReplySubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setReplyStatus({ type: 'error', message: 'Sign in to reply to this thread.' });
      return;
    }

    const content = replyBody.trim();
    if (!content) {
      setReplyStatus({ type: 'error', message: 'Add a short message before sending.' });
      return;
    }

    if (!threadId) {
      setReplyStatus({ type: 'error', message: 'This thread is unavailable.' });
      return;
    }

    try {
      setIsSubmittingReply(true);
      setReplyStatus({ type: null, message: '' });

      await threads.createReply(threadId, { body: content });

      setReplyBody('');
      setReplyStatus({ type: 'success', message: 'Reply posted.' });
      loadReplies();
    } catch (error) {
      console.error('Failed to submit reply', error);
      const message =
        error?.data?.message ||
        error?.data?.error ||
        error?.message ||
        'Unable to send your reply right now.';
      setReplyStatus({ type: 'error', message });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const repliesEmpty = !isLoadingReplies && replies.length === 0;

  return (
    <>
      <ForumNavbar />
      <main className="forum-layout thread-detail-page">
        <div className="thread-return">
          <Link to="/forum/threads" className="ghost-button">
            ← Back to threads
          </Link>
        </div>

        {threadError && (
          <div className="form-feedback form-feedback--error thread-detail__alert">{threadError}</div>
        )}

        {isLoadingThread ? (
          <ThreadDetailSkeleton />
        ) : thread ? (
          <>
            <section className="thread-hero">
              <div className="thread-hero__labels">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <span key={category?.id ?? category?.name} className="thread-hero__chip">
                      {formatGoalLabel(category)}
                    </span>
                  ))
                ) : (
                  <span className="thread-hero__chip thread-hero__chip--muted">Cross-goal</span>
                )}
              </div>
              <h1>{thread?.title ?? 'Untitled thread'}</h1>
              {bodySegments[0] && <p className="thread-hero__summary">{bodySegments[0]}</p>}

              <div className="thread-hero__meta">
                <div className="thread-hero__author">
                  <img src={threadAuthor.avatar} alt={threadAuthor.name} />
                  <div>
                    <span>{threadAuthor.name}</span>
                    {postedAt && <small>Posted {postedAt}</small>}
                  </div>
                </div>
                <dl className="thread-hero__stats">
                  <div>
                    <dt>Appreciations</dt>
                    <dd>{counts.likes}</dd>
                  </div>
                  <div>
                    <dt>Replies</dt>
                    <dd>{counts.replies}</dd>
                  </div>
                  <div>
                    <dt>Shares</dt>
                    <dd>{counts.reposts}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <div className="thread-detail__layout">
              <article className="thread-article">
                {threadImageUrl && (
                  <figure className="thread-article__media">
                    <img src={threadImageUrl} alt="" />
                    {thread?.image_caption && <figcaption>{thread.image_caption}</figcaption>}
                  </figure>
                )}

                <div className="thread-article__body">
                  {bodySegments.map((segment, index) => (
                    <p key={`segment-${index}`}>{segment}</p>
                  ))}
                </div>
              </article>

              <aside className="thread-sidebar">
                <div className="thread-sidebar__card">
                  <h3>Thread details</h3>
                  <ul>
                    <li>
                      <span>Posted</span>
                      <strong>{postedAt || 'Not available'}</strong>
                    </li>
                    <li>
                      <span>Category</span>
                      <strong>
                        {categories.length > 0 ? categories.map((cat) => cat?.name).filter(Boolean).join(', ') : 'General'}
                      </strong>
                    </li>
                    <li>
                      <span>Status</span>
                      <strong>{thread?.status ?? 'Published'}</strong>
                    </li>
                  </ul>
                </div>

                {tags.length > 0 && (
                  <div className="thread-sidebar__card">
                    <h3>Tags</h3>
                    <div className="thread-sidebar__tags">
                      {tags.map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>

            <section className="thread-replies">
              <header className="thread-replies__header">
                <div>
                  <h2>Replies</h2>
                  <p>
                    {counts.replies > 0
                      ? 'Join the conversation or help answer an open question.'
                      : 'Be the first to share feedback or add your perspective.'}
                  </p>
                </div>
                <span className="thread-replies__count">{counts.replies}</span>
              </header>

              {token ? (
                <form className="reply-composer" onSubmit={handleReplySubmit}>
                  <label htmlFor="reply-body" className="sr-only">
                    Reply
                  </label>
                  <textarea
                    id="reply-body"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Share an insight, drop a resource, or ask a follow-up question."
                    rows={4}
                    disabled={isSubmittingReply}
                  />
                  <div className="reply-composer__footer">
                    {replyStatus.message && (
                      <span className={`reply-status reply-status--${replyStatus.type}`}>{replyStatus.message}</span>
                    )}
                    <button type="submit" className="primary-button" disabled={isSubmittingReply}>
                      {isSubmittingReply ? 'Submitting…' : 'Post reply'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="reply-auth">
                  <p>Sign in to reply to this thread and follow the conversation.</p>
                  <Link to="/auth/login" className="primary-button">
                    Sign in
                  </Link>
                </div>
              )}

              <ul className="reply-list">
                {isLoadingReplies && <li className="reply-item reply-item--skeleton" />}
                {replies.map((reply) => {
                  const author = getAuthorInfo(reply, baseUrl);
                  const replyPostedAt = formatDateTime(reply?.created_at ?? reply?.createdAt);
                  const replyBodySegments = (reply?.body ?? '')
                    .split(/\n+/)
                    .map((line) => line.trim())
                    .filter(Boolean);

                  return (
                    <li key={reply?.id ?? `${reply?.created_at}-${Math.random()}`} className="reply-item">
                      <div className="reply-item__avatar">
                        <img src={author.avatar} alt={author.name} />
                      </div>
                      <div className="reply-item__body">
                        <header>
                          <strong>{author.name}</strong>
                          {replyPostedAt && <time dateTime={reply?.created_at ?? reply?.createdAt}>{replyPostedAt}</time>}
                        </header>
                        <div className="reply-item__content">
                          {replyBodySegments.map((segment, index) => (
                            <p key={`reply-${reply?.id}-segment-${index}`}>{segment}</p>
                          ))}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {repliesEmpty && (
                <div className="reply-empty">
                  <h3>No replies yet</h3>
                  <p>Have a related project or question? Leave a note so others can build on it.</p>
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </>
  );
};

export default ThreadDetailPage;
