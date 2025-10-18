import { useEffect } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';

const RegisterPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Join the SDG Forum community, start new threads, and collaborate with peers working on the same goals."
      footerLinks={[
        { label: 'Already have an account? Sign in', to: '/auth/login' }
      ]}
    >
      <form
        className="auth-form"
        onSubmit={event => {
          event.preventDefault();
        }}
      >
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First name</label>
            <input id="firstName" placeholder="Alex" required />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Last name</label>
            <input id="lastName" placeholder="Rivera" required />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" placeholder="name@example.com" required />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" placeholder="Create a password" required />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input id="confirmPassword" type="password" placeholder="Re-enter your password" required />
          </div>
        </div>

        <button type="submit" className="primary-button">
          Create account
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
