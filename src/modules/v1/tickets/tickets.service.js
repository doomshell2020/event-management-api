
const { TicketType, Event, Currency, OrderItems, Orders, Payment, User } = require('../../../models/index');
const { fn, col, literal } = require("sequelize");
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { generateQRCode } = require('../../../common/utils/qrGenerator');
const { generateUniqueOrderId, formatDate } = require('../../../common/utils/helpers');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const sendEmail = require('../../../common/utils/sendEmail');
const complimentaryConfirmationTemplateWithQR = require('../../../common/utils/emailTemplates/complimentaryConfirmationTemplateWithQR');
const config = require('../../../config/app');

const REQUIRED_HEADERS = ['Sr.No', 'First Name', 'Last Name', 'Email', 'Mobile'];

const baseUrl = config.baseUrl || "http://localhost:5000";
const eventImagePath = "uploads/events";
const qrImagePath = "uploads/qr_codes";

exports.pushFromCommitteeCompsTicket = async ({ event_id, user_id, ticket_id, createdBy = 0 }) => {

    /* 🔍 Check if ticket already generated */
    const alreadyGenerated = await OrderItems.findOne({
        where: {
            event_id,
            user_id,
            ticket_id,
            type: "comps",
            status: "Y"
        }
    });

    if (alreadyGenerated) {
        return {
            success: false,
            message: "Complimentary ticket already generated for this user"
        };
    }

    /* 🎟️ Get complimentary ticket type */
    const ticket = await TicketType.findOne({
        where: {
            eventid: event_id,
            id: ticket_id
        }
    });

    if (!ticket) {
        return {
            success: false,
            message: "Complimentary ticket type not found"
        };
    }

    /* 🚀 Reuse your existing logic */
    const result = await generateComplementaryFromExcel({
        user_id,
        event_id,
        ticket,
        quantity: 1,
        createdBy
    });

    if (!result.success) {
        return {
            success: false,
            message: "Failed to generate complimentary ticket"
        };
    }

    return {
        success: true,
        data: {
            order_id: result.order_id,
            generated: result.generated
        }
    };
};

exports.generateSingleCompsTicket = async ({ event_id, user_id, createdBy }) => {

    /* 🔍 Check if ticket already generated */
    const alreadyGenerated = await OrderItems.findOne({
        where: {
            event_id,
            user_id,
            type: "comps",
            status: "Y"
        }
    });

    if (alreadyGenerated) {
        return {
            success: false,
            message: "Complimentary ticket already generated for this user"
        };
    }

    /* 🎟️ Get complimentary ticket type */
    const ticket = await TicketType.findOne({
        where: {
            eventid: event_id,
            type: "comps"
        }
    });

    if (!ticket) {
        return {
            success: false,
            message: "Complimentary ticket type not found"
        };
    }

    /* 🚀 Reuse your existing logic */
    const result = await generateComplementaryFromExcel({
        user_id,
        event_id,
        ticket,
        quantity: 1,
        createdBy
    });

    if (!result.success) {
        return {
            success: false,
            message: "Failed to generate complimentary ticket"
        };
    }

    return {
        success: true,
        data: {
            order_id: result.order_id,
            generated: result.generated
        }
    };
};

