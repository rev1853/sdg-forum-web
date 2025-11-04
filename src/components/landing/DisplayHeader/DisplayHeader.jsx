import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import './DisplayHeader.css';
import { useApi } from '@/api';
import { resolveProfileImageUrl } from '@utils/media';
import { useAuth } from '../../../context/AuthContext';
import sdgsLogo from '../../../assets/sdgs-logo.png';

const DisplayHeader = ({ activeItem }) => {
  const navRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 900 : true));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileTriggerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { baseUrl } = useApi();

  const navLinks = useMemo(
    () => {
      const items = [
        { label: 'Home', to: '/', match: () => location.pathname === '/' },
        { label: 'Forum', to: '/forum/threads', match: () => location.pathname.startsWith('/forum') },
        { label: 'Terms', to: '/terms', match: () => location.pathname === '/terms' }
      ];

      if (!user) {
        items.push({ label: 'Sign In', to: '/auth/login', match: () => location.pathname.startsWith('/auth') });
      }

      return items;
    },
    [location.pathname, user]
  );

  useEffect(() => {
    if (navRef.current) {
      gsap.fromTo(
        navRef.current.querySelectorAll('.nav-link'),
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out' }
      );
    }
  }, [location.pathname]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const updateViewport = () => {
      const desktop = typeof window !== 'undefined' ? window.innerWidth >= 900 : true;
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

  const profileImage = useMemo(() => resolveProfileImageUrl(user, baseUrl), [user, baseUrl]);
  const profileInitials = user?.name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  const renderAvatar = useCallback(
    (size = 'small') => {
      const classes = ['profile-avatar'];
      if (size === 'large') {
        classes.push('profile-avatar--lg');
      }

      const hasImage = typeof profileImage === 'string' && profileImage.trim().length > 0;

      const content = hasImage ? (
        <img src={profileImage} alt="Your profile" className="profile-avatar__image" />
      ) : (
        <span className="profile-avatar__initials">{profileInitials || 'U'}</span>
      );

      if (hasImage) {
        classes.push('profile-avatar--with-image');
      } else {
        classes.push('profile-avatar--fallback');
      }

      return (
        <span className={classes.join(' ')} aria-hidden="true">
          {content}
        </span>
      );
    },
    [profileImage, profileInitials],
  );

  const profileHandle = user?.username ? `@${user.username}` : null;

  const handleSignOut = () => {
    logout();
    setIsProfileMenuOpen(false);
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo" aria-label="SDG Forum home">
          <img src={sdgsLogo} alt="SDGs Forum" className="logo-image" />
        </Link>

        <div className="nav-cta-group">
          <button
            type="button"
            className={`menu-toggle ${isMenuOpen ? 'menu-toggle--open' : ''}`}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen(open => !open)}
          >
            <span className="sr-only">Toggle navigation</span>
            <span className="menu-toggle__bar" aria-hidden="true" />
            <span className="menu-toggle__bar" aria-hidden="true" />
            <span className="menu-toggle__bar" aria-hidden="true" />
          </button>

          <nav
            id="primary-navigation"
            className={`landing-nav-items header-nav ${isMenuOpen ? 'is-open' : ''}`}
            ref={navRef}
            aria-hidden={isDesktop ? undefined : !isMenuOpen}
          >
            {navLinks.map(link => (
              <Link
                key={link.label}
                className={`nav-link ${
                  link.match() ||
                  (link.to === '/' && activeItem === 'home') ||
                  (link.to === '/showcase' && activeItem === 'showcase')
                    ? 'active-link'
                    : ''
                }`}
                to={link.to}
              >
                {link.label}
              </Link>
            ))}

            {user && (
              <button
                type="button"
                className="nav-link nav-link--mobile-action"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            )}
          </nav>

          {user && (
            <div className="profile-menu">
              <button
                type="button"
                className={`profile-trigger ${isProfileMenuOpen ? 'is-open' : ''}`}
                onClick={() => setIsProfileMenuOpen(open => !open)}
                aria-haspopup="true"
                aria-expanded={isProfileMenuOpen}
                ref={profileTriggerRef}
              >
                {renderAvatar()}
                <span className="profile-text">
                  <span className="profile-name">{user.name}</span>
                  {profileHandle ? <span className="profile-handle">{profileHandle}</span> : null}
                </span>
              </button>

              <div
                className={`profile-dropdown ${isProfileMenuOpen ? 'is-open' : ''}`}
                ref={profileMenuRef}
                role="menu"
              >
                {renderAvatar('large')}
                <div className="profile-details" role="none">
                  <span className="profile-details__name">{user.name}</span>
                  {profileHandle ? <span className="profile-details__handle">{profileHandle}</span> : null}
                  <span className="profile-details__email">{user.email}</span>
                </div>
                <button type="button" className="profile-action" onClick={handleSignOut} role="menuitem">
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

export default DisplayHeader;
