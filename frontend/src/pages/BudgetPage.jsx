import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { createExpense, deleteExpense, fetchExpenses, fetchBudgetSummary } from '../services/api';
import { formatMoney, getCurrencyLabel, getUserLocale } from '../utils/currency';

const EXPENSE_CATEGORIES = ['Transport', 'Stay', 'Food', 'Activities', 'Shopping', 'Health', 'Other'];

const CATEGORY_COLORS = {
  Transport: '#3b82f6',
  Stay: '#8b5cf6',
  Food: '#f59e0b',
  Activities: '#10b981',
  Shopping: '#ec4899',
  Health: '#ef4444',
  Other: '#6b7280',
};

export default function BudgetPage() {
  const { tripId } = useParams();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ category: 'Transport', amount: '', notes: '' });
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('expenses');
  const locale = getUserLocale();
  const currencyLabel = getCurrencyLabel(locale);

  useEffect(() => {
    async function load() {
      try {
        const [expData, sumData] = await Promise.all([
          fetchExpenses(tripId),
          fetchBudgetSummary(tripId),
        ]);
        setExpenses(expData.expenses || []);
        setSummary(sumData.budget || null);
      } catch (err) {
        setError(err.message || 'Failed to load budget.');
      }
    }
    load();
  }, [tripId]);

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses]
  );

  const byCategory = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  async function addExpense(event) {
    event.preventDefault();
    if (!form.category.trim() || !form.amount) return;
    try {
      const data = await createExpense({ tripId: Number(tripId), ...form });
      setExpenses((current) => [data.expense, ...current]);
      setForm({ category: form.category, amount: '', notes: '' });
    } catch (err) {
      setError(err.message || 'Failed to add expense.');
    }
  }

  async function removeExpense(expenseId) {
    await deleteExpense(expenseId);
    setExpenses((current) => current.filter((e) => e.id !== expenseId));
  }

  return (
    <main className="page-flow">
      <Link className="text-link" to={`/trip/${tripId}`}>← Back to itinerary</Link>

      <header className="toolbar">
        <div>
          <p className="eyebrow">Trip finances</p>
          <h1 className="page-header">Budget</h1>
        </div>
      </header>

      {error && <div className="alert-error">{error}</div>}

      <section className="metric-row">
        <div className="metric-card">
          <span>{formatMoney(total, locale)}</span>
          <p>Total spent</p>
        </div>
        <div className="metric-card">
          <span>{expenses.length}</span>
          <p>Expenses</p>
        </div>
        <div className="metric-card">
          <span>{expenses.length ? formatMoney(total / expenses.length, locale) : '—'}</span>
          <p>Average</p>
        </div>
        {summary && summary.total > 0 && (
          <div className="metric-card">
            <span>{formatMoney(summary.total, locale)}</span>
            <p>Inc. activities</p>
          </div>
        )}
      </section>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <section className="surface">
          <h2>Breakdown by category</h2>
          <div className="budget-category-bar">
            {byCategory.map(([cat, amt]) => (
              <div key={cat} className="budget-bar-row">
                <div className="budget-bar-label">
                  <span style={{ fontWeight: 700 }}>{cat}</span>
                  <span>{formatMoney(amt, locale)} ({total > 0 ? Math.round((amt / total) * 100) : 0}%)</span>
                </div>
                <div className="budget-bar-track">
                  <div
                    className="budget-bar-fill"
                    style={{
                      width: `${total > 0 ? (amt / total) * 100 : 0}%`,
                      background: CATEGORY_COLORS[cat] || 'var(--primary)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="segmented-control" style={{ maxWidth: '320px' }}>
        <button
          className={activeTab === 'expenses' ? 'active' : ''}
          onClick={() => setActiveTab('expenses')}
          type="button"
        >
          Expenses
        </button>
        <button
          className={activeTab === 'add' ? 'active' : ''}
          onClick={() => setActiveTab('add')}
          type="button"
        >
          Add expense
        </button>
      </div>

      {activeTab === 'add' && (
        <form className="surface stack" onSubmit={addExpense} style={{ maxWidth: '480px' }}>
          <h2>Add expense</h2>
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Amount ({currencyLabel})
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </label>
          <label>
            Notes (optional)
            <input
              placeholder="What was this for?"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          <button className="button-primary button-full" type="submit">Add expense</button>
        </form>
      )}

      {activeTab === 'expenses' && (
        <section className="surface">
          <h2>All expenses</h2>
          <div className="list">
            {expenses.length === 0 && <p className="text-muted">No expenses yet.</p>}
            {expenses.map((expense) => (
              <div className="list-row" key={expense.id}>
                <div>
                  <span style={{ fontWeight: 700 }}>{expense.category}</span>
                  {expense.notes && (
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      {expense.notes}
                    </p>
                  )}
                </div>
                <strong style={{ color: CATEGORY_COLORS[expense.category] || 'var(--ink)' }}>
                  {formatMoney(expense.amount, locale)}
                </strong>
                <button
                  className="button-ghost danger"
                  onClick={() => removeExpense(expense.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
