import FadeContent from '../../../content/Animations/FadeContent/FadeContent';
import ReactBitsLogo from '../../../assets/logos/react-bits-logo.svg';
import './Footer.css';
import { Link } from 'react-router-dom';

const navSections = [
  {
    title: 'Navigate',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Forum Threads', to: '/forum/threads' },
      { label: 'Live Chat', to: '/forum/chat' },
      { label: 'Create Thread', to: '/forum/create' }
    ]
  },
  {
    title: 'Community',
    links: [
      { label: 'Register', to: '/auth/register' },
      { label: 'Sign In', to: '/auth/login' },
      { label: 'Reset Password', to: '/auth/reset-password' },
      { label: 'Terms & Conditions', to: '/terms' }
    ]
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact Moderators', to: '/forum/chat' },
      { label: 'Email Us', href: 'mailto:hello@sdgforum.org' },
      { label: 'Impact Guidelines', to: '/forum/threads' },
      { label: 'Documentation', to: '/showcase' }
    ]
  }
];

const Footer = () => {
  return (
    <FadeContent blur duration={600}>
      <footer className="landing-footer">
        <div className="footer-wrapper">
          <div className="footer-brand">
            <img src={ReactBitsLogo} alt="SDG Forum" className="footer-logo" />
            <p className="footer-tagline">
              A collaboration hub for Sustainable Development Goal innovators, storytellers, and partners. Share your
              progress, gather feedback, and mobilise support worldwide.
            </p>
            <Link to="/forum/create" className="footer-cta">
              Launch a new thread
            </Link>
          </div>

          <div className="footer-grid">
            {navSections.map(section => (
              <div key={section.title} className="footer-column">
                <p className="footer-heading">{section.title}</p>
                <ul>
                  {section.links.map(link => (
                    <li key={link.label}>
                      {link.href ? (
                        <a href={link.href} className="footer-link" rel="noopener noreferrer">
                          {link.label}
                        </a>
                      ) : (
                        <Link to={link.to} className="footer-link">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} SDG Forum. Built for collective impact.</span>
          <span className="footer-contact">Need support? <a href="mailto:hello@sdgforum.org">hello@sdgforum.org</a></span>
        </div>
      </footer>
    </FadeContent>
  );
};

export default Footer;
