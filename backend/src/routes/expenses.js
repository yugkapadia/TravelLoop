const express = require('express');
const router = express.Router();
const { allQuery, runQuery } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { cleanText, parseAmount, parsePositiveInt } = require('../utils/request');

router.get('/:tripId', asyncHandler(async (req, res) => {
  const tripId = parsePositiveInt(req.params.tripId);
  if (!tripId) {
    return res.status(400).json({ error: 'Valid tripId is required.' });
  }

  const expenses = await allQuery('SELECT * FROM expenses WHERE trip_id = ? ORDER BY created_at DESC, id DESC', [tripId]);
  res.json({ expenses });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { tripId, stopId, activityId, category, amount, notes } = req.body;
  const parsedTripId = parsePositiveInt(tripId);
  const cleanedCategory = cleanText(category);
  if (!parsedTripId || !cleanedCategory) {
    return res.status(400).json({ error: 'tripId and category are required.' });
  }

  const parsedAmount = parseAmount(amount);
  const result = await runQuery(
    `INSERT INTO expenses (trip_id, stop_id, activity_id, category, amount, notes)
      VALUES (?, ?, ?, ?, ?, ?)`,
    [
      parsedTripId,
      parsePositiveInt(stopId),
      parsePositiveInt(activityId),
      cleanedCategory,
      parsedAmount,
      cleanText(notes),
    ]
  );
  res.status(201).json({
    expense: {
      id: result.lastID,
      trip_id: parsedTripId,
      stop_id: parsePositiveInt(stopId),
      activity_id: parsePositiveInt(activityId),
      category: cleanedCategory,
      amount: parsedAmount,
      notes: cleanText(notes),
    },
  });
}));

router.delete('/:expenseId', asyncHandler(async (req, res) => {
  const expenseId = parsePositiveInt(req.params.expenseId);
  if (!expenseId) {
    return res.status(400).json({ error: 'Valid expenseId is required.' });
  }

  const result = await runQuery('DELETE FROM expenses WHERE id = ?', [expenseId]);
  if (!result.changes) {
    return res.status(404).json({ error: 'Expense not found.' });
  }

  res.status(204).end();
}));

module.exports = router;
