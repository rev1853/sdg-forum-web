import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [remember, setRemember] = useState(false);
  const [formState, setFormState] = useState({ identifier: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = event => {
    const { name, value } = event.target;
    setFormState(current => ({ ...current, [name]: value }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (!formState.identifier || !formState.password) return;

    setIsSubmitting(true);
    setError('');

    try {
      await login({
        identifier: formState.identifier.trim(),
        password: formState.password,
      });
      navigate('/');
    } catch (caughtError) {
      const apiMessage =
        caughtError?.data?.message ||
        caughtError?.data?.error ||
        caughtError?.message ||
        'We could not sign you in. Please check your details and try again.';
      setError(apiMessage);
    } finally {
      setIsSubmitting(false);
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
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="identifier">Email or username</label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            placeholder="name@example.com"
            value={formState.identifier}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formState.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-inline">
          <label className="checkbox">
            <input type="checkbox" checked={remember} onChange={() => setRemember(!remember)} />
            Remember me
          </label>
          <Link to="/auth/reset-password">Need help?</Link>
        </div>

        {error ? <span className="form-error">{error}</span> : null}

        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
