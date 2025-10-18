import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { useApi } from '@/api';

const ResetPasswordPage = () => {
  const [stage, setStage] = useState('request');
  const [emailAddress, setEmailAddress] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [requestError, setRequestError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [tokenMessage, setTokenMessage] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState('');
  const { auth } = useApi();
  const navigate = useNavigate();

  const restartFlow = () => {
    setEmailAddress('');
    setResetToken('');
    setTokenMessage('');
    setTokenExpiry('');
    setConfirmError('');
    setRequestError('');
    setIsRequestLoading(false);
    setIsConfirmLoading(false);
    setStage('request');
  };

  const formatExpiry = value => {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (stage !== 'success') {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      navigate('/auth/login');
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [stage, navigate]);

  const handleRequest = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get('email') || '').toString().trim().toLowerCase();

    if (!email) {
      setRequestError('Please enter a valid email address.');
      return;
    }

    try {
      setIsRequestLoading(true);
      setRequestError('');

      const response = await auth.requestPasswordReset({ email });

      const issuedToken =
        (response && typeof response === 'object' && 'resetToken' in response && response.resetToken
          ? String(response.resetToken)
          : undefined) ??
        (response && typeof response === 'object' && 'reset_token' in response && response.reset_token
          ? String(response.reset_token)
          : undefined) ??
        (response && typeof response === 'object' && 'token' in response && response.token
          ? String(response.token)
          : undefined) ??
        '';

      if (!issuedToken) {
        setRequestError('Reset token missing in the server response. Please try again later.');
        return;
      }

      const expires =
        (response && typeof response === 'object' && typeof response.expires_at === 'string'
          ? response.expires_at
          : undefined) ??
        (response && typeof response === 'object' && typeof response.expiresAt === 'string'
          ? response.expiresAt
          : undefined) ??
        '';
      const message =
        response && typeof response === 'object' && typeof response.message === 'string'
          ? response.message
          : '';

      setEmailAddress(email);
      setResetToken(issuedToken);
      setTokenExpiry(expires);
      setTokenMessage(message);
      setConfirmError('');
      setStage('confirm');
      form.reset();
    } catch (error) {
      const message =
        (error?.data && (error.data.message || error.data.error)) ||
        error?.message ||
        'Unable to send the reset token right now.';
      setRequestError(message);
    } finally {
      setIsRequestLoading(false);
    }
  };

  const handleConfirm = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const token = (formData.get('token') || resetToken).toString().trim();
    const password = (formData.get('password') || '').toString();
    const confirmPassword = (formData.get('confirmPassword') || '').toString();

    if (!token) {
      setConfirmError('Please provide the reset token you received.');
      return;
    }

    if (!password) {
      setConfirmError('Please enter a new password.');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      return;
    }

    try {
      setIsConfirmLoading(true);
      setConfirmError('');

      await auth.confirmPasswordReset({ token, password });

      form.reset();
      setResetToken('');
      setTokenExpiry('');
      setTokenMessage('');

      setStage('success');
    } catch (error) {
      const message =
        (error?.data && (error.data.message || error.data.error)) ||
        error?.message ||
        'Unable to reset the password right now.';
      setConfirmError(message);
    } finally {
      setIsConfirmLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Your Password"
      subtitle="Enter the email connected to your SDG Forum account and we will send recovery instructions."
      footerLinks={[
        { label: 'Back to login', to: '/auth/login' },
        { label: 'Need an account? Join now', to: '/auth/register' }
      ]}
    >
      {stage === 'request' ? (
        <form className="auth-form" onSubmit={handleRequest}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="name@example.com" required />
          </div>

          {requestError ? <span className="form-error">{requestError}</span> : null}

          <button type="submit" className="primary-button" disabled={isRequestLoading}>
            {isRequestLoading ? 'Sending...' : 'Send reset token'}
          </button>
        </form>
      ) : null}

      {stage === 'confirm' ? (
        <form className="auth-form" onSubmit={handleConfirm}>
          <input type="hidden" name="token" value={resetToken} />

          <p className="form-helper">
            {tokenMessage ||
              `We sent a reset token to ${emailAddress}. We will apply it automatically once you set a new password.`}
          </p>
          {tokenExpiry ? (
            <p className="form-helper">Reset token expires at {formatExpiry(tokenExpiry)}.</p>
          ) : null}

          <div className="form-group">
            <label htmlFor="password">New password</label>
            <input id="password" name="password" type="password" placeholder="Create a new password" required />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter the new password"
              required
            />
          </div>

          {confirmError ? <span className="form-error">{confirmError}</span> : null}

          <div className="form-row">
            <button type="button" className="secondary-button" onClick={restartFlow}>
              Use a different email
            </button>
            <button type="submit" className="primary-button" disabled={isConfirmLoading}>
              {isConfirmLoading ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      ) : null}

      {stage === 'success' ? (
        <div className="auth-success">
          <h2>Password reset complete</h2>
          <p>
            Your password has been updated. You will be redirected to the sign-in page shortly, or you can jump there
            now.
          </p>
          <div className="form-row">
            <button type="button" className="secondary-button" onClick={restartFlow}>
              Reset another password
            </button>
            <button type="button" className="primary-button" onClick={() => navigate('/auth/login')}>
              Go to login
            </button>
          </div>
        </div>
      ) : null}
    </AuthLayout>
  );
};

export default ResetPasswordPage;
