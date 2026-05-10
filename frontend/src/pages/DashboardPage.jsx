import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTrips, deleteTrip } from '../services/api';

const DESTINATION_EMOJIS = ['🗺️', '✈️', '🏖️', '🏔️', '🌆', '🗼', '🏯', '🌴', '🎭', '🚂'];

function tripEmoji(id) {
  return DESTINATION_EMOJIS[id % DESTINATION_EMOJIS.length];
}

export default function DashboardPage({ user, onLogout }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTrips() {
      try {
        const data = await fetchTrips(user.id);
        setTrips(data.trips || []);
      } catch (err) {
        setError(err.message || 'Failed to load trips');
      } finally {
        setLoading(false);
      }
    }
    loadTrips();
  }, [user.id]);

  async function handleDeleteTrip(tripId, tripTitle) {
    if (!window.confirm(`Delete "${tripTitle}"? This will remove all stops, activities, and data for this trip.`)) return;
    try {
      await deleteTrip(tripId);
      setTrips((current) => current.filter((t) => t.id !== tripId));
    } catch (err) {
      setError(err.message || 'Failed to delete trip.');
    }
  }

  const upcoming = trips.filter((t) => t.start_date && t.start_date >= new Date().toISOString().slice(0, 10));
  const past = trips.filter((t) => t.end_date && t.end_date < new Date().toISOString().slice(0, 10));

  return (
    <main className="page-flow">
      <header className="toolbar">
        <div>
          <p className="eyebrow">Welcome back, {user.name}</p>
          <h1 className="page-header">Your trips</h1>
        </div>
        <div className="toolbar-actions">
          <Link className="button-primary" to="/create">+ New trip</Link>
          <button className="button-secondary" onClick={onLogout} type="button">Log out</button>
        </div>
      </header>

      {trips.length > 0 && (
        <section className="metric-row">
          <div className="metric-card"><span>{trips.length}</span><p>Total trips</p></div>
          <div className="metric-card"><span>{upcoming.length}</span><p>Upcoming</p></div>
          <div className="metric-card"><span>{past.length}</span><p>Completed</p></div>
        </section>
      )}

      {error && <div className="alert-error">{error}</div>}
      {loading && <div className="empty-state">Loading trips...</div>}

      {!loading && trips.length === 0 && (
        <section className="empty-state">
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✈️</div>
          <h2>No trips yet</h2>
          <p>Create your first itinerary and TravelLoop will keep everything organized.</p>
          <Link className="button-primary" to="/create" style={{ marginTop: '16px', display: 'inline-flex' }}>
            Create your first trip
          </Link>
        </section>
      )}

      {trips.length > 0 && (
        <section className="trip-grid">
          {trips.map((trip) => {
            const isUpcoming = trip.start_date && trip.start_date >= new Date().toISOString().slice(0, 10);
            const isPast = trip.end_date && trip.end_date < new Date().toISOString().slice(0, 10);
            return (
              <div key={trip.id} className="trip-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p className="eyebrow" style={{ margin: 0 }}>
                      {trip.start_date && trip.end_date
                        ? `${trip.start_date} → ${trip.end_date}`
                        : 'Dates flexible'}
                    </p>
                    <span style={{ fontSize: '24px' }}>{tripEmoji(trip.id)}</span>
                  </div>
                  <h2>{trip.title}</h2>
                  <p>{trip.description || 'No description yet.'}</p>
                  {isUpcoming && (
                    <span className="tag" style={{ marginTop: '8px', display: 'inline-block', background: '#e8f5e9', color: '#2e7d32' }}>
                      Upcoming
                    </span>
                  )}
                  {isPast && (
                    <span className="tag" style={{ marginTop: '8px', display: 'inline-block', background: '#f3f4f6', color: '#6b7280' }}>
                      Completed
                    </span>
                  )}
                </div>
                <div className="trip-card-actions">
                  <Link className="button-primary" to={`/trip/${trip.id}`} style={{ fontSize: '14px', padding: '8px 14px' }}>
                    Open trip
                  </Link>
                  <button
                    className="button-ghost danger"
                    onClick={() => handleDeleteTrip(trip.id, trip.title)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
