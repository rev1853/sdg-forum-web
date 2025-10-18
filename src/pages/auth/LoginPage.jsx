import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import { useApi, storeToken } from '@/api';

const LoginPage = () => {
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const { auth, setToken } = useApi();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const email = (formData.get('email') || '').toString().trim().toLowerCase();
    const password = (formData.get('password') || '').toString();

    if (!email || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await auth.login({
        identifier: email,
        password,
      });

      const accessToken =
        (response && typeof response === 'object' && 'token' in response
          ? response.token
          : undefined) ??
        response?.tokens?.accessToken ??
        null;

      if (!accessToken) {
        setErrorMessage('Signed in, but no access token was returned.');
        return;
      }

      setToken(accessToken);

      storeToken(remember ? accessToken : null);

      navigate('/');
    } catch (error) {
      const message =
        (error?.data && (error.data.message || error.data.error)) ||
        error?.message ||
        'Unable to sign in with the provided credentials.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

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
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="name@example.com" required />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" placeholder="••••••••" required />
        </div>

        <div className="form-inline">
          <label className="checkbox">
            <input type="checkbox" checked={remember} onChange={() => setRemember(!remember)} />
            Remember me
          </label>
          <Link to="/auth/reset-password">Need help?</Link>
        </div>

        {errorMessage ? <span className="form-error">{errorMessage}</span> : null}

        <button type="submit" className="primary-button" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
