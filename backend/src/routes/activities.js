const express = require('express');
const router = express.Router();
const { runQuery } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { cleanText, isValidDateString, isValidTimeString, parseAmount, parsePositiveInt } = require('../utils/request');

router.post('/', asyncHandler(async (req, res) => {
  const { stopId, title, category, duration, cost, details, scheduledDate, startTime, endTime, sourceUrl } = req.body;
  const parsedStopId = parsePositiveInt(stopId);
  const cleanedTitle = cleanText(title);
  if (!parsedStopId || !cleanedTitle) {
    return res.status(400).json({ error: 'stopId and title are required.' });
  }
  if (!isValidDateString(scheduledDate) || !isValidTimeString(startTime) || !isValidTimeString(endTime)) {
    return res.status(400).json({ error: 'Schedule must use YYYY-MM-DD dates and HH:mm times.' });
  }

  const amount = parseAmount(cost);
  const result = await runQuery(
    `INSERT INTO activities
      (stop_id, title, category, duration, cost, details, scheduled_date, start_time, end_time, source_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parsedStopId,
      cleanedTitle,
      cleanText(category),
      cleanText(duration),
      amount,
      cleanText(details),
      scheduledDate || null,
      startTime || null,
      endTime || null,
      cleanText(sourceUrl),
    ]
  );
  res.status(201).json({
    activity: {
      id: result.lastID,
      stop_id: parsedStopId,
      title: cleanedTitle,
      category: cleanText(category),
      duration: cleanText(duration),
      cost: amount,
      details: cleanText(details),
      scheduled_date: scheduledDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      source_url: cleanText(sourceUrl),
    },
  });
}));

router.patch('/:activityId', asyncHandler(async (req, res) => {
  const activityId = parsePositiveInt(req.params.activityId);
  const { title, category, duration, cost, details, scheduledDate, startTime, endTime, sourceUrl } = req.body;
  const cleanedTitle = cleanText(title);
  if (!activityId || !cleanedTitle) {
    return res.status(400).json({ error: 'Valid activityId and title are required.' });
  }
  if (!isValidDateString(scheduledDate) || !isValidTimeString(startTime) || !isValidTimeString(endTime)) {
    return res.status(400).json({ error: 'Schedule must use YYYY-MM-DD dates and HH:mm times.' });
  }

  const amount = parseAmount(cost);
  const result = await runQuery(
    `UPDATE activities
      SET title = ?, category = ?, duration = ?, cost = ?, details = ?,
        scheduled_date = ?, start_time = ?, end_time = ?, source_url = ?
      WHERE id = ?`,
    [
      cleanedTitle,
      cleanText(category),
      cleanText(duration),
      amount,
      cleanText(details),
      scheduledDate || null,
      startTime || null,
      endTime || null,
      cleanText(sourceUrl),
      activityId,
    ]
  );

  if (!result.changes) {
    return res.status(404).json({ error: 'Activity not found.' });
  }

  res.json({ activity: { id: activityId, title: cleanedTitle, category: cleanText(category), duration: cleanText(duration), cost: amount, details: cleanText(details), scheduled_date: scheduledDate || null, start_time: startTime || null, end_time: endTime || null, source_url: cleanText(sourceUrl) } });
}));

router.delete('/:activityId', asyncHandler(async (req, res) => {
  const activityId = parsePositiveInt(req.params.activityId);
  if (!activityId) {
    return res.status(400).json({ error: 'Valid activityId is required.' });
  }

  const result = await runQuery('DELETE FROM activities WHERE id = ?', [activityId]);
  if (!result.changes) {
    return res.status(404).json({ error: 'Activity not found.' });
  }

  res.status(204).end();
}));

module.exports = router;
