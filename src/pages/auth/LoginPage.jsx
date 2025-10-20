import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import AuthLayout from '../../components/auth/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { GOOGLE_OAUTH_CONFIG } from '@/config/google';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [remember, setRemember] = useState(false);
  const [formState, setFormState] = useState({ identifier: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(
    () => typeof window !== 'undefined' && Boolean(window.google?.accounts?.id)
  );
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.google?.accounts?.id) {
      setIsGoogleReady(true);
      return;
    }

    let isCancelled = false;

    const handleScriptLoad = () => {
      if (!isCancelled) {
        setIsGoogleReady(true);
      }
    };

    const handleScriptError = () => {
      if (!isCancelled) {
        setIsGoogleReady(false);
        setError(previous => previous || 'Failed to load Google sign-in. Please refresh and try again.');
      }
    };

    const existingScript = document.getElementById('google-client-script');

    if (existingScript) {
      existingScript.addEventListener('load', handleScriptLoad);
      existingScript.addEventListener('error', handleScriptError);
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.id = 'google-client-script';
      script.addEventListener('load', handleScriptLoad);
      script.addEventListener('error', handleScriptError);
      document.head.appendChild(script);
    }

    return () => {
      isCancelled = true;
      const script = document.getElementById('google-client-script');
      if (script) {
        script.removeEventListener('load', handleScriptLoad);
        script.removeEventListener('error', handleScriptError);
      }
    };
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

  const handleGoogleSignIn = () => {
    if (!window.google?.accounts?.id) {
      setError('Google sign-in is not available right now. Please try again later.');
      return;
    }

    setError('');
    setIsGoogleLoading(true);

    window.google.accounts.id.initialize({
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      callback: async response => {
        const credential = response?.credential;

        if (!credential) {
          setIsGoogleLoading(false);
          setError('Google did not return a credential. Please try again.');
          return;
        }

        try {
          await loginWithGoogle(credential);
          navigate('/');
        } catch (caughtError) {
          const apiMessage =
            caughtError?.data?.message ||
            caughtError?.data?.error ||
            caughtError?.message ||
            'Unable to sign in with Google.';
          setError(apiMessage);
        } finally {
          setIsGoogleLoading(false);
        }
      },
      ux_mode: 'popup',
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.prompt(notification => {
      const shouldStop =
        notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.() || notification?.isDismissedMoment?.();

      if (shouldStop) {
        setIsGoogleLoading(false);

        const reason =
          notification?.getNotDisplayedReason?.() ||
          notification?.getSkippedReason?.() ||
          notification?.getDismissedReason?.();

        if (reason && reason !== 'user_cancel') {
          setError('Google sign-in was dismissed. Please try again.');
        }
      }
    });
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

        <div className="oauth-section">
          <p className="form-helper">Or continue with</p>
          <button
            type="button"
            className="secondary-button"
            onClick={handleGoogleSignIn}
            disabled={!isGoogleReady || isGoogleLoading}
          >
            <span className="oauth-icon">
              <FcGoogle size={20} />
            </span>
            <span>{isGoogleLoading ? 'Connecting to Google…' : 'Continue with Google'}</span>
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
