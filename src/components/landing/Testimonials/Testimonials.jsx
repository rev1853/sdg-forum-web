import './Testimonials.css';

const Testimonials = () => {
  const tweets = [
    {
      id: 1,
      avatar: 'https://pbs.twimg.com/profile_images/1794450494686932992/wqRqF4dt_400x400.jpg',
      text: 'Really impressed by https://reactbits.dev. Check it out. The Splash Cursor effect is amazing.',
      handle: '@makwanadeepam',
      url: 'https://x.com/makwanadeepam/status/1879416558461890864'
    },
    {
      id: 2,
      avatar: 'https://pbs.twimg.com/profile_images/1918646280223608832/nqBF4zh__400x400.jpg',
      text: 'Just discovered http://reactbits.dev — a sleek, minimal, and super dev-friendly React component library. Clean UI, easy to use, and perfect for modern projects.',
      handle: '@syskey_dmg',
      url: 'https://x.com/syskey_dmg/status/1929762648922398754'
    },
    {
      id: 3,
      avatar: 'https://pbs.twimg.com/profile_images/1593304942210478080/TUYae5z7_400x400.jpg',
      text: 'Everything about this is next level: the components, the registry, dynamic items.',
      handle: '@shadcn',
      url: 'https://x.com/shadcn/status/1962854085587275932'
    },
    {
      id: 4,
      avatar: 'https://pbs.twimg.com/profile_images/1722358890807861248/75S7CB3G_400x400.jpg',
      text: 'React Bits: A stellar collection of React components to make your landing pages shine ✨',
      handle: '@gregberge_',
      url: 'https://x.com/gregberge_/status/1896425347866059041'
    },
    {
      id: 5,
      avatar: 'https://pbs.twimg.com/profile_images/1554006663853592576/Gxtolzbo_400x400.jpg',
      text: 'Literally the coolest react library in react -',
      handle: '@Logreg_n_coffee',
      url: 'https://x.com/Logreg_n_coffee/status/1889573533425991992'
    },
    {
      id: 6,
      avatar: 'https://pbs.twimg.com/profile_images/1880284612062056448/4Y2C8Xnv_400x400.jpg',
      text: 'Have you heard of react bits? David Haz has lovingly put together a collection of animated and fully customizable React components.',
      handle: '@DIYDevs',
      url: 'https://x.com/DIYDevs/status/1892964440900763761'
    },
    {
      id: 7,
      avatar: 'https://pbs.twimg.com/profile_images/1724192049002340352/-tood-4D_400x400.jpg',
      text: 'React Bits has got to be the most artistic ui component lib I have seen in a while 🤌',
      handle: '@GibsonSMurray',
      url: 'https://x.com/GibsonSMurray/status/1889909058838339626'
    },
    {
      id: 8,
      avatar: 'https://pbs.twimg.com/profile_images/1920165535351742464/CJU2uWMU_400x400.jpg',
      text: 'Was scrolling X, I saw a post regarding UI library and got to know about React Bits and its just wow, the components are incredibly well designed! Really loved the overall feel and quality.',
      handle: '@irohandev',
      url: 'https://x.com/irohandev/status/1934877463064268822'
    },
    {
      id: 9,
      avatar: 'https://pbs.twimg.com/profile_images/1915754015381483520/07SpEJWa_400x400.jpg',
      text: 'Today, I explored React Bit Animation, a lightweight library to add beautiful animations to your React apps! It`s super easy to use and helps make UIs feel much more dynamic and interactive ✨',
      handle: '@Alishahzad2000M',
      url: 'https://x.com/Alishahzad2000M/status/1916556455232127010'
    }
  ];

  const row1Tweets = tweets.slice(0, 3);
  const row2Tweets = tweets.slice(3, 6);
  const row3Tweets = tweets.slice(6, 9);

  const TweetCard = ({ tweet }) => (
    <div className="testimonial-card" onClick={() => window.open(tweet.url, '_blank')}>
      <div className="testimonial-content">
        <p className="testimonial-text">{tweet.text}</p>
        <div className="testimonial-author">
          <img src={tweet.avatar} alt="Avatar" className="testimonial-avatar" />
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

  return (
    <section className="testimonials-section">
      <div className="testimonials-container">
        <div className="testimonials-header">
          <h3 className="testimonials-title">What You Can Do Here</h3>
          <p className="testimonials-subtitle">
            <ul>Post a Challenge – Describe a local issue. Ask for advice, partners, or data.</ul>
            <ul>Share What Works – Publish case studies, toolkits, code, or policy drafts.</ul>
            <ul>Team Up – Find collaborators by skill, location, or SDG focus.</ul>
            <ul>Measure Impact – Track progress with community-made indicators.</ul></p>
        </div>

        <div className="testimonials-marquee-container">
          <MarqueeRow tweets={row1Tweets} direction="left" speed={40} />
          <MarqueeRow tweets={row2Tweets} direction="right" speed={35} />
          <MarqueeRow tweets={row3Tweets} direction="left" speed={45} />
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
