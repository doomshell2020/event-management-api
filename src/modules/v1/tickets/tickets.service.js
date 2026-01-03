
const { TicketType, Event, OrderItems, Orders, Payment, User } = require('../../../models/index');
const { fn, col, literal } = require("sequelize");
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { generateQRCode } = require('../../../common/utils/qrGenerator');
const { generateUniqueOrderId } = require('../../../common/utils/helpers');


module.exports.getCompsTicketsForPrint = async (req) => {
    try {
        const user_id = req.user.id;
        const { ticket_id } = req.params;
        const { event_id } = req.query;

        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const qrPath = "uploads/qr_codes";
        const eventImagePath = "uploads/events";

        if (!ticket_id || !event_id) {
            return {
                success: false,
                message: 'ticket_id and event_id are required'
            };
        }

        /* 🔍 VERIFY COMPLIMENTARY TICKET */
        const ticket = await TicketType.findOne({
            where: {
                id: ticket_id,
                eventid: event_id,
                userid: user_id,
                type: 'comps'
            },
            attributes: ['id', 'title']
        });

        if (!ticket) {
            return {
                success: false,
                code: 'NOT_FOUND',
                message: 'Complimentary ticket not found'
            };
        }

        /* 🎉 FETCH EVENT DETAILS */
        const event = await Event.findOne({
            where: {
                id: event_id,
                // event_org_id: user_id
            },
            attributes: ['id', 'name', 'feat_image', 'date_from', 'date_to']
        });

        if (!event) {
            return {
                success: false,
                code: 'NOT_FOUND',
                message: 'Event not found'
            };
        }

        /* 🎟️ FETCH GENERATED COMPS */
        const tickets = await OrderItems.findAll({
            where: {
                ticket_id,
                event_id,
                user_id,
                type: 'comps',
                status: 'Y'
            },
            attributes: [
                "id",
                "type",
                "ticket_id",
                "price",
                "qr_image",
                "secure_hash",
                "cancel_status",
                "cancel_date",
                "createdAt"
            ],
            include: [
                {
                    model: TicketType,
                    as: "ticketType",
                    attributes: ["id", "title"]
                },
                {
                    model: User,
                    as: "user",
                    attributes: ["first_name", "last_name", "email"]
                }
            ],
            order: [['id', 'DESC']],
        });

        return {
            success: true,
            data: {
                qr_base_path: `${baseUrl}${qrPath}/`,
                event_image_base_path: `${baseUrl}${eventImagePath}/`,
                event: {
                    id: event.id,
                    name: event.name,
                    image: event.feat_image,
                    image_url: event.feat_image
                        ? `${baseUrl}/${eventImagePath}/${event.feat_image}`
                        : null,
                    date_from: event.date_from,
                    date_to: event.date_to
                },
                ticket_title: ticket.title,
                total_generated: tickets.length,
                tickets
            }
        };

    } catch (error) {
        console.error('Service Print Comps Error:', error);
        return {
            success: false,
            code: 'DB_ERROR',
            message: 'Failed to fetch complimentary tickets'
        };
    }
};

module.exports.generateComplementary = async (req) => {
    const transaction = await OrderItems.sequelize.transaction();

    try {
        const user_id = req.user.id;
        const { ticket_id, event_id, quantity } = req.body;

        /* 🔍 FIND TICKET */
        const ticket = await TicketType.findOne({
            where: { id: ticket_id },
            transaction
        });

        // console.log('ticket.type :', ticket.type);


        if (!ticket) {
            return {
                success: false,
                code: 'NOT_FOUND',
                message: 'Ticket not found'
            };
        }

        /* 🎟️ CREATE FREE PAYMENT */
        const payment = await Payment.create({
            user_id,
            event_id,
            amount: 0,
            payment_intent: null,
            payment_status: "paid",
        }, { transaction });

        /* 🧾 CREATE ORDER */
        const order = await Orders.create({
            order_uid: generateUniqueOrderId(),
            user_id,
            event_id,
            grand_total: 0,
            sub_total: 0,
            tax_total: 0,
            discount_amount: 0,
            discount_code: null,
            paymenttype: 'free',
            paymentgateway: "comps",
            payment_id: payment.id,
            status: "Y"
        }, { transaction });

        /* 🔁 CREATE ORDER ITEMS */
        const itemsData = Array.from({ length: quantity }).map(() => ({
            order_id: order.id,
            event_id: event_id,
            user_id: user_id,
            title: ticket.title || 'Complimentary',
            price: 0,
            type: ticket.type,
            ticket_id: ticket_id,
            access_type: ticket.access_type || 'event',
            status: 'Y'
        }));

        const orderItems = await OrderItems.bulkCreate(
            itemsData,
            { transaction, returning: true }
        );

        /* 📸 GENERATE QR FOR EACH ITEM */
        const qrResults = [];
        const attachments = [];

        for (const orderItem of orderItems) {
            const qr = await generateQRCode(orderItem);

            if (qr) {
                await orderItem.update({
                    qr_image: qr.qrImageName,
                    qr_data: JSON.stringify(qr.qrData),
                    secure_hash: qr.secureHash
                }, { transaction });

                qrResults.push({
                    order_item_id: orderItem.id,
                    qr_image: qr.qrImageName
                });

                attachments.push({
                    filename: qr.qrImageName,
                    path: path.join(
                        __dirname,
                        "../../../uploads/qr_codes/",
                        qr.qrImageName
                    )
                });
            }
        }

        await transaction.commit();

        return {
            success: true,
            data: {
                order_id: order.id,
                generated: quantity,
                qr: qrResults
            }
        };

    } catch (error) {
        await transaction.rollback();
        console.error('generateComplementary Error:', error);

        return {
            success: false,
            code: 'DB_ERROR',
            message: 'Failed to generate complimentary tickets'
        };
    }
};

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

        // const await OrderItems

        // ✅ Fetch all tickets for this event
        // const tickets = await TicketType.findAll({
        //     where: { eventid: event_id },
        //     order: [['createdAt', 'DESC']]
        // });

        // ✅ Fetch tickets with sold count
        const tickets = await TicketType.findAll({
            where: { eventid: event_id },
            attributes: {
                include: [
                    [
                        // 🔥 Subquery to calculate sold count
                        literal(`(
                        SELECT COALESCE(SUM(oi.count), 0)
                        FROM tbl_order_items AS oi
                        WHERE oi.ticket_id = TicketType.id
                        AND oi.event_id = ${event_id}
                        AND oi.type IN ('ticket', 'committesale','comps')
                        )`),
                        "sold_count",
                    ]
                ],
            },
            order: [["createdAt", "DESC"]],
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