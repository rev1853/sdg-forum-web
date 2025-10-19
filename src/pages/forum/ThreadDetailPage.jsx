import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ForumNavbar from '../../components/forum/ForumNavbar';
import { useApi } from '@/api';
import { useAuth } from '@/context/AuthContext';

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

const ThreadDetailPage = () => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { threads } = useApi();
  const { user } = useAuth();

  const [thread, setThread] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [replies, setReplies] = useState([]);
  const [replyError, setReplyError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;

    setIsLoading(true);
    setError('');

    threads
      .getThread(threadId)
      .then((response) => {
        if (cancelled) return;
        const fetched = response?.thread ?? response;
        if (!fetched) {
          setError('Unable to locate this thread.');
          setThread(null);
          return;
        }
        setThread(fetched);
      })
      .catch((caughtError) => {
        if (cancelled) return;
        console.error('Failed to load thread detail', caughtError);
        const message =
          caughtError?.status === 404
            ? 'This thread was not found or may have been removed.'
            : caughtError?.data?.message ||
              caughtError?.data?.error ||
              caughtError?.message ||
              'Unable to load this thread right now.';
        setError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [threadId, threads]);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;

    threads
      .listReplies(threadId, { page: 1, pageSize: 20 })
      .then((response) => {
        if (cancelled) return;
        setReplies(response?.data ?? []);
      })
      .catch((caughtError) => {
        if (cancelled) return;
        console.error('Failed to load replies', caughtError);
        const message =
          caughtError?.data?.message || caughtError?.data?.error || caughtError?.message || 'Unable to load replies.';
        setReplyError(message);
      });

    return () => {
      cancelled = true;
    };
  }, [threadId, threads]);

  const hasImage = useMemo(() => Boolean(thread?.image ?? thread?.image_url), [thread]);
  const formattedBody = useMemo(() => thread?.body ?? '', [thread?.body]);

  const canEdit = user?.id && thread?.author_id && user.id === thread.author_id;

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
                <img src={thread.image ?? thread.image_url} alt={thread.title ?? 'Thread cover'} loading="lazy" />
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
              <div className="thread-card__author">
                <span>{thread.author?.name ?? thread.author?.username ?? 'Unknown author'}</span>
              </div>
              <time dateTime={thread.created_at ?? thread.createdAt}>
                {formatDateTime(thread.created_at ?? thread.createdAt)}
              </time>
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
                <span>{thread.counts?.likes ?? 0} likes</span>
                <span>{thread.counts?.reposts ?? 0} reposts</span>
                <span>{thread.counts?.replies ?? replies.length} replies</span>
              </div>
              {canEdit ? <span className="thread-detail__owner">Your thread</span> : null}
            </footer>
          </article>
        )}

        {replyError ? <div className="forum-error">{replyError}</div> : null}

        {replies.length > 0 ? (
          <section className="thread-detail__replies">
            <h2>Replies</h2>
            <ul>
              {replies.map((reply) => (
                <li key={reply.id}>
                  <header>
                    <span>{reply.author?.name ?? reply.author?.username ?? 'Contributor'}</span>
                    <time dateTime={reply.created_at ?? reply.createdAt}>
                      {formatDateTime(reply.created_at ?? reply.createdAt)}
                    </time>
                  </header>
                  <div>
                    {(reply.body ?? '').split('\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : thread && !isLoading && !error ? (
          <div className="thread-empty">This thread has no replies yet.</div>
        ) : null}
      </div>
    </section>
  );
};

export default ThreadDetailPage;
