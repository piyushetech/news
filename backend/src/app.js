require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const newsRoutes = require('./routes/newsRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
app.set('etag', false);
connectDB();

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      process.env.CLIENT_URL,
      process.env.ADMIN_URL,
      process.env.WEB_URL,
      ...(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
    ].filter(Boolean);
    if (
      !origin
      || allowed.includes(origin)
      || (process.env.NODE_ENV !== 'production' && origin?.startsWith('http://localhost'))
    ) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json());

// Rate limit in production only — dev feeds + hot reload easily exceed 200/15min and block login.
if (process.env.NODE_ENV === 'production') {
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', message: 'Too many requests. Please try again later.' },
  }));
}

app.get('/', (req, res) => {
  res.json({ app: 'BriefNews API', version: '2.0.0', health: '/api/health' });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

module.exports = app;
