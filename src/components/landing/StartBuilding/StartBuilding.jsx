import { Link } from 'react-router-dom';
import './StartBuilding.css';

const StartBuilding = () => {
  return (
    <section className="start-building-section">
      <div className="start-building-container">
        <div className="start-building-card">
          <span className="badge start-building-badge">Continue the journey</span>
          <h2 className="start-building-title">Stay engaged with the SDG Forum</h2>
          <p className="start-building-subtitle">
            Jump into the spaces that keep collaboration flowing — log in, explore active threads, or launch a new
            conversation for your project.
          </p>

          <div className="start-building-actions">
            <Link to="/auth/login" className="start-building-button">
              Sign in
            </Link>
            <Link to="/forum/threads" className="start-building-button start-building-button--secondary">
              Browse threads
            </Link>
            <Link to="/forum/create" className="start-building-button start-building-button--ghost">
              Create a thread
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StartBuilding;
