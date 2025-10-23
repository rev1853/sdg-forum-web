import { useEffect, useMemo, useState } from 'react';
import './Testimonials.css';

const API_DOCS_URL = 'https://sdg-forum-api.truesurvi4.xyz/docs.json';
const TOP_THREADS_URL = 'https://sdg-forum-api.truesurvi4.xyz/dashboard/top-threads';
const THREAD_ROUTE_BASE = '/forum/threads';

const createFallbackAvatar = (seed) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=4C1D95,1E3A8A&fontWeight=700`;

const FALLBACK_TWEETS = [
  {
    id: 1,
    avatar: createFallbackAvatar('SDGActionLab'),
    text: '“Building a shared forum for SDG innovators is such a smart move. Love how it centres real community stories.”',
    handle: '@SDGActionLab',
    url: 'https://sdg-forum.truesurvi4.xyz/forum/threads',
  },
  {
    id: 2,
    avatar: createFallbackAvatar('UrbanFutures'),
    text: '“Dashboard metrics + discussion threads in one place means we can finally show impact as it happens.”',
    handle: '@UrbanFutures',
    url: 'https://sdg-forum.truesurvi4.xyz/forum/threads',
  },
  {
    id: 3,
    avatar: createFallbackAvatar('GreenBridge'),
    text: '“The live chat makes it so easy to get folks aligned before we draft proposals. Huge time saver.”',
    handle: '@GreenBridge',
    url: 'https://sdg-forum.truesurvi4.xyz/forum/chat',
  },
  {
    id: 4,
    avatar: createFallbackAvatar('ImpactStacks'),
    text: '“Walking through the case-study library feels like tapping the world’s collective brain trust.”',
    handle: '@ImpactStacks',
    url: 'https://sdg-forum.truesurvi4.xyz/forum/threads',
  },
  {
    id: 5,
    avatar: createFallbackAvatar('CivicSignal'),
    text: '“It’s rare to see civic tech feel this polished. Students and mayors in one place? Yes please.”',
    handle: '@CivicSignal',
    url: 'https://sdg-forum.truesurvi4.xyz/forum/threads',
  },
  {
    id: 6,
    avatar: createFallbackAvatar('DIYDevs'),
    text: '“Joining SDG Forum gave our team a head start finding partners for clean water pilots.”',
    handle: '@DIYDevs',
    url: 'https://sdg-forum.truesurvi4.xyz/forum/threads',
  },
  {
    id: 7,
    avatar: createFallbackAvatar('GibsonSMurray'),
    text: '“The interface feels handcrafted, and the community energy is real.”',
    handle: '@GibsonSMurray',
    url: 'https://sdg-forum.truesurvi4.xyz/forum/threads',
  },
  {
    id: 8,
    avatar: createFallbackAvatar('irohandev'),
    text: '“We surfaced three new research partners in the first week. Nothing else has done that.”',
    handle: '@irohandev',
    url: 'https://sdg-forum.truesurvi4.xyz/forum/threads',
  },
  {
    id: 9,
    avatar: createFallbackAvatar('Alishahzad2000M'),
    text: '“Tracking weekly stats alongside conversations keeps our coalition truly accountable.”',
    handle: '@Alishahzad2000M',
    url: 'https://sdg-forum.truesurvi4.xyz/forum/threads',
  },
];

const pickAuthorHandle = (thread) => {
  const username = thread?.author?.username ?? thread?.author_username ?? thread?.author_handle;
  if (username) return `@${username}`;
  const name = thread?.author?.name ?? thread?.author_name;
  if (name) return name;
  return 'SDG Forum';
};

const normaliseText = (thread) => {
  const source = thread?.title ?? thread?.summary ?? thread?.body ?? '';
  const cleaned = typeof source === 'string' ? source.replace(/\s+/g, ' ').trim() : '';
  if (!cleaned) return 'Explore this top-performing SDG Forum conversation.';
  if (cleaned.length <= 160) return cleaned;
  return `${cleaned.slice(0, 157)}…`;
};

const resolveAvatar = (thread) => {
  const author = thread?.author ?? {};
  const candidates = [
    author.profilePicture,
    author.profile_picture,
    author.avatar,
    author.photo,
    author.image,
  ].filter((value) => typeof value === 'string' && value.trim().length > 0);

  for (const candidate of candidates) {
    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }
    if (candidate.startsWith('//')) {
      return `https:${candidate}`;
    }
    return `https://sdg-forum-api.truesurvi4.xyz/${candidate.replace(/^\/+/, '')}`;
  }

  const seed = author.name ?? author.username ?? `Thread ${thread?.id ?? ''}`;
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`;
};

const mapThreadToCard = (thread, index) => {
  if (!thread || typeof thread !== 'object') return null;
  const identifier = thread.id ?? thread.thread_id ?? `thread-${index}`;
  const url = `${THREAD_ROUTE_BASE}/${encodeURIComponent(thread.id ?? identifier)}`;
  return {
    id: identifier,
    avatar: resolveAvatar(thread),
    text: normaliseText(thread),
    handle: pickAuthorHandle(thread),
    url,
  };
};

const Testimonials = () => {
  const [docsInfo, setDocsInfo] = useState(null);
  const [testimonials, setTestimonials] = useState(FALLBACK_TWEETS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLiveData, setIsLiveData] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [docsResponse, threadsResponse] = await Promise.allSettled([
          fetch(API_DOCS_URL, { headers: { Accept: 'application/json' } }),
          fetch(TOP_THREADS_URL, { headers: { Accept: 'application/json' } }),
        ]);

        if (!cancelled) {
          if (docsResponse.status === 'fulfilled' && docsResponse.value.ok) {
            const docsJson = await docsResponse.value.json();
            setDocsInfo(docsJson?.info ?? null);
          }

          if (threadsResponse.status === 'fulfilled' && threadsResponse.value.ok) {
            const threadsJson = await threadsResponse.value.json();
            const collection =
              (Array.isArray(threadsJson?.data) && threadsJson.data) ||
              (Array.isArray(threadsJson?.threads) && threadsJson.threads) ||
              [];

            const mapped = collection
              .map(mapThreadToCard)
              .filter(Boolean)
              .slice(0, 9);

            if (mapped.length > 0) {
              setTestimonials(mapped);
              setIsLiveData(true);
            } else {
              setTestimonials(FALLBACK_TWEETS);
              setIsLiveData(false);
            }
          } else if (threadsResponse.status === 'fulfilled' && !threadsResponse.value.ok) {
            setTestimonials(FALLBACK_TWEETS);
            setIsLiveData(false);
          }

          if (
            (docsResponse.status === 'rejected' || (docsResponse.value && !docsResponse.value.ok)) &&
            (threadsResponse.status === 'rejected' || (threadsResponse.value && !threadsResponse.value.ok))
          ) {
            setError('Unable to reach the SDG Forum API right now. Showing community highlights instead.');
          } else if (
            threadsResponse.status === 'rejected' ||
            (threadsResponse.status === 'fulfilled' && !threadsResponse.value.ok)
          ) {
            setError('Top thread metrics are temporarily unavailable. Showing highlights instead.');
          }
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : 'Unexpected error while connecting to the API.');
          setTestimonials(FALLBACK_TWEETS);
          setIsLiveData(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  const marqueeRows = useMemo(() => {
    if (!Array.isArray(testimonials)) return [];
    if (testimonials.length <= 3) return [testimonials];

    const chunkSize = Math.ceil(testimonials.length / 3);
    const rows = [
      testimonials.slice(0, chunkSize),
      testimonials.slice(chunkSize, chunkSize * 2),
      testimonials.slice(chunkSize * 2),
    ].filter((row) => row.length > 0);

    return rows.length > 0 ? rows : [testimonials];
  }, [testimonials]);

  return (
    <section className="testimonials-section">
      <div className="testimonials-container">
        <div className="testimonials-header">
          <h3 className="testimonials-title">Loved by SDG builders worldwide</h3>
          <p className="testimonials-subtitle">
            {isLiveData
              ? 'Trending community threads from the SDG Forum API.'
              : 'Community highlights while we reconnect to the SDG Forum API.'}
          </p>
          <div className="testimonials-source">
            {docsInfo ? (
              <span>
                Connected to <strong>{docsInfo?.title ?? 'SDG Forum API'}</strong> (v{docsInfo?.version ?? '—'}) •{' '}
                <a href={API_DOCS_URL} target="_blank" rel="noreferrer">
                  docs.json
                </a>
              </span>
            ) : (
              <span>
                {isLoading ? 'Connecting to ' : 'Last checked '}
                <code className="testimonials-endpoint">sdg-forum-api.truesurvi4.xyz</code>
              </span>
            )}
          </div>
        </div>

        {error ? (
          <div className="testimonials-alert" role="status">
            {error}
          </div>
        ) : null}

        <div className="testimonials-marquee-container">
          {marqueeRows.map((row, index) => (
            <MarqueeRow
              key={`testimonial-row-${index}`}
              tweets={row}
              direction={index % 2 === 0 ? 'left' : 'right'}
              speed={Math.max(24, 38 - index * 3)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const TweetCard = ({ tweet }) => (
  <div
    className="testimonial-card"
    onClick={() => window.open(tweet.url, '_blank')}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        window.open(tweet.url, '_blank');
      }
    }}
    role="link"
    tabIndex={0}
  >
    <div className="testimonial-content">
      <p className="testimonial-text">{tweet.text}</p>
      <div className="testimonial-author">
        <img src={tweet.avatar} alt="" aria-hidden="true" className="testimonial-avatar" />
        <span className="testimonial-handle">{tweet.handle}</span>
      </div>
    </div>
  </div>
);

const MarqueeRow = ({ tweets, direction = 'left', speed = 30 }) => {
  const duplicatedTweets = [...tweets, ...tweets, ...tweets, ...tweets];

  return (
    <div className="testimonial-row">
      <div className={`testimonial-marquee testimonial-marquee-${direction}`} style={{ '--speed': `${speed}s` }}>
        {duplicatedTweets.map((tweet, index) => (
          <TweetCard key={`${tweet.id}-${index}`} tweet={tweet} />
        ))}
      </div>
    </div>
  );
};

export default Testimonials;
