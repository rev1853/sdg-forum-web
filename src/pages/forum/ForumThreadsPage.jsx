import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ForumNavbar from '../../components/forum/ForumNavbar';
import { useApi } from '@/api';
import { useAuth } from '@/context/AuthContext';

const PAGE_SIZE = 9;

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

const ForumThreadsPage = () => {
  const { threads, categories, users } = useApi();
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

  const activeCategoryLabel = useMemo(() => {
    if (goalParam === 'all') return 'All Goals';
    return categoryOptions.find((option) => option.value === goalParam)?.label ?? 'Selected category';
  }, [goalParam, categoryOptions]);

  return (
    <section className="themed-page forum-page">
      <title>Forum Threads • SDG Forum</title>
      <ForumNavbar />

      <div className="forum-layout">
        <aside className="forum-sidebar">
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

        <main className="forum-main">
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
                const imageSource = thread.image ?? thread.image_url ?? null;
                const cardClassName = imageSource ? 'thread-card' : 'thread-card thread-card--no-media';

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

                    <h3>{thread.title ?? 'Untitled thread'}</h3>
                    <p>{thread.body?.slice(0, 180) ?? 'No summary provided yet.'}</p>

                    <footer>
                      <div className="thread-card__author">
                        <span>{thread.author?.name ?? thread.author?.username ?? 'Unknown author'}</span>
                      </div>
                      <div className="thread-card__counts">
                        <span>{thread.counts?.replies ?? 0} replies</span>
                        <span>{thread.counts?.likes ?? 0} likes</span>
                      </div>
                    </footer>
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
