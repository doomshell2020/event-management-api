const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const authenticate = require('../../../../middlewares/auth.middleware');


// ✅ Get Event Organizer Route
router.get('/latest-events', authenticate, dashboardController.getLatestEvents);
router.get('/latest-tickets', authenticate, dashboardController.getTicketList);
router.get('/latest-orders', authenticate, dashboardController.getOrdersList);
router.get('/dashboard-counts', authenticate, dashboardController.getDashboardCounts);
router.get('/payment-chart',dashboardController.getPaymentChartData);
router.get('/payment-pie-chart',dashboardController.getPaymentPieChart);


module.exports = router;