const express = require('express');
const router = express.Router();
const { allQuery } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { cleanText } = require('../utils/request');

router.get('/', asyncHandler(async (req, res) => {
  const q = cleanText(req.query.q);
  const type = cleanText(req.query.type).toLowerCase();
  const category = cleanText(req.query.category).toLowerCase();

  const filters = [];
  const params = [];

  if (q) {
    filters.push('(LOWER(title) LIKE ? OR LOWER(location) LIKE ? OR LOWER(summary) LIKE ?)');
    const pattern = `%${q.toLowerCase()}%`;
    params.push(pattern, pattern, pattern);
  }

  if (['activity', 'destination'].includes(type)) {
    filters.push('type = ?');
    params.push(type);
  }

  if (category) {
    filters.push('LOWER(category) = ?');
    params.push(category);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const results = await allQuery(
    `SELECT id, type, title, location, category, estimated_cost, summary, source_url
      FROM discovery_catalog
      ${where}
      ORDER BY type, title
      LIMIT 50`,
    params
  );

  res.json({ results });
}));

module.exports = router;
