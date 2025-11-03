import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ForumNavbar from '../../components/forum/ForumNavbar';
import { useApi } from '../../api';
import { resolveProfileImageUrl, resolveThreadImage } from '@utils/media';

const PAGE_SIZE = 20;

const formatGoalLabel = (category) => {
  const sdgNumber = category?.sdg_number ?? category?.sdgNumber;
  if (sdgNumber !== undefined && sdgNumber !== null) {
    return `Goal ${String(sdgNumber).padStart(2, '0')} • ${category?.name ?? 'Untitled'}`;
  }
  return category?.name ?? 'Untitled category';
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const makeInitials = (value) => {
  if (!value) return 'U';
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 'U';
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toUpperCase();
};

const snippet = (body) => {
  if (!body || typeof body !== 'string') {
    return 'No summary provided yet.';
  }
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'No summary provided yet.';
  }
  return normalized.length > 200 ? `${normalized.slice(0, 197)}…` : normalized;
};

const getThreadLink = (thread) => {
  if (thread?.id) {
    return `/forum/threads/${thread.id}`;
  }
  if (thread?.slug) {
    return `/forum/threads/${thread.slug}`;
  }
  return '/forum/threads';
};

const getAuthorInfo = (thread, baseUrl) => {
  const candidates = [
    thread?.author,
    thread?.author_profile,
    thread?.authorProfile,
    thread?.user,
    thread?.user_profile,
    thread?.userProfile,
    thread?.profile,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return { name: trimmed, avatar: null, initials: makeInitials(trimmed) };
      }
    } else if (typeof candidate === 'object') {
      const name = candidate.name ?? candidate.username ?? candidate.displayName ?? null;
      const avatar = resolveProfileImageUrl(candidate, baseUrl);
      if (name) {
        return { name, avatar, initials: makeInitials(name) };
      }
    }
  }

  return { name: 'Community member', avatar: null, initials: 'CM' };
};

const ThreadCardSkeleton = () => (
  <div className="thread-card thread-card--skeleton">
    <div className="thread-card__media" />
    <div className="thread-card__content">
      <div className="skeleton-pill" />
      <div className="skeleton-line skeleton-line--lg" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-line--short" />
      <footer className="thread-card__footer">
        <div className="thread-card__author">
          <div className="skeleton-avatar" />
          <div>
            <div className="skeleton-line skeleton-line--xs" />
            <div className="skeleton-line skeleton-line--xxs" />
          </div>
        </div>
        <div className="skeleton-chip" />
      </footer>
    </div>
  </div>
);

const ThreadStat = ({ icon, label, value }) => (
  <span className="thread-card__stat">
    <span className="thread-card__stat-icon" aria-hidden="true">
      {icon}
    </span>
    <span className="thread-card__stat-value">{value}</span>
    <span className="thread-card__stat-label">{label}</span>
  </span>
);

