const ticketService = require('./tickets.service');
const apiResponse = require('../../../../common/utils/apiResponse');

module.exports.getTicketList = async (req, res) => {
    try {
        const result = await ticketService.getTicketList(req, res);
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


// Search Event Controller
module.exports.searchTicketList = async (req, res) => {
    try {
        const result = await ticketService.searchTicketList(req);

        if (!result.success) {
            switch (result.code) {
                case 'UNAUTHORIZED':
                    return apiResponse.unauthorized(
                        res,
                        result.message || 'Unauthorized access'
                    );

                case 'VALIDATION_ERROR':
                    return apiResponse.validation(
                        res,
                        [],
                        result.message
                    );

                case 'INTERNAL_SERVER_ERROR':
                    return apiResponse.error(
                        res,
                        result.message || 'Internal server error'
                    );

                default:
                    return apiResponse.error(
                        res,
                        result.message || 'Failed to fetch events'
                    );
            }
        }

        return apiResponse.success(
            res,
            result.message || 'Events fetched successfully',
            { tickets: result.data }
        );

    } catch (error) {
        console.error('Error in searchEventList controller:', error);
        return apiResponse.error(
            res,
            'An unexpected error occurred while fetching events',
            500
        );
    }
};


// controllers/ticket.controller.js
module.exports.getTicketsWithEventIdAndType = async (req, res) => {
    try {
        const result = await ticketService.getTicketsWithEventIdAndType(req);

        if (!result.success) {
            switch (result.code) {
                case 'UNAUTHORIZED':
                    return apiResponse.unauthorized(res, result.message);

                case 'VALIDATION_ERROR':
                    return apiResponse.validation(res, [], result.message);

                default:
                    return apiResponse.error(res, result.message);
            }
        }

        return apiResponse.success(
            res,
            result.message || 'Tickets fetched successfully.',
            { tickets: result.data }
        );
    } catch (error) {
        console.error('Error in getTicketsWithEventIdAndType controller:', error);
        return apiResponse.error(
            res,
            'An unexpected error occurred while fetching tickets.',
            500
        );
    }
};


module.exports.getOrderItemsByItem = async (req, res) => {
    try {
        const result = await ticketService.getOrderItemsByItem(req);

        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_ERROR':
                    return apiResponse.validation(res, [], result.message);
                case 'UNAUTHORIZED':
                    return apiResponse.unauthorized(res, result.message);
                default:
                    return apiResponse.error(res, result.message);
            }
        }

        return apiResponse.success(
            res,
            result.message,
            { items: result.data }
        );
    } catch (error) {
        console.error('Controller error:', error);
        return apiResponse.error(
            res,
            'Unexpected error occurred',
            500
        );
    }
};