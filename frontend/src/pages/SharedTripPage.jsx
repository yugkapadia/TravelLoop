import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchSharedTrip } from '../services/api';
import { formatMoney, getUserLocale } from '../utils/currency';

export default function SharedTripPage() {
  const { publicCode } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const locale = getUserLocale();

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchSharedTrip(publicCode);
        setData(result);
      } catch (err) {
        setError(err.message || 'This shared trip could not be found.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [publicCode]);

  if (loading) return <main className="empty-state">Loading shared trip...</main>;

  if (error) {
    return (
      <main className="page-flow narrow" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <div className="alert-error">{error}</div>
        <Link className="button-primary" to="/" style={{ marginTop: '16px', display: 'inline-flex' }}>
          Go to TravelLoop
        </Link>
      </main>
    );
  }

  const { trip, stops, budget } = data;
  const totalActivities = (stops || []).reduce(
    (sum, s) => sum + (s.activities?.length || 0),
    0
  );

  return (
    <main className="page-flow narrow">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <strong style={{ color: 'var(--primary)', fontSize: '18px' }}>TravelLoop</strong>
        <span className="eyebrow" style={{ background: 'var(--primary-soft)', padding: '4px 10px', borderRadius: '999px' }}>
          Shared itinerary
        </span>
      </div>

      <header>
        <p className="eyebrow">
          {trip.start_date && trip.end_date
            ? `${trip.start_date} → ${trip.end_date}`
            : 'Dates flexible'}
        </p>
        <h1 className="page-header">{trip.title}</h1>
        {trip.description && <p>{trip.description}</p>}
      </header>

      <section className="metric-row">
        <div className="metric-card"><span>{(stops || []).length}</span><p>Stops</p></div>
        <div className="metric-card"><span>{totalActivities}</span><p>Activities</p></div>
        {budget?.total > 0 && (
          <div className="metric-card">
            <span>{formatMoney(budget.total, locale)}</span>
            <p>Est. cost</p>
          </div>
        )}
      </section>

      <div className="itinerary-timeline">
        {(stops || []).map((stop, index) => (
          <section key={stop.id} className="itinerary-stop">
            <div className="itinerary-stop-header">
              <div className="stop-index">{index + 1}</div>
              <div>
                <h2>
                  {stop.city}
                  {stop.country ? `, ${stop.country}` : ''}
                </h2>
                <p className="eyebrow" style={{ marginBottom: 0 }}>
                  {stop.start_date || '—'} → {stop.end_date || '—'}
                </p>
              </div>
            </div>

            {stop.notes && <p className="note-line">{stop.notes}</p>}

            {(stop.activities || []).length > 0 && (
              <div className="itinerary-activities">
                {stop.activities.map((activity) => (
                  <div key={activity.id} className="itinerary-activity-row">
                    <div>
                      <strong>{activity.title}</strong>
                      {activity.details && (
                        <p style={{ margin: '2px 0 0', fontSize: '13px' }}>{activity.details}</p>
                      )}
                    </div>
                    <div className="itinerary-activity-meta">
                      <span className="tag">{activity.category || 'Activity'}</span>
                      {activity.duration && <small>{activity.duration}</small>}
                      {activity.cost > 0 && (
                        <strong style={{ color: 'var(--primary-dark)' }}>
                          {formatMoney(activity.cost, locale)}
                        </strong>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="surface" style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '12px' }}>Want to plan your own trip?</p>
        <Link className="button-primary" to="/">
          Start planning on TravelLoop
        </Link>
      </div>
    </main>
  );
}
