import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ForumNavbar = () => {
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 960 : true));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileTriggerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const links = [
    { to: '/forum/threads', label: 'Threads' },
    { to: '/forum/chat', label: 'Live Chat' },
    { to: '/forum/create', label: 'Create Thread' },
    { to: '/terms', label: 'Terms' }
  ];

  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const updateViewport = () => {
      const desktop = typeof window !== 'undefined' ? window.innerWidth >= 960 : true;
      setIsDesktop(desktop);
      if (desktop) {
        setIsMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      setIsProfileMenuOpen(false);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;

    const handleClickOutside = event => {
      if (
        !profileMenuRef.current ||
        profileMenuRef.current.contains(event.target) ||
        profileTriggerRef.current?.contains(event.target)
      ) {
        return;
      }
      setIsProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const profileImage = user?.profile_picture ?? user?.profilePicture ?? null;
  const profileInitials = user?.name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  const handleSignOut = () => {
    logout();
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="forum-navbar">
      <div className="forum-navbar__content">
        <Link to="/" className="forum-navbar__brand">
          <span className="brand-accent">SDG</span> Forum
        </Link>

        <div className="forum-navbar__actions">
          <button
            type="button"
            className={`forum-navbar__toggle ${isMenuOpen ? 'forum-navbar__toggle--open' : ''}`}
            aria-controls="forum-navigation"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(open => !open)}
          >
            <span className="sr-only">Toggle forum menu</span>
            <span className="forum-navbar__toggle-bar" aria-hidden="true" />
            <span className="forum-navbar__toggle-bar" aria-hidden="true" />
            <span className="forum-navbar__toggle-bar" aria-hidden="true" />
          </button>

          <nav
            id="forum-navigation"
            className={`forum-navbar__links ${isMenuOpen ? 'is-open' : ''}`}
            aria-hidden={isDesktop ? undefined : !isMenuOpen}
          >
            {links.map(link => {
              const isActive = location.pathname === link.to;
              return (
                <Link key={link.to} to={link.to} className={`forum-navbar__link ${isActive ? 'is-active' : ''}`}>
                  {link.label}
                </Link>
              );
            })}

            {!user && (
              <Link to="/auth/login" className="forum-navbar__link forum-navbar__link--cta">
                Sign in
              </Link>
            )}

            {user && (
              <button type="button" className="forum-navbar__link forum-navbar__link--mobile" onClick={handleSignOut}>
                Sign out
              </button>
            )}
          </nav>

          {user && (
            <div className="forum-profile-menu">
              <button
                type="button"
                className={`forum-profile-trigger ${isProfileMenuOpen ? 'is-open' : ''}`}
                onClick={() => setIsProfileMenuOpen(open => !open)}
                aria-haspopup="true"
                aria-expanded={isProfileMenuOpen}
                ref={profileTriggerRef}
              >
                <span className="forum-profile-avatar" aria-hidden="true">
                  {profileImage ? (
                    <img src={profileImage} alt="Your profile" />
                  ) : (
                    profileInitials || 'U'
                  )}
                </span>
                <span className="forum-profile-name">{user.name}</span>
              </button>

              <div
                className={`forum-profile-dropdown ${isProfileMenuOpen ? 'is-open' : ''}`}
                ref={profileMenuRef}
                role="menu"
              >
                <div className="forum-profile-details" role="none">
                  <span className="forum-profile-details__name">{user.name}</span>
                  <span className="forum-profile-details__email">{user.email}</span>
                </div>
                <Link
                  to="/profile"
                  className="forum-profile-action"
                  role="menuitem"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  Profile settings
                </Link>
                <button type="button" className="forum-profile-action" onClick={handleSignOut} role="menuitem">
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ForumNavbar;
