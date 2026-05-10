const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { getQuery, runQuery } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { buildBudgetSummary, buildCalendarEvents, getTripOverview } = require('../utils/tripData');
const { cleanText, parsePositiveInt } = require('../utils/request');

function makeShareCode() {
  return crypto.randomBytes(8).toString('base64url');
}

router.post('/trips/:tripId', asyncHandler(async (req, res) => {
  const tripId = parsePositiveInt(req.params.tripId);
  const shareType = cleanText(req.body.shareType).toLowerCase() === 'friend' ? 'friend' : 'public';
  const friendEmail = shareType === 'friend' ? cleanText(req.body.friendEmail).toLowerCase() : '';

  if (!tripId) {
    return res.status(400).json({ error: 'Valid tripId is required.' });
  }
  if (shareType === 'friend' && !friendEmail) {
    return res.status(400).json({ error: 'friendEmail is required for friend shares.' });
  }

  const trip = await getQuery('SELECT id FROM trips WHERE id = ?', [tripId]);
  if (!trip) {
    return res.status(404).json({ error: 'Trip not found.' });
  }

  let code = makeShareCode();
  let result;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      result = await runQuery(
        `INSERT INTO shared_trips (trip_id, public_code, share_type, friend_email)
          VALUES (?, ?, ?, ?)`,
        [tripId, code, shareType, friendEmail || null]
      );
      break;
    } catch (err) {
      if (!err.message.includes('UNIQUE constraint failed') || attempt === 2) {
        throw err;
      }
      code = makeShareCode();
    }
  }

  await runQuery('UPDATE trips SET visibility = ? WHERE id = ?', [shareType === 'public' ? 'public' : 'private', tripId]);
  res.status(201).json({
    share: {
      id: result.lastID,
      trip_id: tripId,
      public_code: code,
      share_type: shareType,
      friend_email: friendEmail || null,
      url: `/share/${code}`,
    },
  });
}));

router.get('/:publicCode', asyncHandler(async (req, res) => {
  const publicCode = cleanText(req.params.publicCode);
  if (!publicCode) {
    return res.status(400).json({ error: 'Share code is required.' });
  }

  const share = await getQuery(
    `SELECT * FROM shared_trips
      WHERE public_code = ? AND revoked_at IS NULL`,
    [publicCode]
  );
  if (!share) {
    return res.status(404).json({ error: 'Shared trip not found.' });
  }

  const overview = await getTripOverview(share.trip_id);
  if (!overview) {
    return res.status(404).json({ error: 'Trip not found.' });
  }

  res.json({
    share,
    trip: overview.trip,
    stops: overview.stops,
    calendar: buildCalendarEvents(overview),
    budget: buildBudgetSummary(overview),
  });
}));

router.delete('/:publicCode', asyncHandler(async (req, res) => {
  const publicCode = cleanText(req.params.publicCode);
  if (!publicCode) {
    return res.status(400).json({ error: 'Share code is required.' });
  }

  const result = await runQuery(
    'UPDATE shared_trips SET revoked_at = CURRENT_TIMESTAMP WHERE public_code = ? AND revoked_at IS NULL',
    [publicCode]
  );
  if (!result.changes) {
    return res.status(404).json({ error: 'Shared trip not found.' });
  }

  res.status(204).end();
}));

module.exports = router;
