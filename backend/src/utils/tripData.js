const { allQuery, getQuery } = require('../db');

async function getTripOverview(tripId) {
  const trip = await getQuery('SELECT * FROM trips WHERE id = ?', [tripId]);
  if (!trip) {
    return null;
  }

  const stops = await allQuery(
    'SELECT * FROM stops WHERE trip_id = ? ORDER BY COALESCE(display_order, 0), start_date, id',
    [tripId]
  );
  const activities = stops.length
    ? await allQuery(
        `SELECT * FROM activities WHERE stop_id IN (${stops.map(() => '?').join(',')})
          ORDER BY scheduled_date, start_time, id`,
        stops.map((stop) => stop.id)
      )
    : [];
  const expenses = await allQuery(
    'SELECT * FROM expenses WHERE trip_id = ? ORDER BY created_at DESC, id DESC',
    [tripId]
  );

  const stopsWithActivities = stops.map((stop) => ({
    ...stop,
    activities: activities.filter((activity) => activity.stop_id === stop.id),
  }));

  return {
    trip,
    stops: stopsWithActivities,
    expenses,
  };
}

function buildBudgetSummary(overview) {
  const activityCosts = overview.stops.flatMap((stop) =>
    (stop.activities || []).map((activity) => ({
      source: 'activity',
      category: activity.category || 'Activity',
      amount: Number(activity.cost || 0),
      label: activity.title,
      stop_id: stop.id,
      activity_id: activity.id,
    }))
  );
  const trackedExpenses = overview.expenses.map((expense) => ({
    source: 'expense',
    category: expense.category,
    amount: Number(expense.amount || 0),
    label: expense.notes || expense.category,
    stop_id: expense.stop_id,
    activity_id: expense.activity_id,
  }));
  const items = [...activityCosts, ...trackedExpenses];
  const categories = items.reduce((summary, item) => {
    const key = item.category || 'Other';
    summary[key] = (summary[key] || 0) + item.amount;
    return summary;
  }, {});
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return {
    total,
    categories: Object.entries(categories).map(([category, amount]) => ({ category, amount })),
    items,
  };
}

function buildCalendarEvents(overview) {
  const stopEvents = overview.stops.map((stop) => ({
    id: `stop-${stop.id}`,
    type: 'stop',
    title: stop.country ? `${stop.city}, ${stop.country}` : stop.city,
    start: stop.start_date,
    end: stop.end_date || stop.start_date,
    notes: stop.notes,
    stop_id: stop.id,
  }));
  const activityEvents = overview.stops.flatMap((stop) =>
    (stop.activities || []).map((activity) => ({
      id: `activity-${activity.id}`,
      type: 'activity',
      title: activity.title,
      category: activity.category,
      start: activity.scheduled_date || stop.start_date,
      start_time: activity.start_time,
      end_time: activity.end_time,
      cost: Number(activity.cost || 0),
      stop_id: stop.id,
      activity_id: activity.id,
    }))
  );

  return [...stopEvents, ...activityEvents]
    .filter((event) => event.start)
    .sort((left, right) => `${left.start}${left.start_time || ''}`.localeCompare(`${right.start}${right.start_time || ''}`));
}

module.exports = {
  buildBudgetSummary,
  buildCalendarEvents,
  getTripOverview,
};
