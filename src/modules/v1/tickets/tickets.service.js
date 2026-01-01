
const { TicketType, Event } = require('../../../models/index');

const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

module.exports.createTicket = async (req) => {
    try {
        const {
            event_id,
            title,
            type,
            count,
            price,
            hidden,
            sale_start,
            sale_end,
            sold_out,
            is_active,
            description,
            status
        } = req.body;

        const user_id = req.user?.id || null;
        const ticketImage = req.file?.filename;

        // ✅ Validate required fields
        if (!event_id || !title || !type) {
            return {
                success: false,
                message: 'Please fill all required fields',
                code: 'VALIDATION_FAILED'
            };
        }

        // ✅ Check if associated event exists
        const eventExists = await Event.findByPk(event_id);
        if (!eventExists) {
            return {
                success: false,
                message: 'Associated event not found',
                code: 'EVENT_NOT_FOUND'
            };
        }

        // ✅ Check for duplicate ticket title for same event
        const existingTicket = await TicketType.findOne({
            where: {
                eventid: event_id,
                title: title.trim()
            }
        });

        if (existingTicket) {
            return {
                success: false,
                message: 'A ticket with this title already exists for the selected event',
                code: 'DUPLICATE_TICKET'
            };
        }

        // ✅ Validate image extension only if image is uploaded
        if (ticketImage) {
            const allowedExt = ['png', 'jpg', 'jpeg'];
            const ext = ticketImage.split('.').pop().toLowerCase();
            if (!allowedExt.includes(ext)) {
                return {
                    success: false,
                    message: 'Invalid image type. Only JPG, PNG, and JPEG allowed.',
                    code: 'VALIDATION_FAILED'
                };
            }
        }

        // ✅ Create ticket
        const newTicket = await TicketType.create({
            eventid: event_id,
            userid: user_id,
            title: title.trim(),
            ticket_image: ticketImage || null,
            description: description?.trim() || '',

            // ✅ Price and Count logic
            price: type == 'open_sales' ? parseFloat(price) || 0 : null,
            count: type == 'open_sales' ? parseInt(count) || 0 : null,

            type,
            hidden: hidden == 'Y' ? 'Y' : 'N',
            sold_out: sold_out == 'Y' ? 'Y' : 'N',
            status: status || 'N',
            // sale_start: sale_start ? new Date(sale_start) : null,
            // sale_end: sale_end ? new Date(sale_end) : null,
        });


        return {
            success: true,
            message: 'Ticket created successfully',
            data: newTicket
        };

    } catch (error) {
        console.error('Error creating ticket:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};

module.exports.updateTicket = async (req) => {
    try {
        const ticketId = req.params.id;
        const {
            title,
            type,
            count,
            price,
            hidden,
            sold_out,
            is_active,
            description,
            status,
            sale_start,
            sale_end,
        } = req.body;

        const user_id = req.user?.id || null;
        const ticketImage = req.file?.filename || null;

        // ✅ Find existing ticket
        const existingTicket = await TicketType.findByPk(ticketId);
        if (!existingTicket) {
            return {
                success: false,
                message: 'Ticket not found',
                code: 'TICKET_NOT_FOUND'
            };
        }

        // ✅ Check for duplicate title for same event (excluding current ticket)
        if (existingTicket.eventid && title) {
            const duplicateTicket = await TicketType.findOne({
                where: {
                    eventid: existingTicket.eventid,
                    title: title.trim(),
                    id: { [Op.ne]: ticketId }
                }
            });

            if (duplicateTicket) {
                return {
                    success: false,
                    message: 'A ticket with this title already exists for the selected event',
                    code: 'DUPLICATE_TICKET'
                };
            }
        }

        // ✅ Validate image extension only if new image is uploaded
        if (ticketImage) {
            const allowedExt = ['png', 'jpg', 'jpeg'];
            const ext = ticketImage.split('.').pop().toLowerCase();
            if (!allowedExt.includes(ext)) {
                return {
                    success: false,
                    message: 'Invalid image type. Only JPG, PNG, and JPEG allowed.',
                    code: 'VALIDATION_FAILED'
                };
            }
        }

        // ✅ Prepare update data
        const updateData = {
            eventid: existingTicket.eventid,
            userid: user_id || existingTicket.userid,
            title: title ? title.trim() : existingTicket.title,
            description: description ? description.trim() : existingTicket.description,
            type: type || existingTicket.type,
            hidden: hidden ? (hidden == 'Y' ? 'Y' : 'N') : existingTicket.hidden,
            sold_out: sold_out ? (sold_out == 'Y' ? 'Y' : 'N') : existingTicket.sold_out,
            status: status || existingTicket.status,
            price: type == 'open_sales'
                ? parseFloat(price) || existingTicket.price
                : (type && type !== 'open_sales' ? null : existingTicket.price),
            count: type == 'open_sales'
                ? parseInt(count) || existingTicket.count
                : (type && type !== 'open_sales' ? null : existingTicket.count),
            // sale_start: sale_start ? new Date(sale_start) : existingTicket.sale_start,
            // sale_end: sale_end ? new Date(sale_end) : existingTicket.sale_end,
        };

        // ✅ Handle ticket image replacement
        if (ticketImage) {
            const uploadFolder = path.join(process.cwd(), 'uploads/tickets');
            const oldFilePath = path.join(uploadFolder, existingTicket.ticket_image || '');
            if (existingTicket.ticket_image && fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                console.log('🧹 Old ticket image removed:', oldFilePath);
            }
            updateData.ticket_image = ticketImage;
        }

        // ✅ Update in database
        await existingTicket.update(updateData);

        return {
            success: true,
            message: 'Ticket updated successfully',
            data: existingTicket
        };

    } catch (error) {
        console.error('Error updating ticket:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};

module.exports.deleteTicket = async (req) => {
    try {
        const ticketId = req.params.id;
        const user_id = req.user?.id || null;

        // ✅ Find existing ticket
        const existingTicket = await TicketType.findByPk(ticketId);
        if (!existingTicket) {
            return {
                success: false,
                message: 'Ticket not found',
                code: 'TICKET_NOT_FOUND'
            };
        }

        // ✅ Optional: Check if the user is the ticket owner (if applicable)
        // if (user_id && existingTicket.userid && existingTicket.userid !== user_id) {
        //     return {
        //         success: false,
        //         message: 'You are not authorized to delete this ticket',
        //         code: 'FORBIDDEN'
        //     };
        // }

        // ✅ Remove associated image if exists
        if (existingTicket.ticket_image) {
            const uploadFolder = path.join(process.cwd(), 'uploads/tickets');
            const imagePath = path.join(uploadFolder, existingTicket.ticket_image);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log('🧹 Ticket image deleted:', imagePath);
            }
        }

        // ✅ Delete ticket record
        await existingTicket.destroy();

        return {
            success: true,
            message: 'Ticket deleted successfully'
        };

    } catch (error) {
        console.error('Error deleting ticket:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};

module.exports.listTicketsByEvent = async (event_id) => {
    try {
        // ✅ Check if event exists
        const eventExists = await Event.findByPk(event_id);
        if (!eventExists) {
            return {
                success: false,
                message: 'Event not found',
                code: 'EVENT_NOT_FOUND'
            };
        }

        // ✅ Fetch all tickets for this event
        const tickets = await TicketType.findAll({
            where: { eventid: event_id },
            order: [['createdAt', 'DESC']]
        });

        return {
            success: true,
            message: 'Tickets fetched successfully',
            data: tickets
        };

    } catch (error) {
        console.error('Error fetching tickets by event:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};

module.exports.getTicketDetail = async (ticket_id) => {
    try {
        // ✅ Find ticket by ID
        const ticket = await TicketType.findByPk(ticket_id);

        if (!ticket) {
            return {
                success: false,
                message: 'Ticket not found',
                code: 'TICKET_NOT_FOUND'
            };
        }

        return {
            success: true,
            message: 'Ticket details fetched successfully',
            data: ticket
        };

    } catch (error) {
        console.error('Error fetching ticket detail:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};
