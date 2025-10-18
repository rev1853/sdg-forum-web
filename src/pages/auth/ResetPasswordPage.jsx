import { useEffect, useState } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';

const ResetPasswordPage = () => {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <AuthLayout
      title="Reset Your Password"
      subtitle="Enter the email connected to your SDG Forum account and we will send recovery instructions."
      footerLinks={[
        { label: 'Back to login', to: '/auth/login' },
        { label: 'Need an account? Join now', to: '/auth/register' }
      ]}
    >
      {submitted ? (
        <div className="auth-success">
          <h2>Check your inbox</h2>
          <p>
            If there is an account linked to that address, a reset link is on the way. This link will stay active for
            the next 24 hours.
          </p>
          <button type="button" className="secondary-button" onClick={() => setSubmitted(false)}>
            Send to a different email
          </button>
        </div>
      ) : (
        <form
          className="auth-form"
          onSubmit={event => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="name@example.com" required />
          </div>

          <button type="submit" className="primary-button">
            Send reset link
          </button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPasswordPage;
