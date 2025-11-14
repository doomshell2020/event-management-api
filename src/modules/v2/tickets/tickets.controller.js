const ticketService = require('./tickets.service');
const apiResponse = require('../../../common/utils/apiResponse');
const path = require('path');
const fs = require('fs');

// getTicketPricing
module.exports.getTicketPricing = async (req, res) => {
    try {
        const eventId = req.params.event_id;
        // ✅ Validate ID param
        if (!eventId) {
            return apiResponse.validation(res, [], 'Event ID is required');
        }
        // ✅ Call service to get ticket pricing
        const result = await ticketService.getTicketPricing(req);
        // ✅ Handle service-layer errors
        if (!result.success) {
            switch (result.code) {
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Event not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while fetching ticket pricing');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }
        // ✅ Success response
        return apiResponse.success(res, 'Ticket pricing fetched successfully', result.data);
    } catch (error) {
        console.error('Error in getTicketPricing:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};

module.exports.createTicket = async (req, res) => {
    try {
        // ✅ Handle optional file safely
        const filename = req.file?.filename || null;
        const uploadFolder = path.join(process.cwd(), 'uploads/tickets');
        const fullFilePath = filename ? path.join(uploadFolder, filename) : null;

        // ✅ Validate required fields
        const { event_id, title, access_type, price, count, hidden } = req.body;

        if (!event_id || !title || !access_type) {
            return apiResponse.validation(res, [], 'Required fields are missing');
        }

        if ((!price || !count)) {
            if (fullFilePath && fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
                console.log('🧹 Uploaded image removed due to DB failure:', fullFilePath);
            }
            return apiResponse.validation(res, [], 'Price and count are required for open_sales type');
        }

        // ✅ Call service to create ticket
        const result = await ticketService.createTicket(req);

        // ✅ Handle service errors
        if (!result.success) {
            if (fullFilePath && fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
                console.log('🧹 Uploaded image removed due to DB failure:', fullFilePath);
            }

            switch (result.code) {
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Associated event not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while creating ticket');
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'DUPLICATE_TICKET':
                    return apiResponse.conflict(res, result.message || '');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, 'Ticket created successfully', result.data);

    } catch (error) {
        console.error('Error in createTicket:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};

module.exports.updateTicket = async (req, res) => {
    try {
        const ticketId = req.params.id;

        // ✅ Handle optional file upload
        const filename = req.file?.filename || null;
        const uploadFolder = path.join(process.cwd(), 'uploads/tickets');
        const fullFilePath = filename ? path.join(uploadFolder, filename) : null;

        // ✅ Validate ID param
        if (!ticketId) {
            if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);
            return apiResponse.validation(res, [], 'Ticket ID is required');
        }

        // ✅ Validate fields
        const { title, price, count, type } = req.body;

        // ✅ If type is open_sales → price and count are required
        if (type == 'open_sales') {
            if (!price || !count) {
                if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);
                return apiResponse.validation(res, [], 'Price and count are required for open_sales type');
            }
        }

        // ✅ If type is comps → price should be ignored (set to null), but count is still required
        if (type == 'comps') {
            if (!count) {
                if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);
                return apiResponse.validation(res, [], 'Count is required for comps type');
            }
        }


        // ✅ Call service to update ticket
        const result = await ticketService.updateTicket(req);

        // ✅ Handle service-layer errors
        if (!result.success) {
            if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);

            switch (result.code) {
                case 'TICKET_NOT_FOUND':
                    return apiResponse.notFound(res, 'Ticket not found');
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Associated event not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while updating ticket');
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'DUPLICATE_TICKET':
                    return apiResponse.conflict(res, result.message || '');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, 'Ticket updated successfully', result.data);

    } catch (error) {
        console.error('Error in updateTicket:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};

module.exports.deleteTicket = async (req, res) => {
    try {
        const ticketId = req.params.id;

        // ✅ Validate ID param
        if (!ticketId) {
            return apiResponse.validation(res, [], 'Ticket ID is required');
        }

        // ✅ Call service to delete ticket
        const result = await ticketService.deleteTicket(req);

        // ✅ Handle service-layer errors
        if (!result.success) {
            switch (result.code) {
                case 'TICKET_NOT_FOUND':
                    return apiResponse.notFound(res, 'Ticket not found');
                case 'FORBIDDEN':
                    return apiResponse.forbidden(res, 'You are not authorized to delete this ticket');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while deleting ticket');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, 'Ticket deleted successfully');

    } catch (error) {
        console.error('Error in deleteTicket:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};

module.exports.setTicketPricing = async (req, res) => {
    try {
        const { event_id, ticket_type_id, price} = req.body;

        // ✅ Validate required fields (extra safety, though route already validates)
        if (!event_id || !ticket_type_id || price == undefined) {
            return apiResponse.validation(res, [], 'All fields are required: event_id, ticket_type_id, price');
        }

        const result = await ticketService.setTicketPricing(req);

        if (!result.success) {
            switch (result.code) {
                case 'TICKET_NOT_FOUND':
                    return apiResponse.notFound(res, 'Ticket type not found');
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'SLOT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Event slot not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error while setting ticket pricing');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, result.message || 'Ticket pricing set successfully', result.data);

    } catch (error) {
        console.error('Error in setTicketPricing:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};