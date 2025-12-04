import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './SdgGoalsGallery.css';
import SplitText from '../../../content/TextAnimations/SplitText/SplitText';
import sdgGoals from '../../../data/sdgGoals';

gsap.registerPlugin(ScrollTrigger);

const SdgGoalsGallery = () => {
  const sectionRef = useRef(null);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    // GSAP scroll logic removed for Masonry layout
  }, []);

  return (
    <section className="sdg-gallery-section" ref={sectionRef}>
      <div className="sdg-gallery-overlay sdg-gallery-overlay--top">
        <SplitText
          text="Every Goal, One Shared Mission"
          tag="h2"
          className="sdg-gallery-heading"
          textAlign="center"
          splitType="words"
          delay={45}
          duration={0.55}
        />
        <span className="sdg-gallery-badge">17 Global Goals</span>
      </div>

      <div className="sdg-gallery-viewport" ref={viewportRef}>
        <div className="sdg-gallery-track" ref={trackRef}>
          {sdgGoals.map((goal) => (
            <article className="sdg-gallery-card" key={goal.number} style={{ '--sdg-accent': goal.color }}>
              <header className="sdg-card-header">
                <span className="sdg-card-number">Goal {goal.number.toString().padStart(3, '0')}</span>
                <h3>{goal.title}</h3>
              </header>
              <p>{goal.description}</p>
              <Link className="sdg-card-link" to={`/forum/threads?goal=${goal.forumCategory}`}>
                Explore goal threads
              </Link>
            </article>
          ))}
        </div>
      </div>

      <div className="sdg-gallery-overlay sdg-gallery-overlay--bottom">
        <SplitText
          text="Browse the Sustainable Development Goals in one place. Each card highlights the focus of a goal so you can plan collaborations, track progress, or gather inspiration for your next initiative."
          tag="p"
          className="sdg-gallery-description"
          textAlign="center"
          splitType="words"
          delay={35}
          duration={0.45}
        />
      </div>
    </section>
  );
};

export default SdgGoalsGallery;
<div className="sdg-gallery-overlay sdg-gallery-overlay--top">
  <SplitText
    text="Every Goal, One Shared Mission"
    tag="h2"
    className="sdg-gallery-heading"
    textAlign="center"
    splitType="words"
    delay={45}
    duration={0.55}
  />
  <span className="sdg-gallery-badge">17 Global Goals</span>
</div>
