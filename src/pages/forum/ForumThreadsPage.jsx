import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ForumNavbar from '../../components/forum/ForumNavbar';
import sdgGoals from '../../data/sdgGoals';

const sampleThreads = [
  {
    id: '1',
    title: 'Scaling clean water access in coastal villages',
    goal: 'SDG 6 - Clean Water and Sanitation',
    goalSlug: 'water-sanitation',
    image: '/assets/sdg/goals-cover.svg',
    author: 'Aisyah Noor',
    avatar: '/assets/avatars/avatar-aisyah.svg',
    replies: 34,
    lastActivity: '12 minutes ago',
    status: 'Active',
    excerpt: 'We recently piloted smart sensors that track groundwater refill rates. Sharing our results and looking for partners to expand.'
  },
  {
    id: '2',
    title: 'Community composting playbook draft',
    goal: 'SDG 12 - Responsible Consumption',
    goalSlug: 'consumption-production',
    image: '/assets/sdg/goals-cover.svg',
    author: 'Marco Silva',
    avatar: '/assets/avatars/avatar-marco.svg',
    replies: 18,
    lastActivity: '2 hours ago',
    status: 'In review',
    excerpt: 'Draft guidelines for neighborhoods to deploy compost hubs, measure waste diversion, and report impact.'
  },
  {
    id: '3',
    title: 'Solar-powered cold chains for vaccines',
    goal: 'SDG 3 - Good Health and Well-being',
    goalSlug: 'health',
    image: '/assets/sdg/goals-cover.svg',
    author: 'Dr. Lina Adane',
    avatar: '/assets/avatars/avatar-lina.svg',
    replies: 52,
    lastActivity: 'Yesterday',
    status: 'Featured',
    excerpt: 'Looking for supply partners and funding pathways to scale our tested prototype across rural clinics.'
  },
  {
    id: '4',
    title: 'Inclusive education materials for remote classrooms',
    goal: 'SDG 4 - Quality Education',
    goalSlug: 'education',
    image: '/assets/sdg/goals-cover.svg',
    author: 'Femi Adeyemi',
    avatar: '/assets/avatars/avatar-femi.svg',
    replies: 9,
    lastActivity: '3 days ago',
    status: 'Active',
    excerpt: 'We digitized a toolkit with multilingual support for offline-first use. Feedback on usability is welcome.'
  }
];

const postHistory = [
  { id: 'p-34', title: 'Design sprint recap: SDG 11', interactions: 87 },
  { id: 'p-12', title: 'Youth climate innovation lab', interactions: 143 },
  { id: 'p-56', title: 'Data standards for SDG reporting', interactions: 62 }
];

const statusOptions = ['all', 'Active', 'In review', 'Featured'];

const goalOptions = [
  { value: 'all', label: 'All Goals' },
  ...sdgGoals.map(goal => ({
    value: goal.forumCategory,
    label: `Goal ${goal.number.toString().padStart(3, '0')} – ${goal.title}`
  }))
];

const ForumThreadsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [goalFilter, setGoalFilter] = useState(() => {
    const initial = searchParams.get('goal') || 'all';
    return goalOptions.some(option => option.value === initial) ? initial : 'all';
  });
  const [statusFilter, setStatusFilter] = useState(statusOptions[0]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const paramGoal = searchParams.get('goal') || 'all';
    const normalized = goalOptions.some(option => option.value === paramGoal) ? paramGoal : 'all';
    if (goalFilter !== normalized) {
      setGoalFilter(normalized);
    }
  }, [searchParams, goalFilter]);

  useEffect(() => {
    const current = searchParams.get('goal') || 'all';
    if (goalFilter === current) return;

    const next = new URLSearchParams(searchParams);
    if (goalFilter === 'all') {
      next.delete('goal');
    } else {
      next.set('goal', goalFilter);
    }
    setSearchParams(next);
  }, [goalFilter, searchParams, setSearchParams]);

  const filteredThreads = useMemo(() => {
    return sampleThreads.filter(thread => {
      const matchesSearch = thread.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGoal = goalFilter === 'all' || thread.goalSlug === goalFilter;
      const matchesStatus = statusFilter === 'all' || thread.status === statusFilter;
      return matchesSearch && matchesGoal && matchesStatus;
    });
  }, [searchTerm, goalFilter, statusFilter]);

  return (
    <section className="themed-page forum-page">
      <title>Forum Threads • SDG Forum</title>
      <ForumNavbar />

      <div className="forum-layout">
        <aside className="forum-sidebar">
          <div className="sidebar-card">
            <h2>Your post history</h2>
            <p>Revisit the conversations you started and see how the community responded.</p>

            <ul>
              {postHistory.map(post => (
                <li key={post.id}>
                  <span>{post.title}</span>
                  <small>{post.interactions} interactions</small>
                </li>
              ))}
            </ul>

            <Link to="/forum/create" className="primary-button">
              Start a new thread
            </Link>
          </div>

          <div className="sidebar-card secondary">
            <h3>Share your progress</h3>
            <p>Turn milestones into learning moments. Inspire peers tackling similar SDG challenges.</p>
            <Link to="/auth/login">Connect your impact log →</Link>
          </div>
        </aside>

        <main className="forum-main">
          <div className="forum-search">
            <div className="search-input">
              <input
                type="search"
                placeholder="Search threads"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="search-filters">
              <label>
                Goal
                <select value={goalFilter} onChange={event => setGoalFilter(event.target.value)}>
                  {goalOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                  {statusOptions.map(option => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'All Statuses' : option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="thread-grid">
            {filteredThreads.map(thread => (
              <article key={thread.id} className="thread-card">
                <div className="thread-card__media">
                  <img src={thread.image} alt={`Cover for ${thread.title}`} loading="lazy" />
                </div>

                <div className="thread-card__meta">
                  <span className="thread-card__goal">{thread.goal}</span>
                  <span className={`thread-card__status status-${thread.status.replace(' ', '-').toLowerCase()}`}>
                    {thread.status}
                  </span>
                </div>
                <h3>{thread.title}</h3>
                <p>{thread.excerpt}</p>

                <div className="thread-card__footer">
                  <div className="thread-card__author">
                    <img src={thread.avatar} alt={thread.author} className="thread-card__avatar" loading="lazy" />
                    <div>
                      <span>{thread.author}</span>
                      <small>
                        {thread.replies} replies · {thread.lastActivity}
                      </small>
                    </div>
                  </div>

                  <Link to={`/forum/threads/${thread.id}`} className="secondary-button">
                    View thread
                  </Link>
                </div>
              </article>
            ))}

            {filteredThreads.length === 0 && (
              <div className="empty-state">
                <h3>No threads found</h3>
                <p>Try adjusting your filters or start a new thread to invite conversation.</p>
                <Link to="/forum/create" className="primary-button">
                  Create the first post
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </section>
  );
};

export default ForumThreadsPage;
