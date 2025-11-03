import { Link } from 'react-router-dom';
import PlasmaWaveV2 from '../landing/PlasmaWave/PlasmaWaveV2';
import heroImage from '../../assets/common/hero.webp';

const AuthLayout = ({ title, subtitle, children, footerLinks = [] }) => (
  <section className="auth-page">
    <div className="auth-page__background">
      <PlasmaWaveV2 yOffset={0} xOffset={40} rotationDeg={-45} />
    </div>
    <div className="auth-page__content">
      <div className="auth-info">
        <span className="badge">SDG Forum</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
      {footerLinks.length > 0 && (
        <div className="auth-footer-links">
          {footerLinks.map(({ label, to }) => (
            <Link key={label} to={to}>
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  </section>
);

export default AuthLayout;