import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useApi } from '@/api';
import { resolveProfileImageUrl } from '@utils/media';
import { useAuth } from '../../context/AuthContext';

const ForumNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileTriggerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { baseUrl } = useApi();

  const links = [
    { to: '/forum/threads', label: 'Threads' },
    { to: '/forum/chat', label: 'Live Chat' },
  ];

  useEffect(() => {
    const closeMenus = () => {
      setIsMenuOpen(false);
      setIsProfileMenuOpen(false);
    };
    window.addEventListener('resize', closeMenus);
    return () => window.removeEventListener('resize', closeMenus);
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target) &&
        profileTriggerRef.current &&
        !profileTriggerRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  const profileImage = useMemo(() => resolveProfileImageUrl(user, baseUrl), [user, baseUrl]);
  const profileInitials = useMemo(() => {
    if (!user?.name) return 'U';
    const parts = user.name.split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [user?.name]);

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  const profileHandle = useMemo(() => (user?.username ? `@${user.username}` : null), [user?.username]);

  const renderAvatar = useCallback(
    (size = 'small') => {
      const classNames = ['profile-menu__avatar'];
      if (size === 'large') {
        classNames.push('profile-menu__avatar--large');
      }

      const hasImage = typeof profileImage === 'string' && profileImage.trim().length > 0;

      if (hasImage) {
        classNames.push('profile-menu__avatar--image');
      } else {
        classNames.push('profile-menu__avatar--fallback');
      }

      return hasImage ? (
        <span className={classNames.join(' ')}>
          <img src={profileImage} alt="Profile" />
        </span>
      ) : (
        <span className={classNames.join(' ')} aria-hidden="true">
          {profileInitials}
        </span>
      );
    },
    [profileImage, profileInitials],
  );

  return (
    <header className="top-navbar">
      <div className="top-navbar__container">
        <div className="top-navbar__left">
          <Link to="/" className="top-navbar__brand">
            <span className="brand-accent">SDG</span> Forum
          </Link>
          <nav className="top-navbar__nav">
            {links.map(({ to, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `top-navbar__link ${isActive ? 'is-active' : ''}`}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="top-navbar__right">
          <Link to="/forum/create" className="primary-button">
            Create Thread
          </Link>
          {user ? (
            <div className="profile-menu">
              <button
                ref={profileTriggerRef}
                type="button"
                className="profile-menu__trigger"
                onClick={() => setIsProfileMenuOpen(p => !p)}
              >
                {renderAvatar()}
              </button>
              {isProfileMenuOpen && (
                <div ref={profileMenuRef} className="profile-menu__dropdown">
                  <div className="profile-menu__user-info">
                    {renderAvatar('large')}
                    <div className="profile-menu__user-details">
                      <span className="profile-menu__user-name">{user.name}</span>
                      {profileHandle ? <span className="profile-menu__user-username">{profileHandle}</span> : null}
                      <span className="profile-menu__user-email">{user.email}</span>
                    </div>
                  </div>
                  <Link to="/profile" className="profile-menu__link">Profile</Link>
                  <button onClick={handleSignOut} className="profile-menu__button">Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth/login" className="ghost-button">
              Sign In
            </Link>
          )}
        </div>

        <div className="top-navbar__mobile-menu">
          <button className="mobile-menu__toggle" onClick={() => setIsMenuOpen(p => !p)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {isMenuOpen && (
            <div className="mobile-menu__dropdown">
              <nav className="mobile-menu__nav">
                {links.map(({ to, label }) => (
                  <NavLink key={to} to={to} className={({ isActive }) => `mobile-menu__link ${isActive ? 'is-active' : ''}`}>
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ForumNavbar;
