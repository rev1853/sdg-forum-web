import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiHome, FiMessageSquare, FiMenu, FiX, FiLogOut, FiUser, FiChevronDown } from 'react-icons/fi';
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
    { to: '/forum/threads', label: 'Threads', icon: FiHome },
    { to: '/forum/chat', label: 'Live Chat', icon: FiMessageSquare },
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
          <button
            className="top-navbar__toggle md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
          <Link to="/" className="top-navbar__brand">
            <span className="brand-accent">SDG</span> Forum
          </Link>
          <nav className="top-navbar__nav hidden md:flex">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `top-navbar__link ${isActive ? 'is-active' : ''}`}>
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="top-navbar__mobile-menu md:hidden">
            <nav className="flex flex-col gap-2 p-4">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `top-navbar__link ${isActive ? 'is-active' : ''}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        <div className="top-navbar__right">
          <Link to="/forum/create" className="primary-button">
            Create Thread
          </Link>
          {user ? (
            <div className="profile-menu">
              <button
                ref={profileTriggerRef}
                type="button"
                className={`profile-menu__trigger ${isProfileMenuOpen ? 'is-active' : ''}`}
                onClick={() => setIsProfileMenuOpen(p => !p)}
              >
                {renderAvatar()}
                <FiChevronDown className={`profile-menu__chevron ${isProfileMenuOpen ? 'is-rotated' : ''}`} />
              </button>

              {isProfileMenuOpen && (
                <div ref={profileMenuRef} className="profile-menu__dropdown">
                  <div className="profile-menu__header">
                    <div className="profile-menu__user-info">
                      <span className="profile-menu__user-name">{user.name}</span>
                      {profileHandle && <span className="profile-menu__user-username">{profileHandle}</span>}
                    </div>
                  </div>

                  <div className="profile-menu__divider" />

                  <nav className="profile-menu__nav">
                    <Link
                      to="/profile"
                      className="profile-menu__item"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <FiUser className="profile-menu__icon" />
                      <span>Profile</span>
                    </Link>

                    <button
                      onClick={handleSignOut}
                      className="profile-menu__item profile-menu__item--danger"
                    >
                      <FiLogOut className="profile-menu__icon" />
                      <span>Sign Out</span>
                    </button>
                  </nav>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth/login" className="ghost-button">
              Sign In
            </Link>
          )}
        </div>


      </div>
    </header>
  );
};

export default ForumNavbar;
