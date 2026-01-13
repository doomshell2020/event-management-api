const ordersService = require('./orders.service');
const apiResponse = require('../../../../common/utils/apiResponse');

module.exports.getOrdersList = async (req, res) => {
    try {
        const result = await ordersService.getOrdersList(req, res);
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
            result.message || 'Event fetched successfully.',
            { orders: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in getOrdersList controller:', error);
        return apiResponse.error(res, 'An unexpected error occurred while fetching event.' + error.message, 500);
    }
};

// Search order Controller
module.exports.searchOrdersList = async (req, res) => {
    try {
        const result = await ordersService.searchOrdersList(req);

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
            { orders: result.data }
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



// get orders by event_id controller
module.exports.getOrdersEventId = async (req, res) => {
    try {
        const { event_id } = req.params;

        if (!event_id) {
            return apiResponse.validation(res, [], 'event_id is required');
        }

        const result = await ordersService.getOrdersEventId(event_id);

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
            result.message || 'Orders fetched successfully.',
            { orders: result.data }
        );

    } catch (error) {
        console.log('Error in getOrdersEventId controller:', error);
        return apiResponse.error(
            res,
            'An unexpected error occurred while fetching orders. ' + error.message,
            500
        );
    }
};


module.exports.searchOrdersDetails = async (req, res) => {
    console.log("searchOrdersDetails-----------searchOrdersDetails")
    try {
        const result = await ordersService.searchOrdersDetails(req);

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
            { orders: result.data }
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