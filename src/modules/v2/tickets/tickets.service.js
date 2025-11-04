const { TicketType, Event, EventSlots, TicketPricing } = require('../../../models/index');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');


module.exports.createTicket = async (req) => {
    try {
        const {
            event_id,
            title,
            entry_type,
            type,
            count,
            price,
            hidden
        } = req.body;

        const user_id = req.user?.id || null;
        const ticketImage = req.file?.filename;

        // ✅ Validate required fields
        if (!event_id || !title || !entry_type) {
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
            entry_type,
            type: type ?? type,
            ticket_image: ticketImage || null,
            // ✅ Price and Count logic
            price: parseFloat(price) || 0,
            count: parseInt(count) || 0,
            hidden: hidden == 'Y' ? 'Y' : 'N',
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
            count,
            price,
            hidden,
            type
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

        // ✅ Check for duplicate title for the same event (excluding current ticket)
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


        // ✅ Validate image extension only if a new image is uploaded
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

        // ✅ Handle price based on ticket type
        let validatedPrice = price ? parseFloat(price) : existingTicket.price;

        // If type is 'comps', set price to null
        if (type == 'comps') {
            validatedPrice = null;
        } else if (type == 'open_sales' && !price) {
            // Price is required for 'open_sales'
            return {
                success: false,
                message: 'Price is required for tickets with type "open_sales".',
                code: 'PRICE_REQUIRED'
            };
        }

        // ✅ Prepare update data, including the type field
        const updateData = {
            eventid: existingTicket.eventid,
            userid: user_id || existingTicket.userid,
            title: title ? title.trim() : existingTicket.title,
            hidden: hidden ? (hidden == 'Y' ? 'Y' : 'N') : existingTicket.hidden,
            price: validatedPrice,
            count: count ? parseInt(count) : existingTicket.count,
            type: type || existingTicket.type, // Ensure 'type' is updated
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
        if (user_id && existingTicket.userid && existingTicket.userid !== user_id) {
            return {
                success: false,
                message: 'You are not authorized to delete this ticket',
                code: 'FORBIDDEN'
            };
        }

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

module.exports.setTicketPricing = async ({ event_id, ticket_type_id, event_slot_id, price }) => {
    try {
        const ticket = await TicketType.findOne({
            where: { id: ticket_type_id, eventid: event_id }
        });
        if (!ticket) {
            return { success: false, code: 'TICKET_NOT_FOUND', message: 'Ticket type not found' };
        }
        const slot = await EventSlots.findOne({
            where: { id: event_slot_id, event_id: event_id }
        });
        if (!slot) {
            return { success: false, code: 'SLOT_NOT_FOUND', message: 'Event slot not found' };
        }
        let pricing = await TicketPricing.findOne({
            where: {
                ticket_type_id,
                event_slot_id
            }
        });

        let resMessage = 'Ticket pricing set successfully';

        if (pricing) {
            pricing.price = price;
            await pricing.save();
            resMessage = 'Ticket pricing update successfully';

        } else {
            pricing = await TicketPricing.create({
                event_id,
                ticket_type_id,
                event_slot_id,
                price
            });
        }

        return {
            success: true,
            message: resMessage,
            data: pricing
        };

    } catch (error) {
        console.error('Error setting ticket pricing:', error);
        return {
            success: false,
            code: 'DB_ERROR',
            message: 'Database error: ' + error.message
        };
    }
};