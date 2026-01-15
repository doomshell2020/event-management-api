require('dotenv').config(); // must be first line

const config = {
  // Server
  port: process.env.PORT || 5000,

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'yourjwtsecret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  tokenExpiresIn: process.env.TOKEN_EXPIRES_IN || '1h',

  perPageDataLimit: process.env.PER_PAGE_DATA_LIMIT,

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'dbname',
  },

  // Stripe (if you use payments)
  stripeKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // CORS
  corsOptions: {
    origin: '*', // Change to your client URL in production
    methods: ['GET', 'POST', 'PUT', 'DELETE', "PATCH"],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  },

  // Email verification / client URL
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5000',
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',

  // SMTP / email config
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  // Email Template IDs
  emailTemplates: {
    register: process.env.REGISTER_EMAIL_TEMPLATE_ID || '13',
    forgotPassword: process.env.FORGOT_PASSWORD_EMAIL_TEMPLATE_ID || '14',
    forgotPasswordChanged: process.env.FORGOT_PASSWORD_CHANGED_EMAIL_TEMPLATE_ID || '15',
    verifyEmail: process.env.VERIFY_EMAIL_TEMPLATE_ID || '41',
    changedPassword: process.env.CHANGED_PASSWORD_EMAIL_TEMPLATE_ID || '42',
    committeeRequestTicket: process.env.COMMITTEE_REQUEST_TICKET_TEMPLATE_ID || '26',
    committeeApproveTicket: process.env.COMMITTEE_APPROVE_TICKET_TEMPLATE_ID || '27',
    committeeRejectTicket: process.env.COMMITTEE_REJECT_TICKET_TEMPLATE_ID || '28',
    committeePushTicketsToUser: process.env.COMMITTEE_PUSH_TICKETS_TO_USER_TEMPLATE_ID || '44',
    orderConfirmationWithQR: process.env.ORDER_CONFIRMATION_WITH_QR_TEMPLATE_ID || '30',
    complimentaryTicket: process.env.COMPLIMENTARY_TICKET_TEMPLATE_ID || '31',
    addStaffForEvent: process.env.ADD_STAFF_FOR_EVENT_TEMPLATE_ID || '33',
    changeStaffPassword: process.env.CHANGE_STAFF_PASSWORD_TEMPLATE_ID || '37',
    newEventCreated: process.env.NEW_EVENT_CREATED_TEMPLATE_ID || '18',
  },

  // -------------------------
  // 🔐 SECURITY CONFIG
  // -------------------------
  security: {
    qrSecretV1: process.env.QR_SECRET_V1 || 'default_qr_secret_v1',
  },
};

module.exports = config;
