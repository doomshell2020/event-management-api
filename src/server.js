// src/server.js
require('dotenv').config(); // must be first line
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sequelize } = require('./models'); // ✅ connection + models + associations
// const sequelize = require('./config/database');

const config = require('./config/app');
const apiResponse = require('../src/common/utils/apiResponse');
const cookieParser = require('cookie-parser');

// Load environment variables

// console.log('🔍 ENV CHECK ---');
// console.log('DB_HOST:', process.env.DB_HOST);
// console.log('DB_NAME:', process.env.DB_NAME);
// console.log('DB_USER:', process.env.DB_USER);
// console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NOT FOUND');
// console.log('PORT:', process.env.PORT);
// console.log('----------------');

// Import Routes
const authRoutesV1 = require('./modules/v1/auth/auth.routes');
const eventsRoutesV1 = require('./modules/v1/events/events.routes');
const commonRoutesV1 = require('./modules/v1/common/common.routes');
const ticketsRoutesV1 = require('./modules/v1/tickets/tickets.routes');
const addonsRoutesV1 = require('./modules/v1/addons/addons.routes');
const questionsRoutesV1 = require('./modules/v1/questions/questions.routes');
const packagesRoutesV1 = require('./modules/v1/package/package.routes');
const cartRoutesV1 = require('./modules/v1/cart/cart.routes');
const ordersRoutesV1 = require('./modules/v1/orders/orders.route');
const wellnessRoutesV1 = require('./modules/v1/wellness/wellness.routes');
const paymentRoutesV1 = require('./modules/v1/payment/payment.routes');


const eventsRoutesV2 = require('./modules/v2/events/events.routes');
const ticketsRoutesV2 = require('./modules/v2/tickets/tickets.routes');
// const subscriptionsRoutesV1 = require('./modules/v1/subscriptions/subscriptions.routes');
// const apiKeysRoutesV1 = require('./modules/v1/apiKeys/apiKeys.routes');

// Admin Routes...
const authAdminRoutesV1 = require('./modules/v1/admin/auth/auth.routes');
const eventOrganizerAdminRoutesV1 = require('./modules/v1/admin/event-organizer/eventOrganizer.routes');
const eventAdminRoutesV1 = require('./modules/v1/admin/event/event.routes');
const ordersAdminRoutesV1 = require('./modules/v1/admin/orders/orders.routes');
const ticketsAdminRoutesV1 = require('./modules/v1/admin/tickets/tickets.routes');


// Initialize Express
const app = express();

// ---------------- STRIPE WEBHOOK (RAW BODY FIRST) ----------------
app.use(
  "/api/v1/payment/webhook",
  bodyParser.raw({ type: "application/json" })
);

// Middleware
app.use(cors(config.corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Simple request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Test route
app.get('/', (req, res) => {
    return apiResponse.success(res, 'Event Management API is running!');
});

// API v1 routes
app.use('/api/v1/common', commonRoutesV1);
app.use('/api/v1/auth', authRoutesV1);
app.use('/api/v1/events', eventsRoutesV1);
app.use('/api/v1/tickets', ticketsRoutesV1);
app.use('/api/v1/addons', addonsRoutesV1);
app.use('/api/v1/questions', questionsRoutesV1);
app.use('/api/v1/packages', packagesRoutesV1);
app.use('/api/v1/cart', cartRoutesV1);
app.use('/api/v1/orders', ordersRoutesV1);
app.use('/api/v1/wellness',wellnessRoutesV1);
app.use('/api/v1/payment',paymentRoutesV1);

// app.use('/api/v1/subscriptions', subscriptionsRoutesV1);
// app.use('/api/v1/api-keys', apiKeysRoutesV1);

// API v2 routes
app.use('/api/v2/events', eventsRoutesV2);
app.use('/api/v2/tickets', ticketsRoutesV2);

// API V1 Admin Routes
app.use('/api/v1/admin/auth',authAdminRoutesV1)
app.use('/api/v1/admin/event-organizer',eventOrganizerAdminRoutesV1)
app.use('/api/v1/admin/events',eventAdminRoutesV1)
app.use('/api/v1/admin/orders',ordersAdminRoutesV1)
app.use('/api/v1/admin/tickets',ticketsAdminRoutesV1)




// Handle 404 errors
app.use((req, res) => {
    return apiResponse.notFound(res, 'API endpoint not found');
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global Error:', err);
    return apiResponse.error(res, err.message || 'Internal Server Error', err.status || 500);
});


// Connect to MySQL and start server
const PORT = config.port || 5000;

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');
        app.listen(PORT, () => {
            console.log(`Server running on port http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1); // Exit process with failure
    }
};

startServer();
