const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({});

// Test connection on startup
prisma.$connect()
  .then(() => console.log('Connected to PostgreSQL database via Prisma'))
  .catch(err => console.error('Database connection error:', err.message));

module.exports = prisma;
