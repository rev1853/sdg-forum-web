import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import './FeatureCards.css';
import CountUp from '../../../content/TextAnimations/CountUp/CountUp';

const API_DOCS_URL = 'https://sdg-forum-api.truesurvi4.xyz/docs.json';
const DASHBOARD_STATS_URL = 'https://sdg-forum-api.truesurvi4.xyz/dashboard/stats/threads-weekly';

const FALLBACK_DOCS_INFO = {
  title: 'SDG Threads API',
  description: 'API documentation for the SDG-themed discussion platform.',
  version: '1.0.0',
};

const FALLBACK_METRICS = {
  pathCount: 17,
  operationCount: 22,
  tagCount: 7,
  totalThreads: 110,
  totalReplies: 150,
  totalInteractions: 2000,
  since: null,
};

const OPERATION_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

const extractDocsMetrics = (docsJson) => {
  if (!docsJson || typeof docsJson !== 'object') return null;
  const paths = docsJson.paths;
  if (!paths || typeof paths !== 'object') return null;

  let pathCount = 0;
  let operationCount = 0;
  const tagSet = new Set();

  Object.keys(paths).forEach((pathKey) => {
    const pathItem = paths[pathKey];
    if (!pathItem || typeof pathItem !== 'object') return;
    pathCount += 1;

    Object.entries(pathItem).forEach(([method, operation]) => {
      const methodKey = typeof method === 'string' ? method.toLowerCase() : '';
      if (!OPERATION_METHODS.has(methodKey)) return;
      operationCount += 1;
      if (operation && typeof operation === 'object' && Array.isArray(operation.tags)) {
        operation.tags
          .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
          .forEach((tag) => tagSet.add(tag.trim()));
      }
    });
  });

  return {
    info: docsJson.info && typeof docsJson.info === 'object' ? docsJson.info : null,
    pathCount,
    operationCount,
    tagCount: tagSet.size,
  };
};

const ParticleCard = ({ children, className = '', disableAnimations = false }) => {
  const cardRef = useRef(null);
  const particlesRef = useRef([]);
  const timeoutsRef = useRef([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef([]);
  const particlesInit = useRef(false);

  const createParticle = useCallback((x, y) => {
    const el = document.createElement('div');
    el.className = 'particle';
    el.style.cssText = `
      position:absolute;width:4px;height:4px;border-radius:50%;
      background:rgba(132,0,255,1);box-shadow:0 0 6px rgba(132,0,255,.6);
      pointer-events:none;z-index:100;left:${x}px;top:${y}px;
    `;
    return el;
  }, []);

  const memoizeParticles = useCallback(() => {
    if (particlesInit.current || !cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    Array.from({ length: 12 }).forEach(() => {
      memoizedParticles.current.push(createParticle(Math.random() * width, Math.random() * height));
    });
    particlesInit.current = true;
  }, [createParticle]);

  const clearParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    particlesRef.current.forEach(p =>
      gsap.to(p, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => p.parentNode && p.parentNode.removeChild(p)
      })
    );
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;
    if (!particlesInit.current) memoizeParticles();

    memoizedParticles.current.forEach((particle, i) => {
      const id = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;
        const clone = particle.cloneNode(true);
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.set(clone, { scale: 0, opacity: 0 });
        gsap.to(clone, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });
        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: 'none',
          repeat: -1,
          yoyo: true
        });
        gsap.to(clone, { opacity: 0.3, duration: 1.5, ease: 'power2.inOut', repeat: -1, yoyo: true });
      }, i * 100);
      timeoutsRef.current.push(id);
    });
  }, [memoizeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;

    const handleIn = () => {
      isHoveredRef.current = true;
      animateParticles();
    };
    const handleOut = () => {
      isHoveredRef.current = false;
      clearParticles();
    };

    const node = cardRef.current;
    node.addEventListener('mouseenter', handleIn);
    node.addEventListener('mouseleave', handleOut);
    return () => {
      isHoveredRef.current = false;
      node.removeEventListener('mouseenter', handleIn);
      node.removeEventListener('mouseleave', handleOut);
      clearParticles();
    };
  }, [animateParticles, clearParticles, disableAnimations]);

  return (
    <div
      ref={cardRef}
      className={`${className} particle-container`}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {children}
    </div>
  );
};

