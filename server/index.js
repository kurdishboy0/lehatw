const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Refusing to start.');
}

// 1. IMPORT ALL ROUTES HERE
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const skillRoutes = require('./routes/skillRoutes');
const hrRoutes = require('./routes/hrRoutes');
const adminRoutes = require('./routes/adminRoutes');
const jobRoutes = require('./routes/jobRoutes'); // <-- NEW: Import job routes
const applicationRoutes = require('./routes/applicationRoutes');
const matchRoutes = require('./routes/matchRoutes');
const messageRoutes = require('./routes/messageRoutes');
const searchRoutes = require('./routes/searchRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const statsRoutes = require('./routes/statsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const translationRoutes = require('./routes/translationRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const eventRoutes = require('./routes/eventRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const courseRoutes = require('./routes/courseRoutes');

const app = express();

// Which websites a browser may call this API from.
//
// In production the same service serves the built client and the API, so the
// app's own requests are same-origin and never consult this list at all. In
// development Vite proxies /api, which is also same-origin. The list is for
// everything else: it stops an unrelated page from using someone's browser to
// call this API. Requests with no Origin at all (curl, a mobile app, the Vite
// proxy, health checks) are left alone, since the browser rule doesn't apply
// to them. Set CORS_ORIGINS to a comma-separated list to add more.
const allowedOrigins = [
  ...String(process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:4173'
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// A simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: "Hello from the Lehatw backend! 🚀" });
});

// 2. USE ALL ROUTES HERE
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes); 
app.use('/api/skills', skillRoutes); 
app.use('/api/hr', hrRoutes); 
app.use('/api/admin', adminRoutes); 
app.use('/api/jobs', jobRoutes); // <-- NEW: Mount job routes
app.use('/api/applications', applicationRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/translations', translationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/courses', courseRoutes);

// In production this same service also serves the built React app, so the
// whole site lives behind one origin (no CORS/API-base-URL setup needed).
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Turn the server on
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});