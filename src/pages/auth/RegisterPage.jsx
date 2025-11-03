import { useEffect, useMemo, useState } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import { useApi } from '@/api';
import { FcGoogle } from 'react-icons/fc';

const RegisterPage = () => {
  const { auth, baseUrl } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const firstName = (formData.get('firstName') || '').toString().trim();
    const lastName = (formData.get('lastName') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim().toLowerCase();
    const password = (formData.get('password') || '').toString();
    const confirmPassword = (formData.get('confirmPassword') || '').toString();

    if (password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined;
    const usernameCandidate = email.includes('@') ? email.split('@')[0] : `${firstName}${lastName}`;
    const username = usernameCandidate ? usernameCandidate.replace(/\s+/g, '').toLowerCase() : email;

    try {
      setIsLoading(true);
      setFeedback({ type: null, message: '' });

      await auth.register({
        email,
        username,
        password,
        name: fullName,
      });

      setFeedback({
        type: 'success',
        message: 'Account created successfully. You can now sign in.',
      });
      form.reset();
    } catch (error) {
      const errorMessage =
        (error?.data && (error.data.message || error.data.error)) ||
        error?.message ||
        'Something went wrong while creating your account.';

      setFeedback({ type: 'error', message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const googleAuthUrl = useMemo(() => {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    try {
      return new URL('auth/google', normalizedBase).toString();
    } catch {
      return `${normalizedBase}auth/google`;
    }
  }, [baseUrl]);

  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Join the SDG Forum community, start new threads, and collaborate with peers working on the same goals."
      footerLinks={[
        { label: 'Already have an account? Sign in', to: '/auth/login' }
      ]}
    >
      <div className="auth-card">
        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label htmlFor="firstName">First name</label>
            <div className="input-card">
              <input id="firstName" name="firstName" placeholder="John" required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Last name</label>
            <div className="input-card">
              <input id="lastName" name="lastName" placeholder="Doe" required />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-card">
              <input id="email" name="email" type="email" placeholder="name@example.com" required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-card">
                <input id="password" name="password" type="password" placeholder="Create a password" required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="input-card">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  required
                />
              </div>
            </div>
          </div>

          {feedback.type === 'error' ? (
            <span className="form-error">{feedback.message}</span>
          ) : null}
          {feedback.type === 'success' ? (
            <div className="auth-success">
              <p>{feedback.message}</p>
            </div>
          ) : null}

          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create account'}
          </button>

          <div className="oauth-section">
            <p className="form-helper">Or continue with</p>
            <a href={googleAuthUrl} className="secondary-button">
              <span className="oauth-icon">
                <FcGoogle size={20} />
              </span>
              <span>Continue with Google</span>
            </a>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;
