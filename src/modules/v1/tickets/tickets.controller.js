const ticketService = require('./tickets.service');
const apiResponse = require('../../../common/utils/apiResponse');
const path = require('path');
const fs = require('fs');

module.exports.createTicket = async (req, res) => {
    try {
        // ✅ Handle optional file safely
        const filename = req.file?.filename || null;
        const uploadFolder = path.join(process.cwd(), 'uploads/tickets');
        const fullFilePath = filename ? path.join(uploadFolder, filename) : null;

        // ✅ Validate required fields
        const { event_id, title, type, price, count } = req.body;

        if (!event_id || !title || !type) {
            return apiResponse.validation(res, [], 'Required fields are missing');
        }

        // ✅ If type is "open_sales", then price and count are mandatory
        if (type == 'open_sales' && (!price || !count)) {
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
        const { title, type, price, count } = req.body;

        if (type == 'open_sales' && (!price || !count)) {
            if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);
            return apiResponse.validation(res, [], 'Price and count are required for open_sales type');
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