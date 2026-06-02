const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
// const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import API routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const openCourseRoutes = require('./routes/openCourseRoutes');
const classRoutes = require('./routes/classRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const appealRoutes = require('./routes/appealRoutes');
const tuitionRoutes = require('./routes/tuitionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const semesterRoutes = require('./routes/semesterRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const roleRoutes = require('./routes/roleRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const majorRoutes = require('./routes/majorRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const beneficiaryRoutes = require('./routes/beneficiaryRoutes');
const completedCourseRoutes = require('./routes/completedCourseRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const trashRoutes = require('./routes/trashRoutes');
const periodRoutes = require('./routes/periodRoutes');
const prerequisiteRoutes = require('./routes/prerequisiteRoutes');
const roomRoutes = require('./routes/roomRoutes');
const lecturerRoutes = require('./routes/lecturerRoutes');
const prisma = require('./config/database');
const { buildErrorResponse, sendErrorResponse } = require('./utils/errorHandler');

// Import SSR view routes
const viewRoutes = require('./routes/viewRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const logoFileName = 'logo_tin_chi_hoc_phi_dark.svg';
const logoDiskPath = path.join(__dirname, '..', 'uploads', 'logos', logoFileName);
const authLogoFileName = 'logo_tin_chi_hoc_phi_light.svg';
const authLogoDiskPath = path.join(__dirname, '..', 'uploads', 'logos', authLogoFileName);

const logProcessError = (label, error) => {
  const response = buildErrorResponse(error);
  console.error(`${label}: ${response.message}`, error);
};

process.on('unhandledRejection', (reason) => {
  logProcessError('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (error) => {
  logProcessError('Uncaught exception', error);
});

function getVersionedUploadLogoUrl(fileName, diskPath) {
  try {
    const version = Math.floor(fs.statSync(diskPath).mtimeMs);
    return `/uploads/logos/${fileName}?v=${version}`;
  } catch (error) {
    return `/uploads/logos/${fileName}`;
  }
}

// ==========================================
// View Engine Setup (Pug SSR)
// ==========================================
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.disable('view cache');

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store');
  }
}));

// Static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store');
  }
}));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  res.locals.logoUrl = getVersionedUploadLogoUrl(logoFileName, logoDiskPath);
  res.locals.authLogoUrl = getVersionedUploadLogoUrl(authLogoFileName, authLogoDiskPath);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/open-courses', openCourseRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/tuition', tuitionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/majors', majorRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/completed-courses', completedCourseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/prerequisites', prerequisiteRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/lecturers', lecturerRoutes);

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
  if (req.path.startsWith('/api/')) {
    return sendErrorResponse(res, err, 'Internal server error', 'Unhandled API error');
  } else {
    const response = buildErrorResponse(err, 'Internal Server Error');
    console.error('Unhandled view error:', err);
    res.status(response.status).send(response.message);
  }
});

// Start server after the lightweight DB bootstrap has had a chance to run.
Promise.resolve(prisma.ready).finally(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Homepage: http://localhost:${PORT}/`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
});

module.exports = app;
