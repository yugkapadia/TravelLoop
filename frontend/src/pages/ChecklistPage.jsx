import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { createChecklistItem, deleteChecklistItem, fetchChecklist, resetChecklist, updateChecklistItem } from '../services/api';

const categories = ['Documents', 'Health', 'Clothing', 'Electronics', 'Other'];

export default function ChecklistPage() {
  const { tripId } = useParams();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ label: '', category: 'Documents' });
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadItems() {
      try {
        const data = await fetchChecklist(tripId);
        setItems(data.items || []);
      } catch (err) {
        setError(err.message || 'Failed to load checklist.');
      }
    }

    loadItems();
  }, [tripId]);

  const completed = useMemo(() => items.filter((item) => Boolean(item.completed)).length, [items]);

  async function addItem(event) {
    event.preventDefault();
    if (!form.label.trim()) return;

    try {
      const data = await createChecklistItem({ tripId: Number(tripId), ...form });
      setItems((current) => [...current, data.item]);
      setForm({ label: '', category: form.category });
    } catch (err) {
      setError(err.message || 'Failed to add item.');
    }
  }

  async function toggleItem(item) {
    const completedValue = !Boolean(item.completed);
    await updateChecklistItem(item.id, completedValue);
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, completed: completedValue ? 1 : 0 } : entry)));
  }

  async function removeItem(itemId) {
    await deleteChecklistItem(itemId);
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  async function clearProgress() {
    await resetChecklist(tripId);
    setItems((current) => current.map((item) => ({ ...item, completed: 0 })));
  }

  return (
    <main className="page-flow">
      <Link className="text-link" to={`/trip/${tripId}`}>
        Back to itinerary
      </Link>
      <header className="toolbar">
        <div>
          <p className="eyebrow">Packing readiness</p>
          <h1 className="page-header">Checklist</h1>
        </div>
        <button className="button-secondary" onClick={clearProgress} type="button">Reset progress</button>
      </header>

      {error && <div className="alert-error">{error}</div>}

      <section className="metric-row">
        <div className="metric-card"><span>{completed}/{items.length}</span><p>Complete</p></div>
        <div className="metric-card">
          <span>{items.length ? Math.round((completed / items.length) * 100) : 0}%</span>
          <p>Progress</p>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${items.length ? Math.round((completed / items.length) * 100) : 0}%` }}
            />
          </div>
        </div>
      </section>

      <section className="content-grid">
        <form className="surface stack" onSubmit={addItem}>
          <h2>Add item</h2>
          <input placeholder="Passport, charger, medicine..." value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} />
          <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
          <button className="button-primary button-full" type="submit">Add item</button>
        </form>

        <section className="surface">
          <h2>Items</h2>
          <div className="list">
            {items.length === 0 && <p className="text-muted">No checklist items yet.</p>}
            {items.map((item) => (
              <div className={`list-row checklist-row ${item.completed ? 'done' : ''}`} key={item.id}>
                <input type="checkbox" checked={Boolean(item.completed)} onChange={() => toggleItem(item)} />
                <span>{item.label}</span>
                <small>{item.category}</small>
                <button className="button-ghost danger" onClick={() => removeItem(item.id)} type="button">Delete</button>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
