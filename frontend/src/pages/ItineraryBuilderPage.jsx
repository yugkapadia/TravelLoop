import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  createActivity,
  createStop,
  deleteActivity,
  deleteStop,
  deleteTrip,
  fetchTripDetails,
  createShare,
} from '../services/api';
import { formatMoney, getCurrencyLabel, getUserLocale } from '../utils/currency';

const EMPTY_STOP = { city: '', country: '', startDate: '', endDate: '', notes: '' };
const EMPTY_ACTIVITY = { title: '', category: 'Sightseeing', duration: '', cost: '', details: '' };

export default function ItineraryBuilderPage({ user }) {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newStop, setNewStop] = useState(EMPTY_STOP);
  const [activeStopId, setActiveStopId] = useState(null);
  // Per-stop activity forms to avoid shared state bug
  const [activityForms, setActivityForms] = useState({});
  const [shareInfo, setShareInfo] = useState(null);
  const [sharing, setSharing] = useState(false);
  const locale = getUserLocale();
  const currencyLabel = getCurrencyLabel(locale);

  const activityCount = useMemo(
    () => stops.reduce((total, stop) => total + (stop.activities?.length || 0), 0),
    [stops]
  );

  useEffect(() => {
    async function loadTrip() {
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
    loadTrip();
  }, [tripId]);

  function updateStop(field, value) {
    setNewStop((current) => ({ ...current, [field]: value }));
  }

  function getActivityForm(stopId) {
    return activityForms[stopId] || { ...EMPTY_ACTIVITY };
  }

  function updateActivityForm(stopId, field, value) {
    setActivityForms((current) => ({
      ...current,
      [stopId]: { ...(current[stopId] || EMPTY_ACTIVITY), [field]: value },
    }));
  }

  async function addStop(event) {
    event.preventDefault();
    if (!newStop.city.trim()) return;
    try {
      const data = await createStop({ tripId: Number(tripId), ...newStop });
      setStops((current) => [...current, data.stop]);
      setNewStop(EMPTY_STOP);
    } catch (err) {
      setError(err.message || 'Failed to add stop.');
    }
  }

  async function handleDeleteStop(stopId, cityName) {
    if (!window.confirm(`Remove stop "${cityName}" and all its activities?`)) return;
    try {
      await deleteStop(stopId);
      setStops((current) => current.filter((s) => s.id !== stopId));
      if (activeStopId === stopId) setActiveStopId(null);
    } catch (err) {
      setError(err.message || 'Failed to delete stop.');
    }
  }

  async function addActivity(event, stopId) {
    event.preventDefault();
    const form = getActivityForm(stopId);
    if (!form.title.trim()) return;
    try {
      const data = await createActivity({ stopId, ...form });
      setStops((current) =>
        current.map((stop) =>
          stop.id === stopId
            ? { ...stop, activities: [...(stop.activities || []), data.activity] }
            : stop
        )
      );
      setActivityForms((current) => ({ ...current, [stopId]: { ...EMPTY_ACTIVITY } }));
      setActiveStopId(null);
    } catch (err) {
      setError(err.message || 'Failed to add activity.');
    }
  }

  async function handleDeleteActivity(stopId, activityId, activityTitle) {
    if (!window.confirm(`Remove activity "${activityTitle}"?`)) return;
    try {
      await deleteActivity(activityId);
      setStops((current) =>
        current.map((stop) =>
          stop.id === stopId
            ? { ...stop, activities: (stop.activities || []).filter((a) => a.id !== activityId) }
            : stop
        )
      );
    } catch (err) {
      setError(err.message || 'Failed to delete activity.');
    }
  }

  async function handleDeleteTrip() {
    if (!window.confirm(`Delete "${trip?.title}"? This cannot be undone.`)) return;
    try {
      await deleteTrip(tripId);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to delete trip.');
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const data = await createShare(Number(tripId), 'public');
      const BASE_SHARE_URL = "https://travel-loop-yug-kapadia-s-projects.vercel.app";

const shareUrl = `${BASE_SHARE_URL}/share/${data.share.public_code}`;
      setShareInfo(shareUrl);
    } catch (err) {
      setError(err.message || 'Failed to create share link.');
    } finally {
      setSharing(false);
    }
  }

  function copyShareLink() {
    if (shareInfo) {
      navigator.clipboard.writeText(shareInfo).catch(() => {});
    }
  }

  if (loading) return <main className="empty-state">Loading itinerary...</main>;

  return (
    <main className="page-flow">
      <Link className="text-link" to="/dashboard">
        ← Back to dashboard
      </Link>

      <header className="toolbar">
        <div>
          <p className="eyebrow">
            {trip?.start_date && trip?.end_date
              ? `${trip.start_date} → ${trip.end_date}`
              : 'Dates flexible'}
          </p>
          <h1 className="page-header">{trip?.title || 'Trip'}</h1>
          <p>{trip?.description || 'Start adding stops to shape this itinerary.'}</p>
        </div>
        <div className="toolbar-actions">
          <Link className="button-secondary" to={`/trip/${tripId}/view`}>View itinerary</Link>
          <Link className="button-secondary" to={`/trip/${tripId}/discovery`}>Discover</Link>
          <Link className="button-secondary" to={`/trip/${tripId}/hotels`}>Hotels</Link>
          <Link className="button-secondary" to={`/trip/${tripId}/budget`}>Budget</Link>
          <Link className="button-secondary" to={`/trip/${tripId}/checklist`}>Checklist</Link>
          <Link className="button-secondary" to={`/trip/${tripId}/notes`}>Notes</Link>
          <button className="button-secondary" onClick={handleShare} disabled={sharing} type="button">
            {sharing ? 'Sharing...' : 'Share'}
          </button>
          <button className="button-ghost danger" onClick={handleDeleteTrip} type="button">
            Delete trip
          </button>
        </div>
      </header>

      {shareInfo && (
        <div className="share-banner">
          <span>Share link: <a href={shareInfo} target="_blank" rel="noreferrer">{shareInfo}</a></span>
          <button className="button-secondary" onClick={copyShareLink} type="button">Copy</button>
        </div>
      )}

      <section className="metric-row">
        <div className="metric-card"><span>{stops.length}</span><p>Stops</p></div>
        <div className="metric-card"><span>{activityCount}</span><p>Activities</p></div>
        <div className="metric-card"><span>{trip?.end_date ? 'Set' : 'Open'}</span><p>Schedule</p></div>
      </section>

      {error && <div className="alert-error">{error}</div>}

      <section className="content-grid">
        <form className="surface stack" onSubmit={addStop}>
          <div>
            <p className="eyebrow">Route builder</p>
            <h2>Add stop</h2>
          </div>
          <input
            placeholder="City"
            value={newStop.city}
            onChange={(e) => updateStop('city', e.target.value)}
          />
          <input
            placeholder="Country"
            value={newStop.country}
            onChange={(e) => updateStop('country', e.target.value)}
          />
          <div className="form-grid">
            <label>
              Start date
              <input
                type="date"
                value={newStop.startDate}
                onChange={(e) => updateStop('startDate', e.target.value)}
              />
            </label>
            <label>
              End date
              <input
                type="date"
                value={newStop.endDate}
                onChange={(e) => updateStop('endDate', e.target.value)}
              />
            </label>
          </div>
          <textarea
            placeholder="Notes for this stop"
            value={newStop.notes}
            onChange={(e) => updateStop('notes', e.target.value)}
            rows={3}
          />
          <button className="button-primary button-full" type="submit">
            Add stop
          </button>
        </form>

        <section className="timeline">
          {stops.length === 0 && (
            <div className="empty-state compact">No stops yet. Add the first city to begin.</div>
          )}
          {stops.map((stop, index) => {
            const actForm = getActivityForm(stop.id);
            return (
              <article className="stop-card" key={stop.id}>
                <div className="stop-index">{index + 1}</div>
                <div className="stop-body">
                  <div className="stop-header">
                    <div>
                      <h2>
                        {stop.city}
                        {stop.country ? `, ${stop.country}` : ''}
                      </h2>
                      <p>
                        {stop.start_date || 'Start'} → {stop.end_date || 'End'}
                      </p>
                    </div>
                    <div className="stop-actions">
                      <button
                        className="button-secondary"
                        onClick={() =>
                          setActiveStopId(activeStopId === stop.id ? null : stop.id)
                        }
                        type="button"
                      >
                        {activeStopId === stop.id ? 'Cancel' : 'Add activity'}
                      </button>
                      <button
                        className="button-ghost danger"
                        onClick={() => handleDeleteStop(stop.id, stop.city)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {stop.notes && <p className="note-line">{stop.notes}</p>}

                  <div className="activity-list">
                    {(stop.activities || []).map((activity) => (
                      <div className="activity-item" key={activity.id}>
                        <span>{activity.title}</span>
                        <small>
                          {activity.category || 'Activity'}
                          {activity.cost ? ` · ${formatMoney(activity.cost, locale)}` : ''}
                        </small>
                        <button
                          className="button-ghost danger"
                          onClick={() =>
                            handleDeleteActivity(stop.id, activity.id, activity.title)
                          }
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  {activeStopId === stop.id && (
                    <form
                      className="activity-form"
                      onSubmit={(e) => addActivity(e, stop.id)}
                    >
                      <input
                        placeholder="Activity name"
                        value={actForm.title}
                        onChange={(e) =>
                          updateActivityForm(stop.id, 'title', e.target.value)
                        }
                      />
                      <div className="form-grid">
                        <select
                          value={actForm.category}
                          onChange={(e) =>
                            updateActivityForm(stop.id, 'category', e.target.value)
                          }
                        >
                          <option>Sightseeing</option>
                          <option>Food</option>
                          <option>Transport</option>
                          <option>Stay</option>
                          <option>Other</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          placeholder={`Cost (${currencyLabel})`}
                          value={actForm.cost}
                          onChange={(e) =>
                            updateActivityForm(stop.id, 'cost', e.target.value)
                          }
                        />
                      </div>
                      <input
                        placeholder="Duration or timing"
                        value={actForm.duration}
                        onChange={(e) =>
                          updateActivityForm(stop.id, 'duration', e.target.value)
                        }
                      />
                      <textarea
                        placeholder="Details"
                        value={actForm.details}
                        onChange={(e) =>
                          updateActivityForm(stop.id, 'details', e.target.value)
                        }
                        rows={2}
                      />
                      <button className="button-primary" type="submit">
                        Save activity
                      </button>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
