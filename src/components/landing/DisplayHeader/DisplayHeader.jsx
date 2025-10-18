import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { Logo } from '../../common/Misc/SVGComponents';
import './DisplayHeader.css';

const DisplayHeader = ({ activeItem }) => {
  const navRef = useRef(null);
  const location = useLocation();

  const navLinks = useMemo(
    () => [
      { label: 'Home', to: '/', match: () => location.pathname === '/' },
      { label: 'Forum', to: '/forum/threads', match: () => location.pathname.startsWith('/forum') },
      { label: 'Terms', to: '/terms', match: () => location.pathname === '/terms' },
      { label: 'Sign In', to: '/auth/login', match: () => location.pathname.startsWith('/auth') }
    ],
    [location.pathname]
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

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo" aria-label="SDG Forum home">
          <Logo />
        </Link>

        <div className="nav-cta-group">
          <nav className="landing-nav-items" ref={navRef}>
            {navLinks.map(link => (
              <Link
                key={link.label}
                className={`nav-link ${link.match() || (link.to === '/' && activeItem === 'home') || (link.to === '/showcase' && activeItem === 'showcase') ? 'active-link' : ''}`}
                to={link.to}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default DisplayHeader;
