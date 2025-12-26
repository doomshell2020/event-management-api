const eventService = require('./events.service');
const apiResponse = require('../../../common/utils/apiResponse');
const path = require('path');
const fs = require('fs');

module.exports.searchEvents = async (req, res) => {
    try {
        const loginId = req.user.id;
        const { keyword } = req.query;

        // ✅ Keyword is required
        if (!keyword || !keyword.trim()) {
            return apiResponse.validation(
                res,
                [],
                'Search keyword is required'
            );
        }

        // ✅ Call service
        const result = await eventService.searchEvents({ keyword: keyword.trim(), loginId });

        if (!result.success) {
            switch (result.code) {
                case 'NOT_FOUND':
                    return apiResponse.success(
                        res,
                        'No events found',
                        { events: [] }
                    );

                default:
                    return apiResponse.error(
                        res,
                        result.message || 'Failed to search events'
                    );
            }
        }

        // ✅ Success
        return apiResponse.success(
            res,
            'Events fetched successfully',
            { events: result.data }
        );

    } catch (error) {
        console.error('Error in searchEvents controller:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
};

module.exports.eventList = async (req, res) => {
    try {
        const result = await eventService.eventList(req, res);

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
            result.message || 'Event list fetched successfully',
            { events: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in eventList controller:', error);
        return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
    }
};

module.exports.publicEventDetail = async (req, res) => {
    try {
        const result = await eventService.publicEventDetail(req, res);

        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);

                case 'NOT_FOUND':
                    return apiResponse.error(res, result.message, 404);

                case 'INTERNAL_ERROR':
                default:
                    return apiResponse.error(res, result.message, 500);
            }
        }

        return apiResponse.success(
            res,
            result.message || 'Event details fetched successfully',
            { event: result.data } // renamed to event (single)
        );

    } catch (error) {
        console.log('Error in publicEventDetail controller:', error);
        return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
    }
};

