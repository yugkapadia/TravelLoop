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

  const notes = await allQuery('SELECT * FROM trip_notes WHERE trip_id = ? ORDER BY created_at DESC, id DESC', [tripId]);
  res.json({ notes });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { tripId, content } = req.body;
  const parsedTripId = parsePositiveInt(tripId);
  const cleanedContent = cleanText(content);
  if (!parsedTripId || !cleanedContent) {
    return res.status(400).json({ error: 'tripId and content are required.' });
  }

  const result = await runQuery(
    'INSERT INTO trip_notes (trip_id, content) VALUES (?, ?)',
    [parsedTripId, cleanedContent]
  );
  res.status(201).json({ note: { id: result.lastID, trip_id: parsedTripId, content: cleanedContent, created_at: new Date().toISOString() } });
}));

router.delete('/:noteId', asyncHandler(async (req, res) => {
  const noteId = parsePositiveInt(req.params.noteId);
  if (!noteId) {
    return res.status(400).json({ error: 'Valid noteId is required.' });
  }

  const result = await runQuery('DELETE FROM trip_notes WHERE id = ?', [noteId]);
  if (!result.changes) {
    return res.status(404).json({ error: 'Note not found.' });
  }
  res.status(204).end();
}));

module.exports = router;
