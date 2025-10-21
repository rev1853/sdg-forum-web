import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { ensureApiUploadsHost } from '@utils/media';
import ForumNavbar from '../../components/forum/ForumNavbar';

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatGoalLabel = (category) => {
  const sdgNumber = category?.sdg_number ?? category?.sdgNumber;
  if (sdgNumber !== undefined && sdgNumber !== null) {
    return `Goal ${String(sdgNumber).padStart(2, '0')} – ${category?.name ?? 'Untitled'}`;
  }
  return category?.name ?? 'Untitled category';
};

const getInitials = (name) => {
  if (!name) return 'U';
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return name.slice(0, 2).toUpperCase();
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
};

const createAvatarDataUrl = (name) => {
  const initials = getInitials(name);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'>\n  <defs>\n    <linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>\n      <stop offset='0%' stop-color='#4C1D95'/>\n      <stop offset='100%' stop-color='#1E40AF'/>\n    </linearGradient>\n  </defs>\n  <rect width='72' height='72' rx='36' fill='url(#bg)'/>\n  <text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='28' font-weight='700' fill='#F8FAFC'>${initials}</text>\n</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const resolveProfileImage = (person, baseUrl) => {
  const source =
    person?.profile_picture ??
    person?.profilePicture ??
    person?.profile_picture_url ??
    person?.profilePictureUrl ??
    null;

  if (!source) return null;
  if (/^https?:\/\//i.test(source)) return ensureApiUploadsHost(source);
  if (!baseUrl) return ensureApiUploadsHost(source);

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  if (source.startsWith('/')) {
    return ensureApiUploadsHost(`${normalizedBase}${source}`);
  }
  return ensureApiUploadsHost(`${normalizedBase}/${source}`);
};

const getAvatarUrl = (person, name, baseUrl) => {
  const resolved = resolveProfileImage(person, baseUrl);
  if (resolved) return resolved;
  const fallbackName = name && name.trim().length > 0 ? name : 'Community Member';
  return createAvatarDataUrl(fallbackName);
};

const resolveThreadImage = (image, baseUrl) => {
  if (!image) return null;
  const source =
    typeof image === 'string'
      ? image
      : image?.url ?? image?.src ?? image?.path ?? null;
  if (!source) return null;
  if (/^https?:\/\//i.test(source)) return ensureApiUploadsHost(source);
  const normalizedImage = source.startsWith('/') ? source.slice(1) : source;

  if (baseUrl) {
    try {
      const parsed = new URL(baseUrl);
      return ensureApiUploadsHost(`${parsed.origin}/${normalizedImage}`);
    } catch (error) {
      console.warn('Failed to parse API base URL for image resolution', error);
    }
  }

  if (typeof window !== 'undefined') {
    return ensureApiUploadsHost(`${window.location.origin}/${normalizedImage}`);
  }

  return ensureApiUploadsHost(`/${normalizedImage}`);
};

const ThreadDetailPage = () => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { threads, baseUrl } = useApi();
  const { user, token } = useAuth();

  const [thread, setThread] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [replies, setReplies] = useState([]);
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState('');

  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [likeError, setLikeError] = useState('');

  const [repostCount, setRepostCount] = useState(0);
  const [isReposted, setIsReposted] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [repostError, setRepostError] = useState('');

  const [replyBody, setReplyBody] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadThread = useCallback(async () => {
    if (!threadId) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await threads.getThread(threadId);
      const fetched = response?.thread ?? response ?? null;
      if (!fetched) {
        setError('Unable to locate this thread.');
        setThread(null);
        return;
      }
      setThread(fetched);
      setLikeCount(fetched?.counts?.likes ?? 0);
      setRepostCount(fetched?.counts?.reposts ?? 0);
      const liked = Boolean(
        fetched?.viewerHasLiked ??
          fetched?.viewer_has_liked ??
          fetched?.hasLiked ??
          fetched?.liked ??
          fetched?.isLiked ??
          fetched?.is_liked ??
          fetched?.isLikedByUser ??
          fetched?.liked_by_user,
      );
      setIsLiked(liked);
      const reposted = Boolean(
        fetched?.viewerHasReposted ??
          fetched?.viewer_has_reposted ??
          fetched?.hasReposted ??
          fetched?.reposted ??
          fetched?.isReposted ??
          fetched?.is_reposted ??
          fetched?.isRepostedByUser ??
          fetched?.reposted_by_user,
      );
      setIsReposted(reposted);
    } catch (caughtError) {
      console.error('Failed to load thread detail', caughtError);
      const message =
        caughtError?.status === 404
          ? 'This thread was not found or may have been removed.'
          : caughtError?.data?.message ||
            caughtError?.data?.error ||
            caughtError?.message ||
            'Unable to load this thread right now.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [threadId, threads]);

  const loadReplies = useCallback(async () => {
    if (!threadId) return;
    try {
      const response = await threads.listReplies(threadId, { page: 1, pageSize: 20 });
      setReplies(response?.data ?? []);
      setReplyError('');
    } catch (caughtError) {
      console.error('Failed to load replies', caughtError);
      const message =
        caughtError?.data?.message || caughtError?.data?.error || caughtError?.message || 'Unable to load replies.';
      setReplyError(message);
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
  const hasImage = Boolean(threadImageUrl);
  const formattedBody = useMemo(() => thread?.body ?? '', [thread?.body]);

  const canEdit = user?.id && thread?.author_id && user.id === thread.author_id;
  const authorName = thread?.author?.name ?? thread?.author?.username ?? 'Unknown author';
  const authorUsername = thread?.author?.username ?? null;
  const authorAvatar = getAvatarUrl(thread?.author, authorName, baseUrl);
  const postedAtLabel = formatDateTime(thread?.created_at ?? thread?.createdAt);

  const handleToggleLike = async () => {
    if (!threadId) return;
    if (!token) {
      setLikeError('Please sign in to like this thread.');
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    setLikeError('');

    try {
      if (isLiked) {
        await threads.unlikeThread(threadId);
        setIsLiked(false);
        setLikeCount((current) => (current > 0 ? current - 1 : 0));
      } else {
        await threads.likeThread(threadId);
        setIsLiked(true);
        setLikeCount((current) => current + 1);
      }
    } catch (caughtError) {
      console.error('Failed to toggle like', caughtError);
      const message =
        caughtError?.data?.message ||
        caughtError?.data?.error ||
        caughtError?.message ||
        'Unable to update your like right now.';
      setLikeError(message);
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleRepost = async () => {
    if (!threadId) return;
    if (!token) {
      setRepostError('Please sign in to repost this thread.');
      return;
    }
    if (isReposting) return;

    setIsReposting(true);
    setRepostError('');

    try {
      if (isReposted) {
        await threads.removeRepost(threadId);
        setIsReposted(false);
        setRepostCount((current) => (current > 0 ? current - 1 : 0));
      } else {
        await threads.repostThread(threadId);
        setIsReposted(true);
        setRepostCount((current) => current + 1);
      }
    } catch (caughtError) {
      console.error('Failed to toggle repost', caughtError);
      const message =
        caughtError?.data?.message ||
        caughtError?.data?.error ||
        caughtError?.message ||
        'Unable to update your repost right now.';
      setRepostError(message);
    } finally {
      setIsReposting(false);
    }
  };

  const handleReplySubmit = async (event) => {
    event.preventDefault();
    if (!threadId) return;
    if (!token) {
      setReplyError('Please sign in to reply.');
      return;
    }
    const trimmed = replyBody.trim();
    if (!trimmed) {
      setReplyError('Your reply cannot be empty.');
      return;
    }

    setIsReplying(true);
    setReplyError('');
    setReplySuccess('');

    try {
      await threads.createReply(threadId, { body: trimmed });
      setReplyBody('');
      setReplySuccess('Reply posted successfully.');
      await loadReplies();
      await loadThread();
    } catch (caughtError) {
      console.error('Failed to post reply', caughtError);
      const message =
        caughtError?.data?.message ||
        caughtError?.data?.error ||
        caughtError?.message ||
        'Unable to share your reply right now.';
      setReplyError(message);
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <section className="themed-page forum-page thread-detail-page">
      <title>Thread Detail • SDG Forum</title>
      <ForumNavbar />

      <div className="thread-detail">
        <div className="thread-detail__header">
          <button
            type="button"
            className="ghost-button"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <Link to="/forum/threads" className="ghost-button">
            View all threads
          </Link>
        </div>

        {isLoading ? (
          <div className="thread-detail__loading">Loading thread…</div>
        ) : error ? (
          <div className="forum-error">{error}</div>
        ) : !thread ? (
          <div className="thread-empty">We could not load this thread.</div>
        ) : (
          <article className={`thread-detail__card ${hasImage ? '' : 'thread-detail__card--no-media'}`}>
            {hasImage ? (
              <div className="thread-detail__media">
                <img src={threadImageUrl} alt={thread.title ?? 'Thread cover'} loading="lazy" />
              </div>
            ) : null}

            <header className="thread-detail__meta">
              <div className="thread-detail__categories">
                {(thread.categories ?? []).map((category) => (
                  <span key={category.id} className="thread-card__goal">
                    {formatGoalLabel(category)}
                  </span>
                ))}
              </div>
              <span className="thread-card__status">
                {thread.status ?? 'Active'}
              </span>
            </header>

            <h1>{thread.title ?? 'Untitled thread'}</h1>

            <div className="thread-detail__author">
              <div className="thread-detail__author-meta">
                <img
                  src={authorAvatar}
                  alt={`Avatar of ${authorName}`}
                  className="thread-detail__avatar"
                />
                <div className="thread-detail__author-info">
                  <span>{authorName}</span>
                  {authorUsername ? <small>@{authorUsername}</small> : null}
                </div>
              </div>
              {postedAtLabel ? (
                <time dateTime={thread.created_at ?? thread.createdAt}>{postedAtLabel}</time>
              ) : null}
            </div>

            <div className="thread-detail__body">
              {formattedBody.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {(thread.tags ?? []).length > 0 ? (
              <div className="preview-tags">
                {thread.tags.filter(Boolean).map((tag) => (
                  <span key={tag} className="preview-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            <footer className="thread-detail__footer">
              <div className="thread-card__counts">
                <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>
                <span>{repostCount} {repostCount === 1 ? 'repost' : 'reposts'}</span>
                <span>{thread.counts?.replies ?? replies.length} replies</span>
              </div>
              <div className="thread-detail__actions">
                <button
                  type="button"
                  className={`ghost-button thread-like-button ${isLiked ? 'is-liked' : ''}`}
                  onClick={handleToggleLike}
                  disabled={isLiking}
                >
                  {isLiked ? '♥ Liked' : '♡ Like'}
                </button>
                <button
                  type="button"
                  className={`ghost-button thread-repost-button ${isReposted ? 'is-reposted' : ''}`}
                  onClick={handleToggleRepost}
                  disabled={isReposting}
                >
                  {isReposted ? '⟲ Reposted' : '⟳ Repost'}
                </button>
                {canEdit ? <span className="thread-detail__owner">Your thread</span> : null}
              </div>
            </footer>
            {likeError ? <div className="form-error thread-detail__error">{likeError}</div> : null}
            {repostError ? <div className="form-error thread-detail__error">{repostError}</div> : null}
          </article>
        )}

        {replyError ? <div className="forum-error">{replyError}</div> : null}
        {replySuccess ? <div className="thread-detail__success">{replySuccess}</div> : null}

        {replies.length > 0 ? (
          <section className="thread-detail__replies">
            <h2>Replies</h2>
            <ul>
              {replies.map((reply) => {
                const replyAuthorName = reply.author?.name ?? reply.author?.username ?? 'Contributor';
                const replyAuthorUsername = reply.author?.username ?? null;
                const replyAvatar = getAvatarUrl(reply.author, replyAuthorName, baseUrl);
                const replyTimestamp = formatDateTime(reply.created_at ?? reply.createdAt);

                return (
                  <li key={reply.id}>
                    <header className="thread-reply-header">
                      <div className="thread-reply-author">
                        <img
                          src={replyAvatar}
                          alt={`Avatar of ${replyAuthorName}`}
                          className="thread-reply-avatar"
                        />
                        <div>
                          <span>{replyAuthorName}</span>
                          {replyAuthorUsername ? <small>@{replyAuthorUsername}</small> : null}
                        </div>
                      </div>
                      {replyTimestamp ? (
                        <time dateTime={reply.created_at ?? reply.createdAt}>{replyTimestamp}</time>
                      ) : null}
                    </header>
                    <div className="thread-reply-body">
                      {(reply.body ?? '').split('\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : thread && !isLoading && !error ? (
          <div className="thread-empty">This thread has no replies yet.</div>
        ) : null}

        <section className="thread-reply-form">
          <h2>Join the conversation</h2>
          {token ? (
            <form onSubmit={handleReplySubmit}>
              <label htmlFor="thread-reply">Your reply</label>
              <textarea
                id="thread-reply"
                rows={4}
                placeholder="Share feedback, resources, or next steps."
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                required
              />
              <div className="thread-reply-actions">
                <button type="submit" className="primary-button" disabled={isReplying}>
                  {isReplying ? 'Posting…' : 'Post reply'}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setReplyBody('');
                    setReplyError('');
                    setReplySuccess('');
                  }}
                  disabled={isReplying || replyBody.length === 0}
                >
                  Clear
                </button>
              </div>
            </form>
          ) : (
            <div className="thread-reply-login">
              <p>
                Please <Link to="/auth/login">sign in</Link> or <Link to="/auth/register">create an account</Link> to reply to this thread.
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default ThreadDetailPage;
