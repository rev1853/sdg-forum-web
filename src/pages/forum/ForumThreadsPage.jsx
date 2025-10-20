import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ForumNavbar from '../../components/forum/ForumNavbar';
import { useApi } from '@/api';
import { useAuth } from '@/context/AuthContext';

const PAGE_SIZE = 9;

const isDesktopMatch = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(min-width: 1025px)').matches;
};

const formatGoalLabel = (category) => {
  const sdgNumber = category?.sdg_number ?? category?.sdgNumber;
  if (sdgNumber !== undefined && sdgNumber !== null) {
    return `Goal ${String(sdgNumber).padStart(2, '0')} – ${category?.name ?? 'Untitled'}`;
  }
  return category?.name ?? 'Untitled category';
};

const formatStatus = (status) => {
  if (!status) return 'Active';
  const normalized = status.toString().toLowerCase().replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>\n  <defs>\n    <linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>\n      <stop offset='0%' stop-color='#4C1D95'/>\n      <stop offset='100%' stop-color='#1E40AF'/>\n    </linearGradient>\n  </defs>\n  <rect width='64' height='64' rx='32' fill='url(#bg)'/>\n  <text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='26' font-weight='700' fill='#F8FAFC'>${initials}</text>\n</svg>`;
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
  if (/^https?:\/\//i.test(source)) return source;
  if (!baseUrl) return source;

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  if (source.startsWith('/')) {
    return `${normalizedBase}${source}`;
  }
  return `${normalizedBase}/${source}`;
};

const getAvatarUrl = (person, name, baseUrl) => {
  const resolved = resolveProfileImage(person, baseUrl);
  if (resolved) return resolved;
  const fallbackName = name && name.trim().length > 0 ? name : 'Community Member';
  return createAvatarDataUrl(fallbackName);
};

const formatPostedAt = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const resolveThreadImage = (image, baseUrl) => {
  if (!image) return null;
  const source =
    typeof image === 'string'
      ? image
      : image?.url ?? image?.src ?? image?.path ?? null;
  if (!source) return null;
  if (/^https?:\/\//i.test(source)) return source;
  const normalizedImage = source.startsWith('/') ? source.slice(1) : source;

  if (baseUrl) {
    try {
      const parsed = new URL(baseUrl);
      return `${parsed.origin}/${normalizedImage}`;
    } catch (error) {
      console.warn('Failed to parse API base URL for image resolution', error);
    }
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/${normalizedImage}`;
  }

  return `/${normalizedImage}`;
};

