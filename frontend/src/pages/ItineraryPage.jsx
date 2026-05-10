import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchTripDetails } from '../services/api';
import { formatMoney, getUserLocale } from '../utils/currency';

export default function ItineraryPage() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const locale = getUserLocale();

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchTripDetails(tripId);
        setTrip(data.trip);
        setStops(data.stops || []);
      } catch (err) {
        setError(err.message || 'Failed to load itinerary.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tripId]);

  if (loading) return <main className="empty-state">Loading itinerary...</main>;

  const totalCost = stops
    .flatMap((s) => s.activities || [])
    .reduce((sum, a) => sum + Number(a.cost || 0), 0);

  return (
    <main className="page-flow narrow">
      <Link className="text-link" to={`/trip/${tripId}`}>
        ← Back to builder
      </Link>

      <header>
        <p className="eyebrow">
          {trip?.start_date && trip?.end_date
            ? `${trip.start_date} → ${trip.end_date}`
            : 'Dates flexible'}
        </p>
        <h1 className="page-header">{trip?.title || 'Itinerary'}</h1>
        {trip?.description && <p>{trip.description}</p>}
      </header>

      {error && <div className="alert-error">{error}</div>}

      {stops.length === 0 && (
        <div className="empty-state">
          <p>No stops added yet.</p>
          <Link className="button-primary" to={`/trip/${tripId}`}>Go to builder</Link>
        </div>
      )}

      <div className="itinerary-timeline">
        {stops.map((stop, index) => (
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

            {(stop.activities || []).length > 0 ? (
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
            ) : (
              <p className="text-muted" style={{ fontSize: '14px', marginTop: '8px' }}>
                No activities for this stop.
              </p>
            )}
          </section>
        ))}
      </div>

      {stops.length > 0 && (
        <div className="surface" style={{ textAlign: 'right' }}>
          <p className="eyebrow">Estimated total from activities</p>
          <p style={{ fontSize: '28px', fontWeight: 850, color: 'var(--primary-dark)', margin: 0 }}>
            {formatMoney(totalCost, locale)}
          </p>
        </div>
      )}
    </main>
  );
}
