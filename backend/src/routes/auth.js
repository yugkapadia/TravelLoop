const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getQuery, runQuery } = require('../db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword?.startsWith('pbkdf2$')) {
    return password === storedPassword;
  }

  const [, salt, storedHash] = storedPassword.split('$');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const result = await runQuery(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hashPassword(password)]
    );
    res.status(201).json({ user: { id: result.lastID, name: name.trim(), email: email.trim().toLowerCase() } });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await getQuery(
      'SELECT id, name, email, password FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.password.startsWith('pbkdf2$')) {
      await runQuery('UPDATE users SET password = ? WHERE id = ?', [hashPassword(password), user.id]);
    }

    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

module.exports = router;
