const ticketService = require('./tickets.service');
const apiResponse = require('../../../common/utils/apiResponse');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const config = require('../../../config/app');
const { sequelize, Orders, OrderItems, CommitteeAssignTickets } = require('../../../models');
const { fn, col, literal } = require("sequelize");
const { Op } = require('sequelize');

exports.deleteGeneratedCompsTicket = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const committee_user_id = req.user.id;
        const { order_item_id } = req.params;

        /* ================= FIND ORDER ITEM ================= */
        const orderItem = await OrderItems.findOne({
            where: {
                id: order_item_id,
                type: "comps"
            },
            transaction
        });

        if (!orderItem) {
            return apiResponse.error(res, "Complimentary ticket not found", 404);
        }

        /* ================= FIND ORDER ================= */
        const order = await Orders.findOne({
            where: { id: orderItem.order_id },
            transaction
        });

        if (!order) {
            return apiResponse.error(res, "Order not found", 404);
        }

        /* ================= FIND COMMITTEE ASSIGN ================= */
        // const committeeAssign = await CommitteeAssignTickets.findOne({
        //     where: {
        //         ticket_id: orderItem.ticket_id,
        //         user_id: committee_user_id,
        //         event_id: orderItem.event_id
        //     },
        //     transaction
        // });
        // console.log('committeeAssign :', committeeAssign);

        // if (!committeeAssign) {
        //     return apiResponse.error(
        //         res,
        //         "Committee assignment not found for this ticket",
        //         403
        //     );
        // }

        /* ================= COUNT COMPS ITEMS ================= */
        const compsCount = await OrderItems.count({
            where: {
                order_id: order.id,
                type: "comps"
            },
            transaction
        });

        /* ================= DELETE ORDER ITEMS ================= */
        await OrderItems.destroy({
            where: {
                order_id: order.id,
                type: "comps"
            },
            transaction
        });

        /* ================= DELETE ORDER ================= */
        await Orders.destroy({
            where: { id: order.id },
            transaction
        });

        /* ================= UPDATE COMMITTEE USED COUNT ================= */
        // await CommitteeAssignTickets.update(
        //     {
        //         usedticket: sequelize.literal(
        //             `GREATEST(usedticket - ${compsCount}, 0)`
        //         )
        //     },
        //     {
        //         where: { id: committeeAssign.id },
        //         transaction
        //     }
        // );

        await transaction.commit();

        return apiResponse.success(
            res,
            "Complimentary ticket deleted successfully",
            {
                deleted_tickets: compsCount
            }
        );

    } catch (error) {
        await transaction.rollback();
        console.error("deleteGeneratedCompsTicket error:", error);

        return apiResponse.error(
            res,
            error.message || "Failed to delete complimentary ticket",
            400
        );
    }
};

exports.generateSingleCompsTicket = async (req, res) => {
    try {
        const { event_id, user_id } = req.body;
        const loginId = req.user.id;

        const result = await ticketService.generateSingleCompsTicket({
            event_id,
            user_id,
            createdBy: loginId
        });

        if (!result.success) {
            return res.status(200).json({
                success: false,
                message: result.message,
                timestamp: new Date().toISOString()
            });
        }

        return res.status(200).json({
            success: true,
            message: "Complimentary ticket generated successfully",
            data: result.data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("generateSingleCompsTicket Controller Error:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: 500,
                error_code: "SERVER_ERROR",
                message: error.message || "Internal Server Error"
            },
            timestamp: new Date().toISOString()
        });
    }
};

exports.getGeneratedUsers = async (req, res) => {
    try {
        const eventId = req.params.event_id;

        // Get page and limit from query parameters, fallback to defaults
        const page = parseInt(req.query.page, 10) || config.perPageDataLimitPage || 1;
        const limit = parseInt(req.query.limit, 10) || config.perPageDataLimit || 10;

        // Fetch paginated users
        const users = await ticketService.getGeneratedUsers(eventId, page, limit);

        return res.status(200).json({
            success: true,
            code: 200,
            message: `Users with complimentary tickets for event ${eventId}`,
            data: users.data, // array of users
            pagination: users.pagination, // pagination info
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('getGeneratedUsers Error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 500,
                error_code: 'SERVER_ERROR',
                message: error.message || 'Internal Server Error',
            },
            timestamp: new Date().toISOString()
        });
    }
};

module.exports.importCompsTickets = async (req, res) => {
    try {
        const { event_id } = req.body;
        // console.log('req.body :', req.user);

        if (!event_id) {
            return apiResponse.validation(res, [], 'event_id are required');
        }

        if (!req.file) {
            return apiResponse.validation(res, [], 'Excel file is required');
        }

        // 📂 Read Excel
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(
            workbook.Sheets[sheetName],
            { defval: '' }
        );

        if (sheetData.length == 0) {
            return apiResponse.validation(res, [], 'Excel file is empty');
        }

        // 🧾 Validate headers
        const normalize = (str) =>
            str.toLowerCase().replace(/\s+/g, ' ').trim();

        // Excel headers
        const headers = Object.keys(sheetData[0]).map(normalize);

        // Required headers (same normalization)
        const REQUIRED_HEADERS = [
            'Sr.No',
            'First Name',
            'Last Name',
            'Email',
            'Mobile'
        ].map(normalize);

        const invalidHeaders = REQUIRED_HEADERS.filter(
            h => !headers.includes(h)
        );

        if (invalidHeaders.length) {
            return apiResponse.validation(
                res,
                [],
                `Invalid Excel format. Missing columns: ${invalidHeaders.join(', ')}`
            );
        }

        // 🚀 Process users
        const result = await ticketService.importCompsTickets({
            rows: sheetData,
            event_id,
            createdBy: req.user.id
        });

        if (!result.success) {
            return apiResponse.error(res, result.message || 'Import failed');
        }

        return apiResponse.success(
            res,
            'Users imported and complimentary tickets generated',
            result.data
        );

    } catch (error) {
        console.error('Import Comps Ticket Error:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};

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
                case 'TICKET_ALREADY_BOOKED':
                    return apiResponse.conflict(res,'This ticket has already been booked and cannot be deleted.');
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

        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const imagePath = "uploads/events";

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
