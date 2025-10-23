import { useEffect, useMemo, useState } from 'react';
import './Testimonials.css';

const API_DOCS_URL = 'https://sdg-forum-api.truesurvi4.xyz/docs.json';
const DASHBOARD_URL = 'https://sdg-forum-api.truesurvi4.xyz/api/dashboard';

const DEFAULT_ACTIONS = [
  'Post a challenge – describe a local issue and ask for partners or data.',
  'Share what works – publish case studies, toolkits, or policy drafts.',
  'Team up – find collaborators by skill, location, or SDG focus.',
  'Measure impact – track progress with community-made indicators.',
];

const formatNumber = (value) => {
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return number.toLocaleString();
};

const formatLabel = (label) =>
  label
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const mapDashboardMetrics = (payload) => {
  if (!payload || typeof payload !== 'object') return [];

  const numericEntries = Object.entries(payload).filter(([, value]) => typeof value === 'number');
  const formatted = numericEntries
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 6)
    .map(([key, value]) => ({
      key,
      label: formatLabel(key),
      value: formatNumber(value),
    }));

  if (formatted.length > 0) {
    return formatted;
  }

  // Fallback: attempt to display lengths of arrays.
  const arrayEntries = Object.entries(payload)
    .filter(([, value]) => Array.isArray(value))
    .map(([key, value]) => ({
      key,
      label: `${formatLabel(key)} Count`,
      value: formatNumber(value.length),
    }))
    .slice(0, 6);

  return arrayEntries;
};

const Testimonials = () => {
  const [docsInfo, setDocsInfo] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [docsResponse, dashboardResponse] = await Promise.allSettled([
          fetch(API_DOCS_URL, { headers: { Accept: 'application/json' } }),
          fetch(DASHBOARD_URL, { headers: { Accept: 'application/json' } }),
        ]);

        if (!cancelled) {
          if (docsResponse.status === 'fulfilled' && docsResponse.value.ok) {
            const docsJson = await docsResponse.value.json();
            setDocsInfo(docsJson?.info ?? null);
          }

          if (dashboardResponse.status === 'fulfilled' && dashboardResponse.value.ok) {
            const dashboardJson = await dashboardResponse.value.json();
            const payload = dashboardJson?.data ?? dashboardJson;
            setDashboardData(payload && typeof payload === 'object' ? payload : null);
          }

          if (
            (docsResponse.status === 'rejected' || (docsResponse.value && !docsResponse.value.ok)) &&
            (dashboardResponse.status === 'rejected' || (dashboardResponse.value && !dashboardResponse.value.ok))
          ) {
            setError('Unable to reach the SDG Forum API right now. Showing default actions instead.');
          }
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : 'Unexpected error while connecting to the API.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  const dashboardMetrics = useMemo(() => mapDashboardMetrics(dashboardData), [dashboardData]);

  const activeActions = dashboardMetrics.length > 0 ? [] : DEFAULT_ACTIONS;

  return (
    <section className="testimonials-section">
      <div className="testimonials-container">
        <header className="testimonials-header">
          <h3 className="testimonials-title">Live View • SDG Forum API</h3>
          {docsInfo ? (
            <p className="testimonials-subtitle">
              Connected to <strong>{docsInfo?.title ?? 'SDG Forum API'}</strong> (v{docsInfo?.version ?? '—'}) at{' '}
              <code className="testimonials-endpoint">sdg-forum-api.truesurvi4.xyz</code>
            </p>
          ) : (
            <p className="testimonials-subtitle">
              Connecting to <code className="testimonials-endpoint">sdg-forum-api.truesurvi4.xyz</code>…
            </p>
          )}
        </header>

        {error ? (
          <div className="testimonials-alert" role="status">
            {error}
          </div>
        ) : null}

        <div className="testimonials-grid">
          <article className="testimonials-card">
            <h4>What You Can Do</h4>
            <ul className="testimonials-actions">
              {activeActions.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
              {dashboardMetrics.length > 0 ? (
                <li key="cta">Latest activity is live below – the forum is already creating momentum.</li>
              ) : null}
            </ul>
          </article>

          <article className="testimonials-card">
            <h4>API Status</h4>
            <dl className="testimonials-docs">
              <div>
                <dt>Documentation</dt>
                <dd>
                  <a href={API_DOCS_URL} target="_blank" rel="noreferrer">
                    docs.json
                  </a>
                </dd>
              </div>
              <div>
                <dt>Dashboard Endpoint</dt>
                <dd>
                  <a href={DASHBOARD_URL} target="_blank" rel="noreferrer">
                    /api/dashboard
                  </a>
                </dd>
              </div>
              <div>
                <dt>Connected</dt>
                <dd>{isLoading ? 'Connecting…' : 'Online'}</dd>
              </div>
            </dl>
          </article>
        </div>

        {dashboardMetrics.length > 0 ? (
          <div className="testimonials-metrics">
            {dashboardMetrics.map((metric) => (
              <article className="testimonials-metric-card" key={metric.key}>
                <span className="testimonials-metric-value">{metric.value}</span>
                <span className="testimonials-metric-label">{metric.label}</span>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default Testimonials;
