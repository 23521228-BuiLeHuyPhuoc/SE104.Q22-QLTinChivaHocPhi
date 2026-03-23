const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import API routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const classRoutes = require('./routes/classRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const tuitionRoutes = require('./routes/tuitionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const semesterRoutes = require('./routes/semesterRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const roleRoutes = require('./routes/roleRoutes');

// Import SSR view routes
const viewRoutes = require('./routes/viewRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// View Engine Setup (Pug SSR)
// ==========================================
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' }
});

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: { success: false, message: 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút' }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter); // Apply general rate limiting to all routes

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes - Apply stricter rate limiting to auth routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/tuition', tuitionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/roles', roleRoutes);

// ==========================================
// SSR View Routes (Pug pages)
// ==========================================
app.use('/', viewRoutes);

// 404 handler - serve JSON for API, render page for views
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  } else {
    res.status(404).render('pages/login', {
      pageTitle: 'Trang không tìm thấy'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  if (req.path.startsWith('/api/')) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } else {
    res.status(500).send('Internal Server Error');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Homepage: http://localhost:${PORT}/`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
