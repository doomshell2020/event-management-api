require('dotenv').config(); // must be first line
const config = {
  // Server
  port: process.env.PORT || 5000,
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'yourjwtsecret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  tokenExpiresIn: process.env.TOKEN_EXPIRES_IN || '1h',
  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'dbname',
  },
  // Stripe (if you use payments)
  stripeKey: process.env.STRIPE_SECRET_KEY || '',
  // CORS
  corsOptions: {
    origin: '*', // Change to your client URL in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  },
  // Email verification / client URL
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5000',
  // SMTP / email config
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

module.exports = config;