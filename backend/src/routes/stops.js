const express = require('express');
const router = express.Router();
const { runQuery } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { cleanText, isValidDateString, parsePositiveInt } = require('../utils/request');

router.post('/', asyncHandler(async (req, res) => {
  const { tripId, city, country, startDate, endDate, notes, displayOrder, latitude, longitude } = req.body;
  const parsedTripId = parsePositiveInt(tripId);
  const cleanedCity = cleanText(city);
  if (!parsedTripId || !cleanedCity) {
    return res.status(400).json({ error: 'tripId and city are required.' });
  }
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return res.status(400).json({ error: 'Dates must use YYYY-MM-DD format.' });
  }

  const result = await runQuery(
    `INSERT INTO stops
      (trip_id, city, country, start_date, end_date, notes, display_order, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parsedTripId,
      cleanedCity,
      cleanText(country),
      startDate || null,
      endDate || null,
      cleanText(notes),
      Number.parseInt(displayOrder, 10) || 0,
      Number.isFinite(Number(latitude)) ? Number(latitude) : null,
      Number.isFinite(Number(longitude)) ? Number(longitude) : null,
    ]
  );
  res.status(201).json({
    stop: {
      id: result.lastID,
      trip_id: parsedTripId,
      city: cleanedCity,
      country: cleanText(country),
      start_date: startDate || null,
      end_date: endDate || null,
      notes: cleanText(notes),
      display_order: Number.parseInt(displayOrder, 10) || 0,
      latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
      longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
      activities: [],
    },
  });
}));

router.patch('/:stopId', asyncHandler(async (req, res) => {
  const stopId = parsePositiveInt(req.params.stopId);
  const { city, country, startDate, endDate, notes, displayOrder, latitude, longitude } = req.body;
  const cleanedCity = cleanText(city);
  if (!stopId || !cleanedCity) {
    return res.status(400).json({ error: 'Valid stopId and city are required.' });
  }
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return res.status(400).json({ error: 'Dates must use YYYY-MM-DD format.' });
  }

  const result = await runQuery(
    `UPDATE stops
      SET city = ?, country = ?, start_date = ?, end_date = ?, notes = ?,
        display_order = ?, latitude = ?, longitude = ?
      WHERE id = ?`,
    [
      cleanedCity,
      cleanText(country),
      startDate || null,
      endDate || null,
      cleanText(notes),
      Number.parseInt(displayOrder, 10) || 0,
      Number.isFinite(Number(latitude)) ? Number(latitude) : null,
      Number.isFinite(Number(longitude)) ? Number(longitude) : null,
      stopId,
    ]
  );

  if (!result.changes) {
    return res.status(404).json({ error: 'Stop not found.' });
  }

  res.json({ stop: { id: stopId, city: cleanedCity, country: cleanText(country), start_date: startDate || null, end_date: endDate || null, notes: cleanText(notes) } });
}));

router.delete('/:stopId', asyncHandler(async (req, res) => {
  const stopId = parsePositiveInt(req.params.stopId);
  if (!stopId) {
    return res.status(400).json({ error: 'Valid stopId is required.' });
  }

  const result = await runQuery('DELETE FROM stops WHERE id = ?', [stopId]);
  if (!result.changes) {
    return res.status(404).json({ error: 'Stop not found.' });
  }

  res.status(204).end();
}));

module.exports = router;
