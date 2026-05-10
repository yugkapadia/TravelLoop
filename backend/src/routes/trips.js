const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { buildBudgetSummary, buildCalendarEvents, getTripOverview } = require('../utils/tripData');
const { cleanText, isValidDateString, parsePositiveInt } = require('../utils/request');

router.get('/', asyncHandler(async (req, res) => {
  const userId = parsePositiveInt(req.query.userId);
  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required.' });
  }

  const rows = await allQuery('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  res.json({ trips: rows });
}));

router.get('/:tripId', asyncHandler(async (req, res) => {
  const tripId = parsePositiveInt(req.params.tripId);
  if (!tripId) {
    return res.status(400).json({ error: 'Valid tripId is required.' });
  }

  const overview = await getTripOverview(tripId);
  if (!overview) {
    return res.status(404).json({ error: 'Trip not found.' });
  }

  res.json({ trip: overview.trip, stops: overview.stops });
}));

router.get('/:tripId/calendar', asyncHandler(async (req, res) => {
  const tripId = parsePositiveInt(req.params.tripId);
  if (!tripId) {
    return res.status(400).json({ error: 'Valid tripId is required.' });
  }

  const overview = await getTripOverview(tripId);
  if (!overview) {
    return res.status(404).json({ error: 'Trip not found.' });
  }

  res.json({ trip: overview.trip, events: buildCalendarEvents(overview) });
}));

router.get('/:tripId/budget-summary', asyncHandler(async (req, res) => {
  const tripId = parsePositiveInt(req.params.tripId);
  if (!tripId) {
    return res.status(400).json({ error: 'Valid tripId is required.' });
  }

  const overview = await getTripOverview(tripId);
  if (!overview) {
    return res.status(404).json({ error: 'Trip not found.' });
  }

  res.json({ trip: overview.trip, budget: buildBudgetSummary(overview) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { userId, title, description, startDate, endDate, budgetCurrency } = req.body;
  const parsedUserId = parsePositiveInt(userId);
  const cleanedTitle = cleanText(title);
  if (!parsedUserId || !cleanedTitle) {
    return res.status(400).json({ error: 'userId and title are required.' });
  }
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return res.status(400).json({ error: 'Dates must use YYYY-MM-DD format.' });
  }

  const result = await runQuery(
    `INSERT INTO trips (user_id, title, description, start_date, end_date, budget_currency)
      VALUES (?, ?, ?, ?, ?, ?)`,
    [parsedUserId, cleanedTitle, cleanText(description), startDate || null, endDate || null, budgetCurrency || 'USD']
  );
  const trip = await getQuery('SELECT * FROM trips WHERE id = ?', [result.lastID]);
  res.status(201).json({ trip });
}));

router.patch('/:tripId', asyncHandler(async (req, res) => {
  const tripId = parsePositiveInt(req.params.tripId);
  const { title, description, startDate, endDate, budgetCurrency, visibility } = req.body;
  const cleanedTitle = cleanText(title);
  if (!tripId || !cleanedTitle) {
    return res.status(400).json({ error: 'Valid tripId and title are required.' });
  }
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return res.status(400).json({ error: 'Dates must use YYYY-MM-DD format.' });
  }

  const result = await runQuery(
    `UPDATE trips
      SET title = ?, description = ?, start_date = ?, end_date = ?, budget_currency = ?, visibility = ?
      WHERE id = ?`,
    [
      cleanedTitle,
      cleanText(description),
      startDate || null,
      endDate || null,
      budgetCurrency || 'USD',
      visibility === 'public' ? 'public' : 'private',
      tripId,
    ]
  );

  if (!result.changes) {
    return res.status(404).json({ error: 'Trip not found.' });
  }

  const trip = await getQuery('SELECT * FROM trips WHERE id = ?', [tripId]);
  res.json({ trip });
}));

router.delete('/:tripId', asyncHandler(async (req, res) => {
  const tripId = parsePositiveInt(req.params.tripId);
  if (!tripId) {
    return res.status(400).json({ error: 'Valid tripId is required.' });
  }

  const result = await runQuery('DELETE FROM trips WHERE id = ?', [tripId]);
  if (!result.changes) {
    return res.status(404).json({ error: 'Trip not found.' });
  }

  res.status(204).end();
}));

module.exports = router;
