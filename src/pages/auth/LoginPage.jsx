import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';

const LoginPage = () => {
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Log in to pick up the conversations, follow SDG threads, and keep your impact moving."
      footerLinks={[
        { label: 'Create an account', to: '/auth/register' },
        { label: 'Forgot your password?', to: '/auth/reset-password' }
      ]}
    >
      <form
        className="auth-form"
        onSubmit={event => {
          event.preventDefault();
        }}
      >
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" placeholder="name@example.com" required />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" placeholder="••••••••" required />
        </div>

        <div className="form-inline">
          <label className="checkbox">
            <input type="checkbox" checked={remember} onChange={() => setRemember(!remember)} />
            Remember me
          </label>
          <Link to="/auth/reset-password">Need help?</Link>
        </div>

        <button type="submit" className="primary-button">
          Sign in
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