// Convert to user-friendly readable format
const formatDateReadable = (dateStr, timezone) => {
    if (!dateStr) return "";

    const date = new Date(dateStr);

    return date.toLocaleString("en-US", {
        timeZone: timezone,
        weekday: "long",
        month: "long",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
};

module.exports.importCompsTickets = async ({ rows = [], event_id, createdBy }) => {
    if (!rows.length) {
        return {
            success: false,
            code: 'VALIDATION_FAILED',
            message: 'Excel file is empty'
        };
    }

    const report = {
        total: rows.length,
        created_users: 0,
        existing_users: 0,
        tickets_generated: 0,
        skipped_users: 0,
        failed: []
    };

    const normalizeHeader = str =>
        (str || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9. ]/g, '').trim();

    /* 🧾 HEADER VALIDATION */
    const excelHeaders = Object.keys(rows[0]).map(normalizeHeader);
    const requiredHeaders = REQUIRED_HEADERS.map(normalizeHeader);

    const missingHeaders = requiredHeaders.filter(h => !excelHeaders.includes(h));
    if (missingHeaders.length) {
        return {
            success: false,
            code: 'VALIDATION_FAILED',
            message: `Invalid Excel format. Missing columns: ${missingHeaders.join(', ')}`
        };
    }

    /* 🧠 NORMALIZE ROW KEYS */
    const mappedRows = rows.map(row => {
        const mapped = {};
        Object.keys(row).forEach(key => {
            mapped[normalizeHeader(key)] = row[key];
        });
        return mapped;
    });

    /* 🎟️ VERIFY COMPS TICKET */
    const ticket = await TicketType.findOne({
        where: { eventid: event_id, type: 'comps' }
    });
    if (!ticket) {
        return { success: false, code: 'NOT_FOUND', message: 'Complimentary ticket not found' };
    }

    /* 🔁 PROCESS ROWS */
    for (let i = 0; i < mappedRows.length; i++) {
        const row = mappedRows[i];
        try {
            const email = row['email']?.toString().trim().toLowerCase();
            const mobile = row['mobile']?.toString().trim();

            if (!email || !mobile) throw new Error('Email or mobile missing');

            let user = await User.findOne({ where: { [Op.or]: [{ email }, { mobile }] } });

            if (!user) {
                const firstName = row['first name'] || '';
                const lastName = row['last name'] || '';

                user = await User.create({
                    first_name: firstName,
                    last_name: lastName,
                    full_name: `${firstName} ${lastName}`.trim(),
                    email,
                    mobile,
                    password: await bcrypt.hash('Welcome@123', 10),
                    confirm_pass: 'Welcome@123',
                    status: 'Y'
                });
                report.created_users++;
            } else {
                report.existing_users++;
            }

            /* ✅ CHECK DUPLICATE TICKET BEFORE GENERATION */
            const existingTicket = await OrderItems.findOne({
                where: { user_id: user.id, event_id, ticket_id: ticket.id, type: 'comps', status: 'Y' }
            });

            if (existingTicket) {
                report.skipped_users++;
                continue; // skip to next row
            }

            const result = await generateComplementaryFromExcel({ user_id: user.id, event_id, ticket, quantity: 1, createdBy });

            if (!result.success) throw new Error(result.message);

            report.tickets_generated++;

        } catch (err) {
            report.failed.push({
                row: row['sr.no'],
                email: row['email'],
                reason: err.message
            });
        }
    }

    return { success: true, data: report };
};

const generateComplementaryFromExcel = async ({ user_id, event_id, ticket, quantity = 1, createdBy = 0 }) => {
    const transaction = await OrderItems.sequelize.transaction();
    let order;

    try {
        /* 🎟 PAYMENT */
        const payment = await Payment.create({
            user_id,
            event_id,
            amount: 0,
            payment_status: 'paid'
        }, { transaction });

        /* 🧾 ORDER */
        order = await Orders.create({
            order_uid: generateUniqueOrderId(),
            user_id,
            event_id,
            grand_total: 0,
            sub_total: 0,
            tax_total: 0,
            discount_amount: 0,
            paymenttype: 'free',
            paymentgateway: 'comps',
            payment_id: payment.id,
            status: 'Y'
        }, { transaction });

        /* 🎫 ORDER ITEMS */
        const itemsData = Array.from({ length: quantity }).map(() => ({
            order_id: order.id,
            event_id,
            user_id,
            title: ticket.title || 'Complimentary',
            price: 0,
            type: 'comps',
            ticket_id: ticket.id,
            access_type: ticket.access_type || 'event',
            status: 'Y',
            createdBy
        }));

        const orderItems = await OrderItems.bulkCreate(itemsData, {
            transaction,
            returning: true
        });

        /* 🔳 QR GENERATION */
        for (const orderItem of orderItems) {
            const qr = await generateQRCode(orderItem);
            if (qr) {
                await orderItem.update({
                    qr_image: qr.qrImageName,
                    qr_data: JSON.stringify(qr.qrData),
                    secure_hash: qr.secureHash
                }, { transaction });
            }
        }

        await transaction.commit();

        /* ===============================
           📧 EMAIL (OUTSIDE TRANSACTION)
        ================================ */
        try {
            const [user, rawEvent, qrItems] = await Promise.all([
                User.findByPk(user_id, { attributes: ['id', 'email', 'first_name', 'last_name', 'full_name'], raw: true }),
                Event.findOne({
                    where: { id: event_id },
                    attributes: ['id', 'name', 'location', 'feat_image', 'date_from', 'date_to', 'event_timezone'],
                    include: [{ model: Currency, as: 'currencyName', attributes: ['Currency_symbol', 'Currency'] }],
                    raw: true
                }),
                OrderItems.findAll({ where: { order_id: order.id }, attributes: ['id', 'qr_image'], raw: true })
            ]);

            const formattedEvent = {
                id: rawEvent.id,
                name: rawEvent.name,
                location: rawEvent.location,
                feat_image: rawEvent.feat_image ? `${baseUrl}/${eventImagePath}/${rawEvent.feat_image}` : `${baseUrl}/${eventImagePath}/default.jpg`,
                date_from: formatDateReadable(rawEvent.date_from, rawEvent.event_timezone),
                date_to: formatDateReadable(rawEvent.date_to, rawEvent.event_timezone),
                timezone: rawEvent.event_timezone,
                currency_symbol: rawEvent["currencyName.Currency_symbol"] || "₹",
                currency_name: rawEvent["currencyName.Currency"] || "INR"
            };

            const qrResults = qrItems.map(item => ({
                order_item_id: item.id,
                qr_image_url: `${baseUrl}/${qrImagePath}/${item.qr_image}`
            }));

            await sendEmail(
                user.email,
                `🎟 Complimentary Pass Confirmed – ${formattedEvent.name}`,
                complimentaryConfirmationTemplateWithQR(user, order, qrResults, formattedEvent)
            );

        } catch (emailError) {
            console.error('Email failed:', emailError);
        }

        return { success: true, order_id: order.id, generated: quantity };

    } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        console.error('generateComplementaryFromExcel Error:', error);
        return { success: false, message: 'Failed to generate complimentary tickets' };
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

exports.getGeneratedUsers = async (eventId, page = 1, limit = 10) => {
    const pageNumber = parseInt(page, 10) || 1; // default page 1
    const pageLimit = parseInt(limit, 10) || 10; // default limit 10
    const offset = (pageNumber - 1) * pageLimit;

    // Get total count first for pagination
    const totalCount = await OrderItems.count({
        where: {
            event_id: eventId,
            type: 'comps',
            status: 'Y',
        },
    });

    // Fetch paginated data
    const generatedUsers = await OrderItems.findAll({
        where: {
            event_id: eventId,
            type: 'comps',
            status: 'Y'
        },
        include: [
            {
                model: User,
                as: 'user',
                attributes: [] // We'll select needed fields via literal
            },
            {
                model: TicketType,
                as: 'ticketType',
                attributes: [] // Ticket title via literal
            }
        ],
        attributes: [
            ['id', 'order_item_id'],
            ['order_id', 'order_id'],
            ['ticket_id', 'ticket_id'],
            ['status', 'status'],
            ['createdAt', 'generated_at'],
            [col('user.id'), 'user_id'],
            [col('user.first_name'), 'first_name'],
            [col('user.last_name'), 'last_name'],
            [col('user.email'), 'email'],
            [col('user.mobile'), 'mobile'],
            [literal(`COALESCE(ticketType.title, 'Complimentary')`), 'ticket_title']
        ],
        order: [['createdAt', 'DESC']],
        limit: pageLimit,
        offset: offset,
        raw: true
    });

    return {
        data: generatedUsers,
        pagination: {
            total: totalCount,
            page: pageNumber,
            limit: pageLimit,
            totalPages: Math.ceil(totalCount / pageLimit)
        }
    };
};

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