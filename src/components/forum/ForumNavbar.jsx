import { Link, useLocation } from 'react-router-dom';

const ForumNavbar = () => {
  const location = useLocation();

  const links = [
    { to: '/forum/threads', label: 'Threads' },
    { to: '/forum/chat', label: 'Live Chat' },
    { to: '/forum/create', label: 'Create Thread' },
    { to: '/terms', label: 'Terms' }
  ];

  return (
    <header className="forum-navbar">
      <div className="forum-navbar__content">
        <Link to="/" className="forum-navbar__brand">
          <span className="brand-accent">SDG</span> Forum
        </Link>

        <nav className="forum-navbar__links">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`forum-navbar__link ${location.pathname === link.to ? 'is-active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link to="/auth/login" className="forum-navbar__cta">
          Sign in
        </Link>
      </div>
    </header>
  );
};

export default ForumNavbar;
