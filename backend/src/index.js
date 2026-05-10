const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');
const stopRoutes = require('./routes/stops');
const activityRoutes = require('./routes/activities');
const expenseRoutes = require('./routes/expenses');
const checklistRoutes = require('./routes/checklist');
const noteRoutes = require('./routes/notes');
const discoveryRoutes = require('./routes/discovery');
const shareRoutes = require('./routes/shares');
const hotelRoutes = require('./routes/hotels');

const app = express();
const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/hotels', hotelRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'TravelLoop Backend' });
});

app.get('/', (req, res) => {
  res.json({
    app: 'TravelLoop API',
    status: 'running',
    health: '/api/health',
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'Origin is not allowed by CORS.' });
    return;
  }
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

async function start(port = PORT) {
  await initDb();
  return app.listen(port, () => {
    console.log(`Traveloop backend listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Database initialization failed', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  start,
};
