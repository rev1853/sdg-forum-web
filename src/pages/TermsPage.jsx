import { useEffect } from 'react';
import ForumNavbar from '../components/forum/ForumNavbar';

const sections = [
  {
    heading: '1. Purpose of the SDG Forum',
    body: 'This space connects practitioners, researchers, and partners accelerating Sustainable Development Goals. Content should focus on sharing impact, asking for support, or offering collaboration.'
  },
  {
    heading: '2. Member responsibilities',
    body: 'Stay respectful, honor confidentiality agreements, and back claims with evidence where possible. Sensitive data requires consent before sharing. Moderators may remove harmful or misleading content.'
  },
  {
    heading: '3. Content ownership',
    body: 'You retain the rights to content you publish. By posting, you grant the community a license to discuss, remix learnings, and reference your work with proper attribution.'
  },
  {
    heading: '4. Safe collaboration',
    body: 'Use direct messages to exchange private information. Verify partners before committing resources. Flag suspicious activity so moderators can step in quickly.'
  },
  {
    heading: '5. Updates',
    body: 'We iterate on these terms as the forum evolves. Major updates will be announced in the forum news feed and via email.'
  }
];

const TermsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="themed-page forum-page">
      <title>Terms & Conditions • SDG Forum</title>
      <ForumNavbar />

      <div className="terms-wrapper">
        <header className="terms-hero">
          <span className="badge">Community first</span>
          <h1>Terms & Conditions</h1>
          <p>
            These guidelines keep the SDG Forum collaborative, equitable, and safe. By using the platform you agree to the
            following terms. Reach out to the moderation team if you have questions.
          </p>
        </header>

        <div className="terms-grid">
          {sections.map(section => (
            <article key={section.heading} className="terms-card">
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </div>

        <footer className="terms-footer">
          <p>Last updated • September 2024</p>
          <p>
            Need clarification? Email <a href="mailto:hello@sdgforum.org">hello@sdgforum.org</a> or start a private thread
            with our moderators.
          </p>
        </footer>
      </div>
    </section>
  );
};

export default TermsPage;
