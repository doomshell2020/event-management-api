const dashboardService = require('./dashboard.service');
const apiResponse = require('../../../../common/utils/apiResponse');

module.exports.getLatestEvents = async (req, res) => {
    try {
        const result = await dashboardService.getLatestEvents(req, res);
        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        return apiResponse.success(
            res,
            result.message || 'Latest Event fetched successfully.',
            { events: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in getEventList controller:', error);
        return apiResponse.error(res, 'An unexpected error occurred while fetching event.' + error.message, 500);
    }
};


module.exports.getTicketList = async (req, res) => {
    try {
        const result = await dashboardService.getTicketList(req, res);
        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        return apiResponse.success(
            res,
            result.message || 'Tickets fetched successfully.',
            { tickets: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in getTicketList controller:', error);
        return apiResponse.error(res, 'An unexpected error occurred while fetching event.' + error.message, 500);
    }
};


module.exports.getDashboardCounts = async (req, res) => {
    const response = await dashboardService.getDashboardCounts(req, res);
    return res.status(response.success ? 200 : 401).json(response);
};


module.exports.getPaymentChartData = async (req, res) => {
    const response = await dashboardService.getPaymentChartData(req, res);
    return res.status(200).json(response);
};

module.exports.getPaymentPieChart = async (req, res) => {
    const response = await dashboardService.getPaymentPieChart(req, res);
    return res.status(200).json(response);
};
