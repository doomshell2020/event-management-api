const eventOrganizerService = require('./eventOrganizer.service');
const apiResponse = require('../../../../common/utils/apiResponse');


module.exports.getEventOrganizerList = async (req, res) => {
    try {
        const result = await eventOrganizerService.getEventOrganizerList(req, res);
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
            result.message || 'Event organizers fetched successfully.',
            { eventOrganizers: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in getEventOrganizerList controller:', error);
        return apiResponse.error(res, 'An unexpected error occurred while fetching event organizers.' + error.message, 500);
    }
};


module.exports.createEventOrganizer = async (req, res) => {
    try {
        const result = await eventOrganizerService.createEventOrganizer(req);
        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'DUPLICATE_ERROR':
                    return apiResponse.error(res, result.message, 409);
                case 'UNAUTHORIZED':
                    return apiResponse.unauthorized(res, result.message);
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        return apiResponse.success(res, result.message, result.data);
    } catch (error) {
        return apiResponse.error(res, 'Internal server error', 500);
    }
};


module.exports.updateEventOrganizer = async (req, res) => {
    try {
        const userId = req.params.id;
        // ✅ Basic validation
        if (!userId) {
            return apiResponse.validation(res, [], 'Event Organizer ID is required');
        }
        // ✅ Call service
        const result = await eventOrganizerService.updateEventOrganizer(userId, req.body);
        // ❌ Handle service-level errors
        if (!result.success) {
            switch (result.code) {
                case 'ORGANIZER_NOT_FOUND':
                    return apiResponse.notFound(res, result.message);
                case 'DUPLICATE_ORGANIZER':
                    return apiResponse.validation(res, [], result.message);
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'DB_ERROR':
                    return apiResponse.error(res, result.message || 'Database error occurred');

                default:
                    return apiResponse.error(
                        res,
                        result.message || 'An unknown error occurred',
                        400
                    );
            }
        }

        // ✅ Success response
        return apiResponse.success(
            res,
            'Event organizer updated successfully',
            result.data
        );

    } catch (error) {
        console.error('❌ Error in updateEventOrganizer:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};


// update Status Event Organizer controller
module.exports.updateStatusEventOrganizer = async (req, res) => {
    try {
        const result = await eventOrganizerService.updateStatusEventOrganizer(req);
        if (!result.success) {
            switch (result.code) {
                case 'ORGANIZER_NOT_FOUND':
                    return apiResponse.notFound(res, 'Organizer not found');
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        return apiResponse.success(
            res,'Event Organizer Status updated successfully',
            result.data
        );
    } catch (error) {
        console.error('Error updating wellness:', error);
        return apiResponse.error(res, 'Internal Server Error');
    }
};


// user fetch profile
module.exports.getEventOrganizerById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await eventOrganizerService.getEventOrganizerById(id);

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



// Search Event Organizer 
module.exports.searchEventOrganizer = async (req, res) => {
    try {
        const result = await eventOrganizerService.searchEventOrganizer(req);

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
                        result.message || 'Failed to fetch customers'
                    );
            }
        }

        return apiResponse.success(
            res,
            result.message || 'customer search successfully...',
            { eventOrganizers: result.data }
        );

    } catch (error) {
        console.error('Error in search customer controller:', error);
        return apiResponse.error(
            res,
            'An unexpected error occurred while fetching customers',
            500
        );
    }
};