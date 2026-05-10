import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchDiscovery } from '../services/api';
import { formatMoney, getUserLocale } from '../utils/currency';

export default function DiscoveryPage() {
  const { tripId } = useParams();
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const locale = getUserLocale();

  useEffect(() => {
    load('', '');
  }, []);

  async function load(q, t) {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDiscovery(q, t);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message || 'Failed to load discovery results.');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    load(query, type);
  }

  const destinations = results.filter((r) => r.type === 'destination');
  const activities = results.filter((r) => r.type === 'activity');

  return (
    <main className="page-flow">
      <Link className="text-link" to={`/trip/${tripId}`}>
        ← Back to itinerary
      </Link>

      <header className="toolbar">
        <div>
          <p className="eyebrow">Inspiration</p>
          <h1 className="page-header">Discover</h1>
          <p>Browse destinations and activity ideas to add to your trip.</p>
        </div>
      </header>

      <form className="surface stack" onSubmit={handleSearch} style={{ maxWidth: '640px' }}>
        <div className="form-grid">
          <input
            placeholder="Search cities, activities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="destination">Destinations</option>
            <option value="activity">Activities</option>
          </select>
        </div>
        <button className="button-primary" type="submit">Search</button>
      </form>

      {error && <div className="alert-error">{error}</div>}
      {loading && <div className="empty-state compact">Loading...</div>}

      {!loading && results.length === 0 && (
        <div className="empty-state compact">No results found. Try a different search.</div>
      )}

      {destinations.length > 0 && (
        <section>
          <h2 style={{ marginBottom: '12px' }}>Destinations</h2>
          <div className="discovery-grid">
            {destinations.map((item) => (
              <article key={item.id} className="discovery-card">
                <div>
                  <p className="eyebrow">{item.category}</p>
                  <h3>{item.title}</h3>
                  <p style={{ fontSize: '14px' }}>{item.location}</p>
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>{item.summary}</p>
                </div>
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="button-secondary"
                    style={{ marginTop: '12px', display: 'inline-flex' }}
                  >
                    Learn more ↗
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {activities.length > 0 && (
        <section>
          <h2 style={{ marginBottom: '12px' }}>Activity ideas</h2>
          <div className="discovery-grid">
            {activities.map((item) => (
              <article key={item.id} className="discovery-card">
                <div>
                  <p className="eyebrow">{item.category}</p>
                  <h3>{item.title}</h3>
                  <p style={{ fontSize: '14px' }}>{item.location}</p>
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>{item.summary}</p>
                </div>
                {item.estimated_cost > 0 && (
                  <p style={{ marginTop: '10px', fontWeight: 750, color: 'var(--primary-dark)' }}>
                    Est. {formatMoney(item.estimated_cost, locale)}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
