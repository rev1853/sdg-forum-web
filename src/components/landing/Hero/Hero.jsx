import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import SplitText from '../../../content/TextAnimations/SplitText/SplitText';
import landingBlur from '../../../assets/svg/landing-blur.svg';
import { GoArrowRight } from 'react-icons/go';

const HERO_CTA_LINKS = [
  {
    label: 'Browse Forum Threads',
    to: '/forum/threads'
  },
  {
    label: 'Jump into Live Chat',
    to: '/forum/chat'
  },
  {
    label: 'Create Your Account',
    to: '/auth/register'
  }
];

const ResponsiveSplitText = ({ isMobile, text, ...rest }) =>
  isMobile ? <span className={rest.className}>{text}</span> : <SplitText text={text} {...rest} />;

const Hero = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth <= 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return (
    <div className="landing-content">
      <img
        src={landingBlur}
        alt=""
        aria-hidden="true"
        className="landing-gradient-blur"
        draggable="false"
        style={{ zIndex: 5 }}
      />

      <img
        src={landingBlur}
        alt=""
        aria-hidden="true"
        className="landing-gradient-blur"
        draggable="false"
        style={{ zIndex: 5 }}
      />

      <div className="hero-main-content">
        <h1 className="landing-title">
          <ResponsiveSplitText
            isMobile={isMobile}
            text="SDGs Forum"
            className="hero-split"
            splitType="chars"
            delay={30}
            duration={2}
            ease="elastic.out(0.5, 0.3)"
          />
          <br />
          <ResponsiveSplitText
            isMobile={isMobile}
            text="Sustainable Development Goals Forum"
            className="hero-split"
            splitType="chars"
            delay={30}
            duration={2}
            ease="elastic.out(0.5, 0.3)"
          />
        </h1>

        <ResponsiveSplitText
          isMobile={isMobile}
          className="landing-subtitle"
          splitType="words"
          delay={25}
          duration={1}
          text="Join a global forum where students, researchers, policy-makers, NGOs, creators, and citizens co-create solutions for a fairer, greener future."
        />

        <div className="hero-cta-group">
          <nav className="landing-nav-items hero-cta-nav">
            {HERO_CTA_LINKS.map(link => (
              <Link key={link.label} to={link.to} className="nav-link hero-nav-link">
                <span>{link.label}</span>
                <GoArrowRight aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Hero;
