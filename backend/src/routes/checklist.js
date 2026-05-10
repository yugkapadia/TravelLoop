const express = require('express');
const router = express.Router();
const { allQuery, runQuery } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { cleanText, parsePositiveInt } = require('../utils/request');

router.get('/:tripId', asyncHandler(async (req, res) => {
  const tripId = parsePositiveInt(req.params.tripId);
  if (!tripId) {
    return res.status(400).json({ error: 'Valid tripId is required.' });
  }

  const items = await allQuery('SELECT * FROM checklist_items WHERE trip_id = ? ORDER BY category, id', [tripId]);
  res.json({ items });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { tripId, label, category } = req.body;
  const parsedTripId = parsePositiveInt(tripId);
  const cleanedLabel = cleanText(label);
  if (!parsedTripId || !cleanedLabel) {
    return res.status(400).json({ error: 'tripId and label are required.' });
  }

  const result = await runQuery(
    'INSERT INTO checklist_items (trip_id, label, category) VALUES (?, ?, ?)',
    [parsedTripId, cleanedLabel, cleanText(category, 'Other') || 'Other']
  );
  res.status(201).json({
    item: { id: result.lastID, trip_id: parsedTripId, label: cleanedLabel, category: cleanText(category, 'Other') || 'Other', completed: 0 },
  });
}));

router.patch('/:itemId', asyncHandler(async (req, res) => {
  const itemId = parsePositiveInt(req.params.itemId);
  const completed = req.body.completed ? 1 : 0;
  if (!itemId) {
    return res.status(400).json({ error: 'Valid itemId is required.' });
  }

  const result = await runQuery('UPDATE checklist_items SET completed = ? WHERE id = ?', [completed, itemId]);
  if (!result.changes) {
    return res.status(404).json({ error: 'Checklist item not found.' });
  }
  res.json({ item: { id: itemId, completed } });
}));

router.post('/:tripId/reset', asyncHandler(async (req, res) => {
  const tripId = parsePositiveInt(req.params.tripId);
  if (!tripId) {
    return res.status(400).json({ error: 'Valid tripId is required.' });
  }

  await runQuery('UPDATE checklist_items SET completed = 0 WHERE trip_id = ?', [tripId]);
  res.status(204).end();
}));

router.delete('/:itemId', asyncHandler(async (req, res) => {
  const itemId = parsePositiveInt(req.params.itemId);
  if (!itemId) {
    return res.status(400).json({ error: 'Valid itemId is required.' });
  }

  const result = await runQuery('DELETE FROM checklist_items WHERE id = ?', [itemId]);
  if (!result.changes) {
    return res.status(404).json({ error: 'Checklist item not found.' });
  }
  res.status(204).end();
}));

module.exports = router;
