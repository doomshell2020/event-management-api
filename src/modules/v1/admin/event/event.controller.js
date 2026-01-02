const eventService = require('./event.service');
const apiResponse = require('../../../../common/utils/apiResponse');

module.exports.getEventList = async (req, res) => {
    try {
        const result = await eventService.getEventList(req, res);
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
            { events: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in getEventList controller:', error);
        return apiResponse.error(res, 'An unexpected error occurred while fetching event.' + error.message, 500);
    }
};



// update Status Event controller
module.exports.updateStatusEvent = async (req, res) => {
    try {
        const result = await eventService.updateStatusEvent(req);
        if (!result.success) {
            switch (result.code) {
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Event not found');
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        return apiResponse.success(
            res,'Event Status updated successfully',
            result.data
        );
    } catch (error) {
        console.error('Error updating event:', error);
        return apiResponse.error(res, 'Internal Server Error');
    }
};


// update featured Status Event controller
module.exports.updateEventFeatured = async (req, res) => {
    try {
        const result = await eventService.updateEventFeatured(req);
        if (!result.success) {
            switch (result.code) {
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Event not found');
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        return apiResponse.success(
            res,'Event Featured updated successfully',
            result.data
        );
    } catch (error) {
        console.error('Error updating event:', error);
        return apiResponse.error(res, 'Internal Server Error');
    }
};

// Delete Event Controller
module.exports.deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID param
        if (!id) {
            return apiResponse.validation(res, [], 'Event ID is required');
        }

        // Call service to delete event
        const result = await eventService.deleteEvent(req);

        // Handle service-layer errors
        if (!result.success) {
            switch (result.code) {
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Event not found');

                case 'FORBIDDEN':
                    return apiResponse.forbidden(
                        res,
                        'You are not authorized to delete this event'
                    );

                case 'DB_ERROR':
                    return apiResponse.error(
                        res,
                        'Database error occurred while deleting event'
                    );

                default:
                    return apiResponse.error(
                        res,
                        result.message || 'An unknown error occurred'
                    );
            }
        }

        // Success response
        return apiResponse.success(res, 'Event deleted successfully');
    } catch (error) {
        console.error('Error in deleteEvent:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};

// get event ticket type
module.exports.getTicketTypesByEvent = async (req, res) => {
    try {
        const result = await eventService.getTicketTypesByEvent(req, res);
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
            result.message || 'Ticket types fetched successfully.',
            { events: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in Ticket types controller:', error);
        return apiResponse.error(res, 'An unexpected error occurred while fetching Ticket types.' + error.message, 500);
    }
};



// Search Event Controller
module.exports.searchEventList = async (req, res) => {
    try {
        const result = await eventService.searchEventList(req);

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
            { events: result.data }
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

// Get Event Staff Controller
module.exports.getEventStaff = async (req, res) => {
    try {
        const result = await eventService.getEventStaff(req);

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
                        result.message || 'Failed to fetch event staff'
                    );
            }
        }

        return apiResponse.success(
            res,
            result.message || 'Event staff fetched successfully',
            { staff: result.data }
        );

    } catch (error) {
        console.error('Error in getEventStaff controller:', error);
        return apiResponse.error(
            res,
            'An unexpected error occurred while fetching event staff',
            500
        );
    }
};



// user fetch profile
module.exports.getEventOrganizerById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await eventService.getEventOrganizerById(id);

        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'ORGANIZER_NOT_FOUND':
                    return apiResponse.notFound(res, result.message);
                default:
                    return apiResponse.error(res, result.message);
            }
        }

        return apiResponse.success(
            res,
            result.message,
            result.data
        );

    } catch (error) {
        console.error('Error in getEventOrganizerById controller:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
};



// Get Event details with particular order details - Controller
module.exports.getEventDetailsWithOrderDetails = async (req, res) => {
    try {
        const result = await eventService.getEventDetailsWithOrderDetails(req);

        if (!result.success) {
            switch (result.code) {
                case "VALIDATION_ERROR":
                    return apiResponse.validation(res, [], result.message);

                case "NOT_FOUND":
                    return apiResponse.notFound(res, result.message);

                default:
                    return apiResponse.error(res, result.message);
            }
        }

        return apiResponse.success(
            res,
            result.message || "Event details fetched successfully.",
            { event: result.data }
        );

    } catch (error) {
        console.error("Error in event controller:", error);

        return apiResponse.error(
            res,
            "An unexpected error occurred while fetching event details.",
            500
        );
    }
};
