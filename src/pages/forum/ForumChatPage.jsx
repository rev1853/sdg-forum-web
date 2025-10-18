import { useEffect, useState } from 'react';
import ForumNavbar from '../../components/forum/ForumNavbar';

const forumRooms = [
  { id: 'global', title: 'Global Announcements', description: 'Platform updates and community-wide news.' },
  { id: 'goal-3', title: 'SDG 3 · Health + Well-being', description: 'Healthcare delivery, nutrition, mental health initiatives.' },
  { id: 'goal-6', title: 'SDG 6 · Clean Water', description: 'Water purification, sanitation systems, watershed protection.' },
  { id: 'goal-11', title: 'SDG 11 · Sustainable Cities', description: 'Urban planning, housing access, resilient infrastructure.' }
];

const messageSeeds = {
  global: [
    { id: 1, author: 'Moderator', timestamp: '08:24', content: 'Welcome to the live chat! Share quick updates and link to your threads for deeper dives.' },
    { id: 2, author: 'Zahra', timestamp: '08:27', content: 'We just published a new guide for inclusive co-design workshops. Feedback welcome.' }
  ],
  'goal-3': [
    { id: 1, author: 'Dr. Lina', timestamp: '07:55', content: 'Cold chain pilot reached 16 clinics this week. Solar units are holding temperature in rainy season.' },
    { id: 2, author: 'Santi', timestamp: '08:03', content: 'Sharing WHO data set updates for those syncing weekly dashboards.' }
  ],
  'goal-6': [
    { id: 1, author: 'Abena', timestamp: '09:10', content: 'We have spare capacity on our filtration units. DM if your community needs a shipment.' },
    { id: 2, author: 'Elisa', timestamp: '09:22', content: 'Does anyone have sample policies for community-led maintenance funding?' }
  ],
  'goal-11': [
    { id: 1, author: 'Ravi', timestamp: '10:01', content: 'Modular micro-housing prototypes are ready for review. Looking for testers in coastal regions.' }
  ]
};

const ForumChatPage = () => {
  const [activeRoom, setActiveRoom] = useState(forumRooms[0]);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(messageSeeds[forumRooms[0].id]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setMessages(messageSeeds[activeRoom.id]);
  }, [activeRoom]);

  return (
    <section className="themed-page forum-page">
      <title>Forum Chat • SDG Forum</title>
      <ForumNavbar />

      <div className="forum-layout chat-layout">
        <aside className="forum-sidebar">
          <div className="sidebar-card">
            <h2>Forum rooms</h2>
            <p>Drop in for real-time updates, resource swaps, and quick coordination.</p>

            <ul className="chat-room-list">
              {forumRooms.map(room => (
                <li key={room.id} className={room.id === activeRoom.id ? 'is-active' : ''}>
                  <button type="button" onClick={() => setActiveRoom(room)}>
                    <strong>{room.title}</strong>
                    <span>{room.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="chat-main">
          <header className="chat-header">
            <div>
              <h2>{activeRoom.title}</h2>
              <p>{activeRoom.description}</p>
            </div>
            <span className="chat-meta">Live now</span>
          </header>

          <div className="chat-stream">
            {messages.map(message => (
              <div key={message.id} className="chat-message">
                <div className="chat-message__meta">
                  <span className="author">{message.author}</span>
                  <span className="timestamp">{message.timestamp}</span>
                </div>
                <p>{message.content}</p>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="empty-state">
                <h3>No messages yet</h3>
                <p>Start the conversation and invite collaborators from your thread.</p>
              </div>
            )}
          </div>

          <form
            className="chat-composer"
            onSubmit={event => {
              event.preventDefault();
              if (!draft.trim()) return;
              setMessages(prev => [
                ...prev,
                {
                  id: prev.length + 1,
                  author: 'You',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  content: draft.trim()
                }
              ]);
              setDraft('');
            }}
          >
            <textarea
              placeholder="Share a quick update, resource, or question"
              value={draft}
              onChange={event => setDraft(event.target.value)}
            />
            <button type="submit" className="primary-button">
              Send
            </button>
          </form>
        </main>
      </div>
    </section>
  );
};

export default ForumChatPage;