const GlobalSpotlight = ({ gridRef, disableAnimations = false }) => {
  const spotlightRef = useRef(null);
  const isInsideSectionRef = useRef(false);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText = `
      position:fixed;width:800px;height:800px;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle,rgba(132,0,255,.15) 0%,rgba(132,0,255,.08) 15%,
      rgba(132,0,255,.04) 25%,rgba(132,0,255,.02) 40%,rgba(132,0,255,.01) 65%,transparent 70%);
      z-index:200;opacity:0;transform:translate(-50%,-50%);mix-blend-mode:screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const move = e => {
      if (!spotlightRef.current || !gridRef.current) return;
      const section = gridRef.current.closest('.features-section');
      const rect = section?.getBoundingClientRect();
      const inside =
        rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      isInsideSectionRef.current = inside;
      const cards = gridRef.current.querySelectorAll('.feature-card');

      if (!inside) {
        gsap.to(spotlightRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' });
        cards.forEach(card => card.style.setProperty('--glow-intensity', '0'));
        return;
      }

      let minDist = Infinity;
      const prox = 100,
        fade = 150;
      cards.forEach(card => {
        const r = card.getBoundingClientRect(),
          cx = r.left + r.width / 2,
          cy = r.top + r.height / 2,
          d = Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(r.width, r.height) / 2,
          ed = Math.max(0, d);
        minDist = Math.min(minDist, ed);

        const rx = ((e.clientX - r.left) / r.width) * 100,
          ry = ((e.clientY - r.top) / r.height) * 100;
        let glow = 0;
        if (ed <= prox) glow = 1;
        else if (ed <= fade) glow = (fade - ed) / (fade - prox);
        card.style.setProperty('--glow-x', `${rx}%`);
        card.style.setProperty('--glow-y', `${ry}%`);
        card.style.setProperty('--glow-intensity', glow);
      });

      gsap.to(spotlightRef.current, { left: e.clientX, top: e.clientY, duration: 0.1, ease: 'power2.out' });
      const target = minDist <= prox ? 0.8 : minDist <= fade ? ((fade - minDist) / (fade - prox)) * 0.8 : 0;
      gsap.to(spotlightRef.current, { opacity: target, duration: target > 0 ? 0.2 : 0.5, ease: 'power2.out' });
    };

    const leave = () => {
      isInsideSectionRef.current = false;
      gridRef.current
        ?.querySelectorAll('.feature-card')
        .forEach(card => card.style.setProperty('--glow-intensity', '0'));
      gsap.to(spotlightRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' });
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', leave);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseleave', leave);
      spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
    };
  }, [gridRef, disableAnimations]);

  return null;
};

const FeatureCards = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [docsMeta, setDocsMeta] = useState(() => ({ ...FALLBACK_DOCS_INFO }));
  const [metrics, setMetrics] = useState(() => ({ ...FALLBACK_METRICS }));
  const [isLiveData, setIsLiveData] = useState(false);
  const [error, setError] = useState('');
  const gridRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchMetrics = async () => {
      const messages = [];
      let live = false;
      const docsMetaNext = { ...FALLBACK_DOCS_INFO };
      const metricsNext = { ...FALLBACK_METRICS };

      try {
        const [docsResult, statsResult] = await Promise.allSettled([
          fetch(API_DOCS_URL, { headers: { Accept: 'application/json' } }),
          fetch(DASHBOARD_STATS_URL, { headers: { Accept: 'application/json' } }),
        ]);

        if (docsResult.status === 'fulfilled') {
          if (docsResult.value.ok) {
            const docsJson = await docsResult.value.json();
            const docsMetrics = extractDocsMetrics(docsJson);
            if (docsMetrics) {
              if (docsMetrics.info && typeof docsMetrics.info === 'object') {
                Object.assign(docsMetaNext, docsMetrics.info);
              }
              if (typeof docsMetrics.pathCount === 'number' && docsMetrics.pathCount >= 0) {
                metricsNext.pathCount = docsMetrics.pathCount;
              }
              if (typeof docsMetrics.operationCount === 'number' && docsMetrics.operationCount >= 0) {
                metricsNext.operationCount = docsMetrics.operationCount;
              }
              if (typeof docsMetrics.tagCount === 'number' && docsMetrics.tagCount >= 0) {
                metricsNext.tagCount = docsMetrics.tagCount;
              }
            } else {
              messages.push('API docs responded without the expected structure. Showing cached metrics.');
            }
          } else {
            messages.push('Unable to read the SDG Forum API documentation. Showing cached metrics.');
          }
        } else {
          messages.push('Unable to reach the SDG Forum API documentation. Showing cached metrics.');
        }

        if (statsResult.status === 'fulfilled') {
          if (statsResult.value.ok) {
            const statsJson = await statsResult.value.json();
            const stats = statsJson && typeof statsJson === 'object' ? statsJson.stats : null;
            if (stats && typeof stats === 'object') {
              if (typeof stats.totalThreads === 'number') {
                metricsNext.totalThreads = stats.totalThreads;
              }
              if (typeof stats.totalReplies === 'number') {
                metricsNext.totalReplies = stats.totalReplies;
              }
              if (typeof stats.totalInteractions === 'number') {
                metricsNext.totalInteractions = stats.totalInteractions;
              }
              if (typeof stats.since === 'string') {
                metricsNext.since = stats.since;
              }
              live = true;
            } else {
              messages.push('Dashboard stats returned an unexpected shape.');
            }
          } else {
            messages.push('Dashboard metrics are temporarily unavailable. Showing cached values instead.');
          }
        } else {
          messages.push('Unable to reach dashboard metrics. Showing cached values instead.');
        }
      } catch (caughtError) {
        const fallbackMessage =
          caughtError instanceof Error
            ? caughtError.message
            : 'Unexpected error while connecting to the SDG Forum API.';
        messages.length = 0;
        messages.push(fallbackMessage);
        live = false;
      }

      if (!cancelled) {
        setDocsMeta(docsMetaNext);
        setMetrics(metricsNext);
        setIsLiveData(live);
        setError(messages.join(' '));
      }
    };

    fetchMetrics();

    return () => {
      cancelled = true;
    };
  }, []);

  const sinceLabel = useMemo(() => {
    if (!metrics.since) return 'the past 7 days';
    const parsed = Date.parse(metrics.since);
    if (Number.isNaN(parsed)) return 'the past 7 days';
    try {
      return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(parsed));
    } catch {
      return 'the past 7 days';
    }
  }, [metrics.since]);

  const docsDescription = useMemo(() => {
    const description =
      typeof docsMeta.description === 'string' && docsMeta.description.trim().length > 0
        ? docsMeta.description.trim()
        : FALLBACK_DOCS_INFO.description;
    const facets = [];
    if (typeof metrics.tagCount === 'number' && metrics.tagCount > 0) {
      facets.push(`${metrics.tagCount} feature areas`);
    }
    if (typeof metrics.pathCount === 'number' && metrics.pathCount > 0) {
      facets.push(`${metrics.pathCount} routes`);
    }
    return `${description}${facets.length ? ` (${facets.join(' • ')})` : ''}`;
  }, [docsMeta.description, metrics.tagCount, metrics.pathCount]);

  const statusClass = error
    ? 'features-status features-status--error'
    : isLiveData
      ? 'features-status features-status--live'
      : 'features-status features-status--fallback';

  const statusMessage = error
    ? error
    : isLiveData
      ? 'Live SDG Forum metrics'
      : 'Showing cached SDG Forum metrics';

  return (
    <div className="features-section">
      <div className="features-container">
        <div className={statusClass} aria-live="polite">
          <span className="features-status__dot" aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
        <GlobalSpotlight gridRef={gridRef} disableAnimations={isMobile} />

        <div className="bento-grid" ref={gridRef}>
          <ParticleCard className="feature-card card1" disableAnimations={isMobile}>
            <div className="messages-gif-wrapper">
              <img src="/assets/messages.gif" alt="Messages animation" className="messages-gif" />
            </div>
            <h2>
              {isMobile ? metrics.operationCount.toLocaleString() : <CountUp to={metrics.operationCount} separator="," />}
            </h2>
            <h3>{`SDG Threads API v${(docsMeta.version ?? FALLBACK_DOCS_INFO.version) || '1.0.0'}`}</h3>
            <p>{docsDescription}</p>
          </ParticleCard>

          <ParticleCard className="feature-card card2" disableAnimations={isMobile}>
            <div className="components-gif-wrapper">
              <img src="/assets/components.gif" alt="Components animation" className="components-gif" />
            </div>
            <h2>
              {isMobile ? metrics.totalThreads.toLocaleString() : <CountUp to={metrics.totalThreads} separator="," />}
            </h2>
            <h3>Threads created this week</h3>
            <p>{`Activity tracked since ${sinceLabel}.`}</p>
          </ParticleCard>

          <ParticleCard className="feature-card card4" disableAnimations={isMobile}>
            <div className="switch-gif-wrapper">
              <img src="/assets/switch.gif" alt="Switch animation" className="switch-gif" />
            </div>
            <h2>
              {isMobile
                ? metrics.totalInteractions.toLocaleString()
                : <CountUp to={metrics.totalInteractions} separator="," />}
            </h2>
            <h3>Community interactions logged</h3>
            <p>{`Includes ${metrics.totalReplies.toLocaleString()} replies plus reactions across the forum.`}</p>
          </ParticleCard>
        </div>
      </div>
    </div>
  );
};

export default FeatureCards;