module.exports.publicEventList = async (req, res) => {
    try {
        const result = await eventService.publicEventList(req, res);

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
            result.message || 'Event list fetched successfully',
            { events: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in eventList controller:', error);
        return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
    }
};

module.exports.createEvent = async (req, res) => {
    try {
        // ✅ Check if image is uploaded
        if (!req.file) {
            return apiResponse.validation(res, [], 'Event image (feat_image) is required');
        }

        const { filename } = req.file;
        const uploadFolder = path.join(process.cwd(), 'uploads/events');
        const fullFilePath = path.join(uploadFolder, filename);

        // ✅ Get POST data
        const {
            name,
            desp,
            date_from,
            date_to,
            location,
            company_id,
            country_id,
            payment_currency,
            slug,
            is_free,
            ticket_limit,
            sale_start,
            sale_end,
            approve_timer,
            allow_register,
            request_rsvp,
            video_url,
            event_timezone
        } = req.body;

        // ✅ Required field validation
        if (
            !name ||
            !desp ||
            !date_from ||
            !date_to ||
            !location ||
            !company_id ||
            !country_id ||
            !slug
        ) {
            return apiResponse.validation(res, [], 'Please complete all required fields before submitting the form');
        }


        // Conditional validation for paid events
        if (is_free !== 'Y') {
            if (!ticket_limit || !payment_currency || !sale_start || !sale_end || !approve_timer) {
                return apiResponse.validation(res, [], 'Paid events require ticket_limit, payment_currency, sale_start, sale_end, and approve_timer');
            }
        }

        // Call service to create event
        const result = await eventService.createEvent(req, res);

        // Handle service errors
        if (!result.success) {
            if (fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
                console.log('🧹 Uploaded image removed due to DB failure:', fullFilePath);
            }

            switch (result.code) {
                case 'DUPLICATE_ERROR':
                    return apiResponse.conflict(res, result.message); // 409
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message); // 422
                case 'INVALID_IMAGE':
                    return apiResponse.validation(res, [], result.message); // 422
                default:
                    return apiResponse.error(res, result.message); // 500
            }
        }

        // Success response
        return apiResponse.success(
            res,
            result.message || 'Event created successfully!',
            { event: result.event }
        );

    } catch (error) {
        // Delete uploaded file if any error occurs
        if (fs.existsSync(fullFilePath)) {
            fs.unlinkSync(fullFilePath);
            console.log('🧹 Uploaded image removed due to server error:', fullFilePath);
        }
        console.error('Error in createEvent controller:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
};

module.exports.updateEvent = async (req, res) => {
    let fullFilePath; // define outside try so it's accessible in catch
    try {
        const eventId = req.params.id;
        const updateData = { ...req.body };

        // Include uploaded image if exists
        if (req.file) {
            updateData.feat_image = req.file.filename;

            const { filename } = req.file;
            const uploadFolder = path.join(process.cwd(), 'uploads/events');
            fullFilePath = path.join(uploadFolder, filename);
        }

        // Call service to update event
        const result = await eventService.updateEvent(eventId, updateData, req.user);

        if (!result.success) {
            // If DB update failed, delete the uploaded file
            if (fullFilePath && fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
                console.log('🧹 Uploaded image removed due to DB failure:', fullFilePath);
            }

            switch (result.code) {
                case 'DUPLICATE_ERROR':
                    return apiResponse.conflict(res, result.message); // 409
                case 'NOT_FOUND':
                    return apiResponse.validation(res, [], result.message); // 404
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message); // 422
                default:
                    return apiResponse.error(res, result.message); // 500
            }
        }

        return apiResponse.success(res, 'Event updated successfully', { event: result.event });

    } catch (error) {
        // Delete uploaded file if any error occurs
        if (fullFilePath && fs.existsSync(fullFilePath)) {
            fs.unlinkSync(fullFilePath);
            console.log('🧹 Uploaded image removed due to server error:', fullFilePath);
        }
        console.error('Error in updateEvent controller:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
};

module.exports.companyCreateEvent = async (req, res) => {
    try {
        const { companyName } = req.body;
        if (!companyName) {
            return apiResponse.validation(res, [], 'Company name is required');
        }
        req.body.name = companyName;

        const result = await eventService.companyCreateEvent(req, res);
        if (!result.success) {
            switch (result.code) {
                case 'DUPLICATE_ERROR':
                    return apiResponse.conflict(res, result.message); // 409
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message); // 422
                default:
                    return apiResponse.error(res, result.message); // 500
            }
        }
        return apiResponse.success(
            res,
            result.message || 'Company created successfully!',
            { company: result.company }
        );
    } catch (error) {
        console.error('Error in companyCreateEvent controller:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
}

module.exports.companyList = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) {
            return apiResponse.validation(res, [], 'User not authenticated');
        }
        const result = await eventService.companyList(req, res);
        if (!result.success) {
            return apiResponse.error(res, result.message); // 500
        }
        return apiResponse.success(
            res,
            result.message || 'Company list fetched successfully!',
            { companies: result.companies }
        );
    } catch (error) {
        console.error('Error in companyList controller:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
}

module.exports.deleteEvent = async (req, res) => {
    try {
        const eventId = req.params.id;

        if (!eventId) {
            return apiResponse.validation(res, [], "Event ID is required");
        }

        // ✅ Call service layer
        const result = await eventService.deleteEvent(eventId);

        // ✅ Handle service-level results
        if (!result.success) {
            switch (result.code) {
                case "NOT_FOUND":
                    return apiResponse.notFound(res, "Event not found");
                case "DB_ERROR":
                    return apiResponse.error(res, "Database error occurred while deleting event");
                case "VALIDATION_FAILED":
                    return apiResponse.validation(res, [], result.message);
                default:
                    return apiResponse.error(res, result.message || "Unknown error occurred");
            }
        }

        // ✅ Success Response
        return apiResponse.success(res, "Event deleted successfully", result.data);

    } catch (error) {
        console.error("Error in deleteEvent:", error);
        return apiResponse.error(res, "Internal Server Error", 500);
    }
};
