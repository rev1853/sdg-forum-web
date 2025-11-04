import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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

const toSnakeCase = (value) => value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const interpretFlagValue = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'liked', 'reposted', 'shared', 'y'].includes(normalised);
  }
  return false;
};

const resolveViewerFlag = (source, candidates) => {
  if (!source || typeof source !== 'object') return false;
  return candidates.some((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return interpretFlagValue(source[key]);
    }
    const snakeKey = toSnakeCase(key);
    if (Object.prototype.hasOwnProperty.call(source, snakeKey)) {
      return interpretFlagValue(source[snakeKey]);
    }
    return false;
  });
};

const LIKE_FLAG_KEYS = ['viewerHasLiked', 'viewerLiked', 'likedByUser', 'hasLiked', 'isLiked', 'liked', 'viewerLike'];
const REPOST_FLAG_KEYS = ['viewerHasReposted', 'viewerReposted', 'hasReposted', 'isReposted', 'reposted'];

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
  const [counts, setCounts] = useState({ likes: 0, replies: 0, reposts: 0 });
  const [hasLiked, setHasLiked] = useState(false);
  const [hasReposted, setHasReposted] = useState(false);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const [isProcessingRepost, setIsProcessingRepost] = useState(false);
  const [isProcessingReport, setIsProcessingReport] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [interactionFeedback, setInteractionFeedback] = useState({ type: null, message: '' });
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const reportDialogRef = useRef(null);

  const REPORT_REASONS = useMemo(
    () => [
      { value: 'spam', label: 'Spam or misleading' },
      { value: 'inappropriate', label: 'Inappropriate or harmful' },
      { value: 'copyright', label: 'Copyright infringement' },
      { value: 'off-topic', label: 'Off topic for this community' },
      { value: 'other', label: 'Other' },
    ],
    [],
  );

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

  useEffect(() => {
    if (!thread) {
      setHasLiked(false);
      setHasReposted(false);
      return;
    }

    const viewerSource = thread.viewerInteractions ?? thread.viewer ?? thread;
    const liked = resolveViewerFlag(viewerSource, LIKE_FLAG_KEYS) || resolveViewerFlag(thread, LIKE_FLAG_KEYS);
    const reposted =
      resolveViewerFlag(viewerSource, REPOST_FLAG_KEYS) || resolveViewerFlag(thread, REPOST_FLAG_KEYS);

    setHasLiked(liked);
    setHasReposted(reposted);
  }, [thread]);

  useEffect(() => {
    const likeCount = thread?.counts?.likes ?? 0;
    const replyCount =
      thread?.counts?.replies ??
      (Array.isArray(thread?.replies) ? thread.replies.length : replies.length);
    const repostCount = thread?.counts?.reposts ?? 0;

    setCounts((current) => {
      if (
        current.likes === likeCount &&
        current.replies === replyCount &&
        current.reposts === repostCount
      ) {
        return current;
      }
      return { likes: likeCount, replies: replyCount, reposts: repostCount };
    });
  }, [thread, replies]);

  useEffect(() => {
    if (!interactionFeedback.message) return undefined;
    if (typeof window === 'undefined') return undefined;
    const timeout = window.setTimeout(() => setInteractionFeedback({ type: null, message: '' }), 3500);
    return () => window.clearTimeout(timeout);
  }, [interactionFeedback.message]);

  useEffect(() => {
    if (!isReportModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsReportModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isReportModalOpen]);

  useEffect(() => {
    if (!isReportModalOpen) return;
    const dialog = reportDialogRef.current;
    if (!dialog) return;
    const firstInteractive = dialog.querySelector('input, textarea, button');
    if (firstInteractive instanceof HTMLElement) {
      firstInteractive.focus();
    }
  }, [isReportModalOpen, reportDialogRef]);

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

  const ensureSignedIn = useCallback(
    (message) => {
      if (token) return true;
      setInteractionFeedback({ type: 'error', message });
      return false;
    },
    [token],
  );

  const handleToggleLike = useCallback(async () => {
    if (!threadId) return;
    if (!ensureSignedIn('Sign in to appreciate this thread.')) return;
    if (isProcessingLike) return;

    try {
      setIsProcessingLike(true);
      if (hasLiked) {
        await threads.unlikeThread(threadId);
        setHasLiked(false);
        setCounts((prev) => ({ ...prev, likes: Math.max(prev.likes - 1, 0) }));
        setInteractionFeedback({ type: 'info', message: 'Removed your appreciation.' });
      } else {
        await threads.likeThread(threadId);
        setHasLiked(true);
        setCounts((prev) => ({ ...prev, likes: prev.likes + 1 }));
        setInteractionFeedback({ type: 'success', message: 'Appreciated this thread.' });
      }
    } catch (error) {
      console.error('Failed to toggle appreciation', error);
      const message =
        error?.data?.message || error?.data?.error || error?.message || 'Unable to update your appreciation right now.';
      setInteractionFeedback({ type: 'error', message });
    } finally {
      setIsProcessingLike(false);
    }
  }, [ensureSignedIn, hasLiked, threadId, threads, isProcessingLike]);

  const handleToggleRepost = useCallback(async () => {
    if (!threadId) return;
    if (!ensureSignedIn('Sign in to share this thread with others.')) return;
    if (isProcessingRepost) return;

    try {
      setIsProcessingRepost(true);
      if (hasReposted) {
        await threads.removeRepost(threadId);
        setHasReposted(false);
        setCounts((prev) => ({ ...prev, reposts: Math.max(prev.reposts - 1, 0) }));
        setInteractionFeedback({ type: 'info', message: 'Removed from your shares.' });
      } else {
        await threads.repostThread(threadId);
        setHasReposted(true);
        setCounts((prev) => ({ ...prev, reposts: prev.reposts + 1 }));
        setInteractionFeedback({ type: 'success', message: 'Shared with your followers.' });
      }
    } catch (error) {
      console.error('Failed to toggle repost', error);
      const message =
        error?.data?.message || error?.data?.error || error?.message || 'Unable to update your share right now.';
      setInteractionFeedback({ type: 'error', message });
    } finally {
      setIsProcessingRepost(false);
    }
  }, [ensureSignedIn, hasReposted, threadId, threads, isProcessingRepost]);

  const handleShareThread = useCallback(async () => {
    if (isSharing) return;
    if (typeof window === 'undefined') return;

    const shareUrl = thread?.slug ? `${window.location.origin}/forum/threads/${thread.slug}` : window.location.href;

    try {
      setIsSharing(true);
      if (typeof navigator !== 'undefined' && navigator.share && thread?.title) {
        await navigator.share({ title: thread.title, url: shareUrl });
        setInteractionFeedback({ type: 'success', message: 'Share dialog opened.' });
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setInteractionFeedback({ type: 'info', message: 'Thread link copied to your clipboard.' });
        return;
      }

      const tempInput = document.createElement('input');
      tempInput.value = shareUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      setInteractionFeedback({ type: 'info', message: 'Thread link copied to your clipboard.' });
    } catch (error) {
      console.error('Failed to share thread', error);
      const message = error?.message || 'Unable to share this thread right now.';
      setInteractionFeedback({ type: 'error', message });
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, thread?.slug, thread?.title]);

  const handleReportThread = useCallback(() => {
    if (!threadId) return;
    if (!ensureSignedIn('Sign in to report threads for review.')) return;
    setReportReason(REPORT_REASONS[0]?.value ?? '');
    setReportNotes('');
    setIsReportModalOpen(true);
  }, [ensureSignedIn, threadId, REPORT_REASONS]);

  const handleReportSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!threadId) return;
      if (!reportReason && !reportNotes.trim()) {
        setInteractionFeedback({ type: 'error', message: 'Select a reason or add a short note before reporting.' });
        return;
      }

      const payload = {
        reasonCode: (reportReason || 'other').trim().toLowerCase(),
        message: reportNotes.trim() || undefined,
      };

      try {
        setIsProcessingReport(true);
        await threads.reportThread(threadId, payload);
        setInteractionFeedback({ type: 'success', message: 'Thanks for flagging this thread for review.' });
        setIsReportModalOpen(false);
      } catch (error) {
        console.error('Failed to report thread', error);
        const message =
          error?.data?.message || error?.data?.error || error?.message || 'Unable to submit your report right now.';
        setInteractionFeedback({ type: 'error', message });
      } finally {
        setIsProcessingReport(false);
      }
    },
    [reportReason, reportNotes, threadId, threads],
  );

  const handleReportCancel = useCallback(() => {
    if (isProcessingReport) return;
    setIsReportModalOpen(false);
  }, [isProcessingReport]);

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
              <div className="thread-hero__actions" role="group" aria-label="Thread quick actions">
                <button
                  type="button"
                  className={`thread-action${hasLiked ? ' is-active' : ''}`}
                  onClick={handleToggleLike}
                  disabled={isProcessingLike}
                  aria-pressed={hasLiked}
                  aria-label={`${hasLiked ? 'Remove appreciation from' : 'Appreciate'} this thread. Current count ${counts.likes}.`}
                >
                  <span className="thread-action__icon" aria-hidden="true">👍</span>
                  <span>{hasLiked ? 'Appreciated' : 'Appreciate'}</span>
                  <span className="thread-action__count" aria-hidden="true">{counts.likes}</span>
                </button>
                <button
                  type="button"
                  className={`thread-action${hasReposted ? ' is-active' : ''}`}
                  onClick={handleToggleRepost}
                  disabled={isProcessingRepost}
                  aria-pressed={hasReposted}
                  aria-label={`${hasReposted ? 'Remove share from' : 'Share'} this thread. Current count ${counts.reposts}.`}
                >
                  <span className="thread-action__icon" aria-hidden="true">🔁</span>
                  <span>{hasReposted ? 'Shared' : 'Share'}</span>
                  <span className="thread-action__count" aria-hidden="true">{counts.reposts}</span>
                </button>
                <button
                  type="button"
                  className="thread-action thread-action--ghost"
                  onClick={handleShareThread}
                  disabled={isSharing}
                  aria-label="Copy the link to this thread"
                >
                  <span className="thread-action__icon" aria-hidden="true">🔗</span>
                  <span>{isSharing ? 'Sharing…' : 'Copy link'}</span>
                </button>
                <button
                  type="button"
                  className="thread-action thread-action--danger"
                  onClick={handleReportThread}
                  disabled={isProcessingReport}
                  aria-label="Report this thread for review"
                >
                  <span className="thread-action__icon" aria-hidden="true">🚩</span>
                  <span>{isProcessingReport ? 'Reporting…' : 'Report'}</span>
                </button>
              </div>
              {interactionFeedback.message ? (
                <div className={`thread-hero__feedback thread-hero__feedback--${interactionFeedback.type ?? 'info'}`}>
                  {interactionFeedback.message}
                </div>
              ) : null}
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
      {isReportModalOpen ? (
        <div className="thread-report-modal">
          <button type="button" className="thread-report-modal__overlay" onClick={handleReportCancel} aria-label="Close report dialog" />
          <div
            className="thread-report-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="thread-report-title"
            ref={reportDialogRef}
          >
            <form onSubmit={handleReportSubmit} className="thread-report-modal__form">
              <header className="thread-report-modal__header">
                <h2 id="thread-report-title">Report this thread</h2>
                <p>Select the reason that best fits and optionally share more details.</p>
              </header>
              <fieldset className="thread-report-modal__fieldset">
                <legend className="thread-report-modal__legend">What’s happening?</legend>
                <div className="thread-report-modal__choices">
                  {REPORT_REASONS.map(({ value, label }) => (
                    <label key={value} className="thread-report-modal__choice">
                      <input
                        type="radio"
                        name="report-reason"
                        value={value}
                        checked={reportReason === value}
                        onChange={(event) => setReportReason(event.target.value)}
                        required={!reportNotes.trim()}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label htmlFor="thread-report-notes" className="thread-report-modal__label">
                Additional context <span>(optional)</span>
              </label>
              <textarea
                id="thread-report-notes"
                rows={4}
                value={reportNotes}
                onChange={(event) => setReportNotes(event.target.value)}
                placeholder="Share a brief note so moderators can take action faster."
              />
              <div className="thread-report-modal__actions">
                <button type="button" className="thread-report-modal__cancel" onClick={handleReportCancel} disabled={isProcessingReport}>
                  Cancel
                </button>
                <button type="submit" className="thread-report-modal__submit" disabled={isProcessingReport}>
                  {isProcessingReport ? 'Submitting…' : 'Submit report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ThreadDetailPage;
