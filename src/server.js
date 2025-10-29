// src/server.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models'); // ✅ connection + models + associations
// const sequelize = require('./config/database');

const config = require('./config/app');
const apiResponse = require('../src/common/utils/apiResponse');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

// Import Routes
const authRoutesV1 = require('./modules/v1/auth/auth.routes');
const eventsRoutesV1 = require('./modules/v1/events/events.routes');
const commonRoutesV1 = require('./modules/v1/common/common.routes');
const ticketsRoutesV1 = require('./modules/v1/tickets/tickets.routes');
const addonsRoutesV1 = require('./modules/v1/addons/addons.routes');
const questionsRoutesV1 = require('./modules/v1/questions/questions.routes');
const packagesRoutesV1 = require('./modules/v1/package/package.routes');

// const subscriptionsRoutesV1 = require('./modules/v1/subscriptions/subscriptions.routes');
// const apiKeysRoutesV1 = require('./modules/v1/apiKeys/apiKeys.routes');

// Initialize Express
const app = express();

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
// app.use('/api/v1/subscriptions', subscriptionsRoutesV1);
// app.use('/api/v1/api-keys', apiKeysRoutesV1);


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
