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
    <>
      <ForumNavbar />
      <main className="forum-layout min-h-screen bg-[var(--color-bg-primary)]">
        <title>Terms & Conditions • SDG Forum</title>

        <div className="terms-wrapper max-w-4xl mx-auto px-6 py-12">
          <header className="terms-hero mb-12 text-center">
            <span className="badge inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-4">Community first</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">Terms & Conditions</h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              These guidelines keep the SDG Forum collaborative, equitable, and safe. By using the platform you agree to the
              following terms. Reach out to the moderation team if you have questions.
            </p>
          </header>

          <div className="terms-grid grid gap-8">
            {sections.map(section => (
              <article key={section.heading} className="terms-card p-6 rounded-2xl bg-gray-800/50 border border-gray-700/50">
                <h2 className="text-xl font-semibold text-white mb-3">{section.heading}</h2>
                <p className="text-gray-300 leading-relaxed">{section.body}</p>
              </article>
            ))}
          </div>

          <footer className="terms-footer mt-16 pt-8 border-t border-gray-800 text-center text-gray-500">
            <p className="mb-2">Last updated • September 2024</p>
            <p>
              Need clarification? Email <a href="mailto:hello@sdgforum.org" className="text-blue-400 hover:text-blue-300 transition-colors">hello@sdgforum.org</a> or start a private thread
              with our moderators.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
};

export default TermsPage;
