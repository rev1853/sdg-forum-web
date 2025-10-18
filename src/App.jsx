import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

import { forceChakraDarkTheme } from './utils/utils';

import DisplayHeader from './components/landing/DisplayHeader/DisplayHeader';
import LandingPage from './pages/LandingPage';
import ShowcasePage from './pages/ShowcasePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ForumThreadsPage from './pages/forum/ForumThreadsPage';
import ForumChatPage from './pages/forum/ForumChatPage';
import CreateThreadPage from './pages/forum/CreateThreadPage';
import TermsPage from './pages/TermsPage';

const HeaderManager = () => {
  const location = useLocation();

  const hideDisplayHeader =
    location.pathname.startsWith('/auth') ||
    location.pathname.startsWith('/forum') ||
    location.pathname === '/terms';

  const getActiveItem = () => {
    if (location.pathname === '/') return 'home';
    if (location.pathname === '/showcase') return 'showcase';
    return null;
  };

  return (
    <>
      {!hideDisplayHeader && <DisplayHeader activeItem={getActiveItem()} />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/showcase" element={<ShowcasePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/forum/threads" element={<ForumThreadsPage />} />
        <Route path="/forum/chat" element={<ForumChatPage />} />
        <Route path="/forum/create" element={<CreateThreadPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Routes>
    </>
  );
};

export default function App() {
  useEffect(() => {
    forceChakraDarkTheme();
  }, []);

  return (
    <Router>
      <HeaderManager />
    </Router>
  );
}