const ForumThreadsPage = () => {
  const { threads, categories, users, baseUrl } = useApi();
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const goalParam = searchParams.get('goal') ?? 'all';
  const searchQuery = searchParams.get('search') ?? '';
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [categoryOptions, setCategoryOptions] = useState([{ value: 'all', label: 'All Goals' }]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const [threadsResponse, setThreadsResponse] = useState({
    data: [],
    pagination: { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 },
  });
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [threadsError, setThreadsError] = useState('');

  const [userThreads, setUserThreads] = useState([]);
  const [threadInteractions, setThreadInteractions] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => isDesktopMatch());

  useEffect(() => {
    let cancelled = false;
    setIsLoadingCategories(true);

    categories
      .list()
      .then((list) => {
        if (cancelled) return;
        const nextOptions = [
          { value: 'all', label: 'All Goals' },
          ...list
            .filter((category) => Boolean(category?.id))
            .map((category) => ({ value: category.id, label: formatGoalLabel(category) })),
        ];
        setCategoryOptions(nextOptions);
      })
      .catch((error) => {
        console.error('Failed to load categories', error);
        if (!cancelled) {
          setCategoryOptions([{ value: 'all', label: 'All Goals' }]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingCategories(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [categories]);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingThreads(true);
    setThreadsError('');

    threads
      .listThreads({
        page: pageParam,
        pageSize: PAGE_SIZE,
        categories: goalParam !== 'all' ? goalParam : undefined,
        search: searchQuery || undefined,
      })
      .then((response) => {
        if (cancelled) return;
        const pagination = {
          page: response?.pagination?.page ?? pageParam,
          pageSize: response?.pagination?.pageSize ?? PAGE_SIZE,
          total: response?.pagination?.total ?? response?.data?.length ?? 0,
          totalPages: response?.pagination?.totalPages ?? 1,
        };
        setThreadsResponse({
          data: response?.data ?? [],
          pagination,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to load threads', error);
        const message =
          error?.data?.message || error?.data?.error || error?.message || 'Unable to load threads right now.';
        setThreadsError(message);
        setThreadsResponse((current) => ({ ...current, data: [] }));
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingThreads(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [threads, goalParam, searchQuery, pageParam]);

  useEffect(() => {
    if (!user?.id) {
      setUserThreads([]);
      return;
    }

    let cancelled = false;

    users
      .listThreads(user.id, { page: 1, pageSize: 3 })
      .then((response) => {
        if (cancelled) return;
        setUserThreads(response?.data ?? []);
      })
      .catch((error) => {
        console.error('Failed to load user threads', error);
        if (!cancelled) {
          setUserThreads([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, users]);

  const handleCategoryChange = (event) => {
    const value = event.target.value;
    const next = new URLSearchParams(searchParams);

    if (value === 'all') {
      next.delete('goal');
    } else {
      next.set('goal', value);
    }
    next.delete('page');

    setSearchParams(next);
    if (!isDesktop) {
      setIsSidebarOpen(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmed = searchInput.trim();
    const next = new URLSearchParams(searchParams);

    if (trimmed) {
      next.set('search', trimmed);
    } else {
      next.delete('search');
    }
    next.delete('page');

    setSearchParams(next);
  };

  const handlePageChange = (nextPage) => {
    if (nextPage === pageParam || nextPage < 1) return;
    const totalPages = threadsResponse.pagination.totalPages ?? 1;
    if (nextPage > totalPages) return;

    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const threadCards = useMemo(() => threadsResponse.data ?? [], [threadsResponse.data]);

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

  useEffect(() => {
    setThreadInteractions((current) => {
      const next = {};
      threadCards.forEach((thread) => {
        const identifier = thread?.id ?? thread?.slug;
        if (!identifier) return;
        const key = String(identifier);
        const previous = current[key] ?? {};
        const likedFromThread =
          thread?.viewer_has_liked ??
          thread?.liked ??
          thread?.is_liked ??
          thread?.liked_by_user;
        const repostedFromThread =
          thread?.viewer_has_reposted ??
          thread?.reposted ??
          thread?.is_reposted ??
          thread?.reposted_by_user;
        next[key] = {
          likeCount:
            thread?.counts?.likes ?? (Number.isInteger(previous.likeCount) ? previous.likeCount : 0),
          repostCount:
            thread?.counts?.reposts ??
            (Number.isInteger(previous.repostCount) ? previous.repostCount : 0),
          liked: Boolean(likedFromThread ?? previous.liked ?? false),
          reposted: Boolean(repostedFromThread ?? previous.reposted ?? false),
          isLiking: false,
          isReposting: false,
          error: previous.error ?? '',
        };
      });
      return next;
    });
  }, [threadCards]);

  const handleToggleLike = async (threadId) => {
    if (!threadId) return;
    const key = String(threadId);
    const currentState = threadInteractions[key];
    if (!currentState || currentState.isLiking) return;

    if (!user?.id) {
      setThreadInteractions((current) => {
        const next = { ...current };
        if (next[key]) {
          next[key] = { ...next[key], error: 'Sign in to like threads.' };
        }
        return next;
      });
      return;
    }

    const nextLiked = !currentState.liked;
    const likeDelta = nextLiked ? 1 : -1;
    setThreadInteractions((current) => ({
      ...current,
      [key]: {
        ...current[key],
        liked: nextLiked,
        likeCount: Math.max(0, (current[key]?.likeCount ?? 0) + likeDelta),
        isLiking: true,
        error: '',
      },
    }));

    try {
      if (nextLiked) {
        await threads.likeThread(threadId);
      } else {
        await threads.unlikeThread(threadId);
      }
      setThreadInteractions((current) => ({
        ...current,
        [key]: {
          ...current[key],
          isLiking: false,
        },
      }));
    } catch (error) {
      console.error('Failed to toggle like', error);
      const message =
        error?.data?.message ||
        error?.data?.error ||
        error?.message ||
        'Unable to update your like right now.';
      setThreadInteractions((current) => ({
        ...current,
        [key]: {
          ...current[key],
          liked: currentState.liked,
          likeCount: currentState.likeCount,
          isLiking: false,
          error: message,
        },
      }));
    }
  };

  const handleToggleRepost = async (threadId) => {
    if (!threadId) return;
    const key = String(threadId);
    const currentState = threadInteractions[key];
    if (!currentState || currentState.isReposting) return;

    if (!user?.id) {
      setThreadInteractions((current) => {
        const next = { ...current };
        if (next[key]) {
          next[key] = { ...next[key], error: 'Sign in to repost threads.' };
        }
        return next;
      });
      return;
    }

    const nextReposted = !currentState.reposted;
    const repostDelta = nextReposted ? 1 : -1;
    setThreadInteractions((current) => ({
      ...current,
      [key]: {
        ...current[key],
        reposted: nextReposted,
        repostCount: Math.max(0, (current[key]?.repostCount ?? 0) + repostDelta),
        isReposting: true,
        error: '',
      },
    }));

    try {
      if (nextReposted) {
        await threads.repostThread(threadId);
      } else {
        await threads.removeRepost(threadId);
      }
      setThreadInteractions((current) => ({
        ...current,
        [key]: {
          ...current[key],
          isReposting: false,
        },
      }));
    } catch (error) {
      console.error('Failed to toggle repost', error);
      const message =
        error?.data?.message ||
        error?.data?.error ||
        error?.message ||
        'Unable to update your repost right now.';
      setThreadInteractions((current) => ({
        ...current,
        [key]: {
          ...current[key],
          reposted: currentState.reposted,
          repostCount: currentState.repostCount,
          isReposting: false,
          error: message,
        },
      }));
    }
  };

  const activeCategoryLabel = useMemo(() => {
    if (goalParam === 'all') return 'All Goals';
    return categoryOptions.find((option) => option.value === goalParam)?.label ?? 'Selected category';
  }, [goalParam, categoryOptions]);

  const sidebarId = 'threads-sidebar-panel';
  const sidebarClassName = [
    'forum-sidebar',
    !isDesktop ? 'chat-sidebar-panel' : '',
    !isDesktop && isSidebarOpen ? 'is-open' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const sidebarStyle = !isDesktop && !isSidebarOpen ? { display: 'none' } : undefined;

  return (
    <section className="themed-page forum-page">
      <title>Forum Threads • SDG Forum</title>
      <ForumNavbar />

      <div className="forum-layout">
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
            <h2>Your post history</h2>
            <p>{user ? 'Pick up a conversation you started recently.' : 'Sign in to track and revisit your own threads.'}</p>

            <ul>
              {userThreads.length > 0 ? (
                userThreads.map((thread) => (
                  <li key={thread.id}>
                    <Link to={`/forum/threads/${thread.id}`}>
                      <span>{thread.title ?? 'Untitled thread'}</span>
                      <small>{thread.counts?.replies ?? 0} replies • {thread.counts?.likes ?? 0} likes</small>
                    </Link>
                  </li>
                ))
              ) : (
                <li>
                  <span>{user ? 'No posts yet — start a new thread to see it here.' : 'Nothing to show yet.'}</span>
                </li>
              )}
            </ul>

            <Link to="/forum/create" className="primary-button">
              Start a new thread
            </Link>
          </div>

          <div className="sidebar-card secondary">
            <h3>Share your progress</h3>
            <p>Turn milestones into learning moments. Inspire peers tackling similar SDG challenges.</p>
            <Link to={user ? '/forum/create' : '/auth/login'}>{user ? 'Draft your update →' : 'Connect your impact log →'}</Link>
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

        <main className="forum-main">
          {!isDesktop && (
            <button
              type="button"
              className="chat-sidebar-toggle"
              onClick={() => setIsSidebarOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isSidebarOpen ? 'true' : 'false'}
              aria-controls={sidebarId}
            >
              Browse filters
            </button>
          )}
          <div className="forum-search">
            <form className="search-input" onSubmit={handleSearchSubmit}>
              <input
                type="search"
                placeholder="Search threads"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <button type="submit" className="ghost-button" disabled={isLoadingThreads}>
                Search
              </button>
            </form>

            <div className="search-filters">
              <label>
                Goal
                <select
                  value={goalParam}
                  onChange={handleCategoryChange}
                  disabled={isLoadingCategories}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {threadsError ? (
            <div className="forum-error">{threadsError}</div>
          ) : null}

          <header className="thread-grid-header">
            <h1>{activeCategoryLabel}</h1>
            <span>
              Page {threadsResponse.pagination.page} of {threadsResponse.pagination.totalPages}
            </span>
          </header>

          {isLoadingThreads ? (
            <div className="thread-grid loading">
              {[...Array(3)].map((_, index) => (
                <article key={index} className="thread-card skeleton" aria-hidden="true" />
              ))}
            </div>
          ) : threadCards.length === 0 ? (
            <div className="thread-empty">No threads match your filters yet. Try another SDG or start a new conversation.</div>
          ) : (
            <div className="thread-grid">
              {threadCards.map((thread) => {
                const imageSource = resolveThreadImage(thread.image ?? thread.image_url, baseUrl);
                const cardClassName = imageSource ? 'thread-card' : 'thread-card thread-card--no-media';
                const threadLink = thread?.id
                  ? `/forum/threads/${thread.id}`
                  : thread?.slug
                    ? `/forum/threads/${thread.slug}`
                    : null;
                const authorName = thread.author?.name ?? thread.author?.username ?? 'Unknown author';
                const authorUsername = thread.author?.username;
                const authorAvatar = getAvatarUrl(thread.author, authorName, baseUrl);
                const postedAt = formatPostedAt(thread.created_at ?? thread.createdAt);
                const interactionKey = thread?.id ?? thread?.slug;
                const interactionState = interactionKey ? threadInteractions[String(interactionKey)] ?? {} : {};
                const repliesCount = thread.counts?.replies ?? 0;
                const likeCountDisplay =
                  interactionState.likeCount ?? thread.counts?.likes ?? 0;
                const repostCountDisplay =
                  interactionState.repostCount ?? thread.counts?.reposts ?? 0;
                const canInteract = Boolean(thread?.id);

                return (
                  <article key={thread.id} className={cardClassName}>
                    {imageSource ? (
                      <div className="thread-card__media">
                        <img src={imageSource} alt={`Cover for ${thread.title ?? 'thread'}`} loading="lazy" />
                      </div>
                    ) : null}

                    <div className="thread-card__meta">
                      {(thread.categories ?? []).map((category) => (
                        <span key={`${thread.id}-${category.id}`} className="thread-card__goal">
                          {formatGoalLabel(category)}
                        </span>
                      ))}
                      <span
                        className={`thread-card__status status-${
                          (thread.status ?? 'ACTIVE').toString().toLowerCase().replace(/\s+/g, '-')
                        }`}
                      >
                        {formatStatus(thread.status)}
                      </span>
                    </div>

                    <h3>
                      {threadLink ? (
                        <Link to={threadLink}>{thread.title ?? 'Untitled thread'}</Link>
                      ) : (
                        thread.title ?? 'Untitled thread'
                      )}
                    </h3>
                    <p>{thread.body?.slice(0, 180) ?? 'No summary provided yet.'}</p>

                    <footer>
                      <div className="thread-card__author">
                        <img
                          src={authorAvatar}
                          alt={`Avatar of ${authorName}`}
                          className="thread-card__avatar"
                        />
                        <div>
                          <span>{authorName}</span>
                          <small>
                            {authorUsername ? `@${authorUsername}` : 'Community member'}
                            {postedAt ? ` • ${postedAt}` : ''}
                          </small>
                        </div>
                      </div>
                      <div className="thread-card__footer-actions">
                        <div className="thread-card__actions">
                          <button
                            type="button"
                            className={`ghost-button thread-card__action thread-like-button ${
                              interactionState.liked ? 'is-liked' : ''
                            }`}
                            onClick={() => handleToggleLike(thread.id)}
                            disabled={!canInteract || interactionState.isLiking}
                            aria-pressed={interactionState.liked ? 'true' : 'false'}
                          >
                            Like • {likeCountDisplay}
                          </button>
                          <button
                            type="button"
                            className={`ghost-button thread-card__action thread-repost-button ${
                              interactionState.reposted ? 'is-reposted' : ''
                            }`}
                            onClick={() => handleToggleRepost(thread.id)}
                            disabled={!canInteract || interactionState.isReposting}
                            aria-pressed={interactionState.reposted ? 'true' : 'false'}
                          >
                            Repost • {repostCountDisplay}
                          </button>
                        </div>
                        <div className="thread-card__counts">
                          <span>{repliesCount} replies</span>
                        </div>
                        {threadLink ? (
                          <Link to={threadLink} className="thread-card__view">
                            View thread →
                          </Link>
                        ) : null}
                      </div>
                    </footer>
                    {interactionState.error ? (
                      <p className="thread-card__interaction-error" role="status">
                        {interactionState.error}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          <div className="thread-pagination">
            <button
              type="button"
              className="ghost-button"
              onClick={() => handlePageChange(pageParam - 1)}
              disabled={isLoadingThreads || pageParam <= 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => handlePageChange(pageParam + 1)}
              disabled={
                isLoadingThreads || pageParam >= (threadsResponse.pagination.totalPages ?? 1)
              }
            >
              Next
            </button>
          </div>
        </main>
      </div>
    </section>
  );
};

export default ForumThreadsPage;