const ForumThreadsPage = () => {
  const { threads, categories, baseUrl } = useApi();
  const [categoryOptions, setCategoryOptions] = useState([{ value: 'all', label: 'All discussions' }]);
  const [filters, setFilters] = useState({ category: 'all', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [threadItems, setThreadItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const response = await categories.list();
        if (cancelled) return;

        const options = (Array.isArray(response) ? response : [])
          .map((category) => {
            const id = category?.id ?? category?.value;
            if (!id) return null;
            return { value: String(id), label: formatGoalLabel(category) };
          })
          .filter(Boolean);

        setCategoryOptions([{ value: 'all', label: 'All discussions' }, ...options]);
      } catch (caughtError) {
        if (!cancelled) {
          console.error('Failed to load categories', caughtError);
          setCategoryOptions([{ value: 'all', label: 'All discussions' }]);
        }
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [categories]);

  useEffect(() => {
    let cancelled = false;

    const loadThreads = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await threads.listThreads({
          page: 1,
          pageSize: PAGE_SIZE,
          search: filters.search || undefined,
          categories: filters.category !== 'all' ? filters.category : undefined,
        });

        if (cancelled) return;

        const data = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];
        setThreadItems(data);
      } catch (caughtError) {
        if (cancelled) return;
        console.error('Failed to load threads', caughtError);
        const message =
          caughtError?.data?.message ||
          caughtError?.data?.error ||
          caughtError?.message ||
          'Unable to load threads right now.';
        setError(message);
        setThreadItems([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadThreads();
    return () => {
      cancelled = true;
    };
  }, [threads, filters]);

  const activeCategoryLabel = useMemo(() => {
    const match = categoryOptions.find((option) => option.value === filters.category);
    return match ? match.label : 'Latest discussions';
  }, [categoryOptions, filters.category]);

  const isEmpty = !isLoading && threadItems.length === 0 && !error;

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setFilters((current) => ({ ...current, search: searchInput.trim() }));
  };

  const handleCategoryChange = (event) => {
    const nextCategory = event.target.value;
    setFilters((current) => ({ ...current, category: nextCategory }));
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setFilters({ category: 'all', search: '' });
  };

  return (
    <>
      <ForumNavbar />
      <main className="forum-layout">
        <section className="forum-hero">
          <div className="forum-hero__body">
            <h1>Community Threads</h1>
            <p>Learn what the SDG community is prototyping, ask for help, and celebrate progress together.</p>
          </div>
          <div className="forum-hero__actions">
            <Link to="/forum/create" className="primary-button">
              Start a thread
            </Link>
            <button type="button" className="ghost-button" onClick={handleResetFilters}>
              Reset filters
            </button>
          </div>
        </section>

        <section className="forum-toolbar">
          <form className="forum-searchbar" onSubmit={handleSearchSubmit}>
            <span className="forum-searchbar__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M21 21L16.65 16.65M18 11C18 14.866 14.866 18 11 18C7.13401 18 4 14.866 4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <input
              id="thread-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by keyword, goal, or tag"
              aria-label="Search threads"
            />
            {searchInput && (
              <button
                type="button"
                className="forum-searchbar__clear"
                onClick={() => {
                  setSearchInput('');
                  setFilters((current) => ({ ...current, search: '' }));
                }}
              >
                <span className="sr-only">Clear search</span>
                ×
              </button>
            )}
            <button type="submit" className="primary-button">
              Search
            </button>
          </form>

          <div className="forum-filter">
            <label htmlFor="thread-category">Goal focus</label>
            <select id="thread-category" value={filters.category} onChange={handleCategoryChange}>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="forum-feed">
          <header className="forum-feed__header">
            <div>
              <h2>{activeCategoryLabel}</h2>
              <p>
                {filters.search
                  ? `Showing results for “${filters.search}”.`
                  : 'Fresh perspectives and learnings from the field.'}
              </p>
            </div>
            <span className="forum-feed__count">
              {isLoading
                ? 'Loading…'
                : `${threadItems.length} thread${threadItems.length === 1 ? '' : 's'}`}
            </span>
          </header>

          {error && <div className="form-feedback form-feedback--error">{error}</div>}

          {isEmpty && (
            <div className="forum-empty">
              <div className="forum-empty__badge">No matches</div>
              <h3>Create the first conversation</h3>
              <p>
                We couldn’t find threads for this combination. Share what your team is working on or adjust the filters to
                explore other goals.
              </p>
              <Link to="/forum/create" className="primary-button">
                Start a new thread
              </Link>
            </div>
          )}

          <div className="thread-grid">
            {isLoading
              ? [...Array(6)].map((_, index) => <ThreadCardSkeleton key={`placeholder-${index}`} />)
              : threadItems.map((thread) => {
                  const link = getThreadLink(thread);
                  const imageUrl = resolveThreadImage(thread?.image ?? thread?.image_url, baseUrl);
                  const key = thread?.id ?? thread?.slug ?? `thread-${Math.random()}`;
                  const categoriesList = Array.isArray(thread?.categories) ? thread.categories : [];
                  const counts = {
                    likes: thread?.counts?.likes ?? 0,
                    replies:
                      thread?.counts?.replies ??
                      (Array.isArray(thread?.replies) ? thread.replies.length : 0),
                    reposts: thread?.counts?.reposts ?? 0,
                  };
                  const author = getAuthorInfo(thread, baseUrl);

                  return (
                    <article key={key} className={`thread-card${imageUrl ? '' : ' thread-card--no-media'}`}>
                      {imageUrl && (
                        <Link to={link} className="thread-card__media" aria-label={`View ${thread?.title ?? 'thread'}`}>
                          <img src={imageUrl} alt="" loading="lazy" />
                        </Link>
                      )}

                      <div className="thread-card__content">
                        <div className="thread-card__meta">
                          {categoriesList.length > 0 ? (
                            categoriesList.map((category) => (
                              <span key={category?.id ?? category?.name} className="thread-card__goal">
                                {formatGoalLabel(category)}
                              </span>
                            ))
                          ) : (
                            <span className="thread-card__goal thread-card__goal--muted">Cross-goal</span>
                          )}
                        </div>

                        <h3 className="thread-card__title">
                          <Link to={link}>{thread?.title ?? 'Untitled thread'}</Link>
                        </h3>
                        <p className="thread-card__snippet">{snippet(thread?.body)}</p>

                        <div className="thread-card__stats">
                          <ThreadStat
                            icon="👍"
                            label="Appreciations"
                            value={counts.likes}
                          />
                          <ThreadStat
                            icon="💬"
                            label="Replies"
                            value={counts.replies}
                          />
                          <ThreadStat
                            icon="🔁"
                            label="Shares"
                            value={counts.reposts}
                          />
                        </div>

                        <footer className="thread-card__footer">
                          <div className="thread-card__author">
                            {author.avatar ? (
                              <img
                                src={author.avatar}
                                alt={author.name}
                                className="thread-card__author-avatar"
                              />
                            ) : (
                              <span className="thread-card__author-fallback" aria-hidden="true">
                                {author.initials}
                              </span>
                            )}
                            <div className="thread-card__author-meta">
                              <span>{author.name}</span>
                              <small>{formatDate(thread?.created_at ?? thread?.createdAt)}</small>
                            </div>
                          </div>
                          <Link to={link} className="ghost-button">
                            Open thread
                          </Link>
                        </footer>
                      </div>
                    </article>
                  );
                })}
          </div>
        </section>
      </main>
    </>
  );
};

export default ForumThreadsPage;
