import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiX, FiClock } from 'react-icons/fi';
import ForumNavbar from '../../components/forum/ForumNavbar';
import ThreadCard from '../../components/forum/ThreadCard';
import { useApi } from '../../api';
import { useAuth } from '@/context/AuthContext';

const PAGE_SIZE = 20;

const formatGoalLabel = (category) => {
  const sdgNumber = category?.sdg_number ?? category?.sdgNumber;
  if (sdgNumber !== undefined && sdgNumber !== null) {
    return `Goal ${String(sdgNumber).padStart(2, '0')} • ${category?.name ?? 'Untitled'}`;
  }
  return category?.name ?? 'Untitled category';
};

const ThreadCardSkeleton = () => (
  <div className="thread-card thread-card--skeleton animate-pulse">
    <div className="thread-card__media bg-gray-800/50" />
    <div className="thread-card__content">
      <div className="h-6 bg-gray-700/50 rounded-full w-1/3 mb-4" />
      <div className="h-8 bg-gray-700/50 rounded-lg w-3/4 mb-2" />
      <div className="h-4 bg-gray-700/50 rounded w-full mb-2" />
      <div className="h-4 bg-gray-700/50 rounded w-2/3" />
    </div>
  </div>
);

const ForumThreadsPage = () => {
  const { threads, categories, users } = useApi();
  const { user } = useAuth();
  const [categoryOptions, setCategoryOptions] = useState([{ value: 'all', label: 'All discussions' }]);
  const [filters, setFilters] = useState({ category: 'all', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [threadItems, setThreadItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // ... (keep existing useEffects for scrolling, search debounce, categories, and main threads)

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput.trim() }));
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  // Load categories
  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      if (!categories) return;
      try {
        const response = await categories.list();
        if (cancelled) return;
        const categoryData = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];
        const options = [
          { value: 'all', label: 'All discussions' },
          ...categoryData.map((cat) => ({
            value: cat.id,
            label: formatGoalLabel(cat),
          })),
        ];
        setCategoryOptions(options);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    loadCategories();
    return () => { cancelled = true; };
  }, [categories]);

  // Load main threads
  useEffect(() => {
    let cancelled = false;

    const loadThreads = async () => {
      if (!threads) {
        console.error('Threads service not available');
        setError('Service unavailable');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError('');

      // Safety timeout
      const timeoutId = setTimeout(() => {
        setIsLoading(false);
        setError('Request timed out');
      }, 5000);

      try {
        const response = await threads.listThreads({
          page: 1,
          pageSize: PAGE_SIZE,
          search: filters.search || undefined,
          categories: filters.category !== 'all' ? filters.category : undefined,
        });

        clearTimeout(timeoutId);

        if (cancelled) return;

        const data = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

        setThreadItems(data);
      } catch (caughtError) {
        clearTimeout(timeoutId);
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
        // Always clear loading state, even if cancelled, to prevent UI hanging
        setIsLoading(false);
      }
    };

    loadThreads();
    return () => { cancelled = true; };
  }, [threads, filters]);

  // ... (keep loadThreads effect)

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
      <main className="forum-layout min-h-screen bg-[var(--color-bg-primary)]">
        <section className="forum-hero">
          <div className="forum-hero__body">
            <h1>Community Threads</h1>
            <p>Learn what the SDG community is prototyping, ask for help, and celebrate progress together.</p>
          </div>
          <div className="forum-hero__actions">
            <Link to="/forum/create" className="primary-button">
              <span>+</span> Start a thread
            </Link>
            <button type="button" className="ghost-button" onClick={handleResetFilters}>
              Reset filters
            </button>
          </div>
        </section>

        <div className="forum-content-grid">
          <div className="forum-main-column">
            <section className="forum-toolbar">
              <form className="forum-searchbar" onSubmit={handleSearchSubmit}>
                <span className="forum-searchbar__icon" aria-hidden="true">
                  <FiSearch size={18} />
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
                    aria-label="Clear search"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </form>

              <div className="forum-filter flex gap-2">
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

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-center">
                  {error}
                </div>
              )}

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
                  : threadItems.map((thread) => (
                    <ThreadCard
                      key={thread?.id ?? thread?.slug ?? `thread-${Math.random()}`}
                      thread={thread}
                    />
                  ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
};

export default ForumThreadsPage;
