import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login, signup } from '../services/api';

export default function HomePage({ user, onAuth }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const action = mode === 'signup' ? signup : login;
      const data = await action(form);
      onAuth(data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to continue.');
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="hero-panel">
          <nav className="landing-nav" aria-label="TravelLoop">
            <strong>TravelLoop</strong>
            <a href="#start">Start planning</a>
          </nav>
          <div className="hero-content">
            <p className="eyebrow">Dynamic travel planning</p>
            <h1>Plan every stop, spend, note, and checklist in one calm workspace.</h1>
            <p className="hero-copy">
              TravelLoop keeps multi-city trips organized from the first idea to the final packing check, with live data stored in the backend and currency formatted for each traveller.
            </p>
            <div className="hero-stats">
              <span>Itineraries</span>
              <span>Budgets</span>
              <span>Checklists</span>
              <span>Notes</span>
            </div>
          </div>
        </div>

        <section className="auth-panel" id="start">
          <p className="eyebrow">Welcome to TravelLoop</p>
          <h2>{mode === 'signup' ? 'Create an account' : 'Log in to continue'}</h2>
          <p className="auth-copy">Sign up once, then build a trip with persistent stops, expenses, notes, and packing items.</p>
        <div className="segmented-control" aria-label="Authentication mode">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            Log in
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')} type="button">
            Sign up
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              Name
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Your name" />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="Minimum 6 characters" />
          </label>
          {error && <div className="alert-error">{error}</div>}
          <button className="button-primary button-full" disabled={loading} type="submit">
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>
        </section>
      </section>

      <section className="landing-section">
        <div>
          <p className="eyebrow">Why it works</p>
          <h2>Built for the messy middle of trip planning.</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <span>01</span>
            <h3>Structured itineraries</h3>
            <p>Add city stops, dates, notes, and activities so the plan stays readable as it grows.</p>
          </article>
          <article className="feature-card">
            <span>02</span>
            <h3>Your currency, automatically</h3>
            <p>Budgets display in the currency that matches your location — no manual setup needed.</p>
          </article>
          <article className="feature-card">
            <span>03</span>
            <h3>Useful trip memory</h3>
            <p>Checklist items and notes persist in the backend, ready whenever the traveller comes back.</p>
          </article>
        </div>
      </section>

      <section className="product-preview">
        <div className="preview-copy">
          <p className="eyebrow">Product flow</p>
          <h2>From idea to itinerary in minutes.</h2>
          <p>Create a trip, add stops, attach activities, track spending, and keep the essentials ready for departure.</p>
        </div>
        <div className="preview-board" aria-label="TravelLoop product preview">
          <div className="preview-row strong"><span>Summer in Japan</span><small>5 stops</small></div>
          <div className="preview-row"><span>Tokyo food walk</span><small>Activity</small></div>
          <div className="preview-row"><span>Hotel deposit</span><small>Budget</small></div>
          <div className="preview-row"><span>Passport copies</span><small>Checklist</small></div>
          <div className="preview-row"><span>Rail pass pickup note</span><small>Notes</small></div>
        </div>
      </section>
    </main>
  );
}
