const ticketService = require('./tickets.service');
const apiResponse = require('../../../common/utils/apiResponse');
const path = require('path');
const fs = require('fs');

module.exports.generateTicket = async (req, res) => {
    try {
        const { ticket_id, quantity, event_id } = req.body;

        if (!ticket_id || !quantity || !event_id) {
            return apiResponse.validation(res, [], 'Required fields are missing');
        }

        const result = await ticketService.generateComplementary(req);

        if (!result.success) {
            switch (result.code) {
                case 'NOT_FOUND':
                    return apiResponse.error(res, result.message, 404);
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred');
                default:
                    return apiResponse.error(res, result.message || 'Something went wrong');
            }
        }

        return apiResponse.success(res, 'Ticket generated successfully', result.data);

    } catch (error) {
        console.error('Generate Ticket Error:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};

/* 🎟️ PRINT COMPLIMENTARY TICKETS */
module.exports.printCompsTickets = async (req, res) => {
    try {
        const result = await ticketService.getCompsTicketsForPrint(req);

        if (!result.success) {
            return apiResponse.error(res, result.message, result.code === 'NOT_FOUND' ? 404 : 400);
        }

        return apiResponse.success(res, 'Complimentary tickets fetched', result.data);

    } catch (error) {
        console.error('Print Comps Tickets Error:', error);
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
                    return apiResponse.error(res, 'You are not authorized to delete this ticket');
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

module.exports.listTicketsByEvent = async (req, res) => {
    try {
        const { event_id } = req.params;

        // ✅ Validate event_id
        if (!event_id) {
            return apiResponse.validation(res, [], 'Event ID is required');
        }

        // ✅ Call service to fetch tickets
        const result = await ticketService.listTicketsByEvent(event_id);

        // ✅ Handle service-layer errors
        if (!result.success) {
            switch (result.code) {
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Event not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while fetching tickets');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, 'Tickets fetched successfully', result.data);

    } catch (error) {
        console.error('Error in listTicketsByEvent:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};

module.exports.getTicketDetail = async (req, res) => {
    try {
        const { ticket_id } = req.params;

        // ✅ Validate ticket_id
        if (!ticket_id) {
            return apiResponse.validation(res, [], 'Ticket ID is required');
        }

        // ✅ Call service to fetch ticket details
        const result = await ticketService.getTicketDetail(ticket_id);

        // ✅ Handle service-layer errors
        if (!result.success) {
            switch (result.code) {
                case 'TICKET_NOT_FOUND':
                    return apiResponse.notFound(res, 'Ticket not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while fetching ticket detail');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, 'Ticket details fetched successfully', result.data);

    } catch (error) {
        console.error('Error in getTicketDetail:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};
