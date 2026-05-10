import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createTrip } from '../services/api';

export default function CreateTripPage({ user }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSaveTrip(event) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Trip name is required.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start and end dates are required.');
      return;
    }
    if (startDate > endDate) {
      setError('End date must be after start date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await createTrip({
        userId: user.id,
        title,
        description,
        startDate,
        endDate,
      });
      navigate(`/trip/${result.trip.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create trip.');
      setLoading(false);
    }
  }

  return (
    <main className="page-flow narrow">
      <Link className="text-link" to="/dashboard">
        Back to dashboard
      </Link>
      <section className="surface">
        <p className="eyebrow">New itinerary</p>
        <h1 className="page-header">Create a trip</h1>
        {error && <div className="alert-error">{error}</div>}
        <form className="stack" onSubmit={handleSaveTrip}>
          <label>
            Trip name
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Summer in Europe" />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short plan, theme, or travel goal" rows={4} />
          </label>
          <div className="form-grid">
            <label>
              Start date
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label>
              End date
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
          </div>
          <button type="submit" className="button-primary button-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save trip'}
          </button>
        </form>
      </section>
    </main>
  );
}
