const { TicketType, Event, EventSlots, TicketPricing, OrderItems, Package, PackageDetails } = require('../../../models/index');
const { Op, literal, Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
// getTicketPricing
module.exports.getTicketPricing = async (req) => {
    try {
        const eventId = req.params.event_id;
        // ✅ Validate ID param
        if (!eventId) {
            return {
                success: false,
                message: 'Event ID is required',
                code: 'VALIDATION_FAILED'
            };
        }

        // ✅ Fetch ticket pricing records for the event
        const pricingRecords = await TicketPricing.findAll({
            where: { event_id: eventId },
            include: [
                {
                    model: TicketType,
                    as: 'ticket', // ✔ MATCHES association
                    attributes: ['id', 'title', 'access_type', 'type']
                },
                {
                    model: EventSlots,
                    as: 'slot', // ✔ MATCHES association
                    attributes: ['id', 'slot_name', 'slot_date', 'start_time', 'end_time']
                }
            ],
            order: [['id', 'DESC']]
        });



        return {
            success: true,
            message: 'Ticket pricing fetched successfully',
            data: pricingRecords
        };
    } catch (error) {
        console.error('Error fetching ticket pricing:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};

module.exports.createTicket = async (req) => {
    try {
        const {
            event_id,
            title,
            access_type,
            type,
            count,
            price,
            hidden,
            gate_id
        } = req.body;

        const user_id = req.user?.id || null;
        const ticketImage = req.file?.filename;

        // ✅ Validate required fields
        if (!event_id || !title || !access_type) {
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
            userid: eventExists.userid || user_id,
            title: title.trim(),
            access_type,
            type: type ?? type,
            ticket_image: ticketImage || null,
            // ✅ Price and Count logic
            price: parseFloat(price) || 0,
            count: parseInt(count) || 0,
            gate_id: gate_id,
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
            type,
            gate_id
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

        const event_id = existingTicket.eventid;

        // =========================================================
        // ✅ Step 1: Direct + Pricing sold count (single ticket)
        // =========================================================
        const soldData = await TicketType.findOne({
            where: { id: ticketId },
            attributes: [
                "id",
                [
                    literal(`(
                SELECT COALESCE(SUM(oi.count), 0)
                FROM tbl_order_items AS oi
                LEFT JOIN tbl_ticket_pricing tp 
                    ON tp.id = oi.ticket_pricing_id
                WHERE (
                    oi.ticket_id = TicketType.id 
                    OR tp.ticket_type_id = TicketType.id
                )
                AND oi.event_id = ${event_id}
                AND oi.type IN ('ticket', 'committesale','comps','ticket_price')
            )`),
                    "sold_count"
                ]
            ],
            raw: true
        });

        let totalSold = Number(soldData?.sold_count || 0);

        // =========================================================
        // ✅ Step 2: Package mapping for THIS ticket only
        // =========================================================
        const packages = await Package.findAll({
            where: { event_id },
            include: {
                model: PackageDetails,
                as: "details",
                attributes: ["ticket_type_id", "qty"]
            },
            attributes: ["id", "total_package"]
        });

        // 👉 total package required qty for this ticket
        let packageRequiredQty = 0;

        packages.forEach(pkg => {
            const totalPkg = Number(pkg.total_package || 0);

            pkg.details.forEach(d => {
                if (d.ticket_type_id == ticketId) {
                    const qty = Number(d.qty || 0);

                    // 🔥 MAIN FIX
                    packageRequiredQty += qty * totalPkg;
                }
            });
        });

        const minimumRequired = totalSold + packageRequiredQty;

        if (count && parseInt(count) < minimumRequired) {
            return {
                success: false,
                message: `Cannot reduce below ${minimumRequired} (Sold: ${totalSold} + Package Reserved: ${packageRequiredQty})`,
                code: "INVALID_COUNT"
            };
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
            gate_id:gate_id || existingTicket.gate_id
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

module.exports.setTicketPricing = async (req) => {
    try {
        const { event_id, ticket_type_id, event_slot_id, price, date } = req.body;

        // 1️⃣ Fetch event and ticket
        const event = await Event.findByPk(event_id);
        if (!event) return { success: false, message: "Event not found" };

        const ticket = await TicketType.findOne({
            where: { id: ticket_type_id, eventid: event_id }
        });

        if (!ticket) {
            return { success: false, code: 'TICKET_NOT_FOUND', message: 'Ticket type not found' };
        }

        const { access_type } = ticket;
        const { entry_type, date_from } = event;
        let finalDate = null;

        // 2️⃣ Conditional Logic Based on Event + Access Type
        switch (entry_type) {
            // 🟩 Case 1: Full event only (6–9 valid for all days)
            case 'event':
                if (access_type !== 'event') {
                    return { success: false, code: 'VALIDATION_FAILED', message: 'Only event-level tickets allowed for event type.' };
                }
                if (event_slot_id || date) {
                    return { success: false, code: 'VALIDATION_FAILED', message: 'Do not provide date or slot for full-event pricing.' };
                }
                break;

            // 🟩 Case 2: Multi-day event (per-day / per-slot / full-event)
            case 'multi':
                if (access_type == 'day') {
                    if (!date)
                        return { success: false, code: 'VALIDATION_FAILED', message: 'Date required for day-based ticket pricing.' };
                    finalDate = date;
                } else if (access_type == 'slot') {
                    if (!event_slot_id)
                        return { success: false, code: 'VALIDATION_FAILED', message: 'Event Slot ID is required for slot-based pricing.' };

                    const slot = await EventSlots.findOne({ where: { id: event_slot_id, event_id } });
                    if (!slot) return { success: false, code: 'VALIDATION_FAILED', message: 'Slot not found.' };

                    finalDate = slot.slot_date; // ✅ use slot_date
                } else if (access_type == 'event') {
                    if (event_slot_id || date)
                        return { success: false, code: 'VALIDATION_FAILED', message: 'Do not provide date or slot for full-event pricing.' };
                } else {
                    return { success: false, code: 'VALIDATION_FAILED', message: 'Invalid access type for multi-day event.' };
                }
                break;

            // 🟩 Case 3: Single-day event
            case 'single':
                if (access_type !== 'event') {
                    return { success: false, code: 'VALIDATION_FAILED', message: 'Single-day events only support event-level tickets.' };
                }
                if (event_slot_id)
                    return { success: false, code: 'VALIDATION_FAILED', message: 'Slot not allowed for single-day event.' };

                // ✅ Auto-assign event date
                finalDate = date_from || date;
                break;

            // 🟩 Case 4: Slot-based event (single day, multiple slots)
            case 'slot':
                if (access_type !== 'slot') {
                    return { success: false, code: 'VALIDATION_FAILED', message: 'Slot-based access required for slot-type event.' };
                }
                if (!event_slot_id) {
                    return { success: false, code: 'VALIDATION_FAILED', message: 'Event Slot ID is required for slot-based pricing.' };
                }

                const slotData = await EventSlots.findOne({ where: { id: event_slot_id, event_id } });
                if (!slotData) return { success: false, code: 'VALIDATION_FAILED', message: 'Slot not found.' };

                finalDate = slotData.slot_date; // ✅ fixed field
                break;

            default:
                return { success: false, message: 'Invalid event type.' };
        }

        // 3️⃣ Upsert (Create or Update)
        const whereCondition = { event_id, ticket_type_id };
        if (access_type == 'slot') whereCondition.event_slot_id = event_slot_id;
        else if (access_type == 'day' || entry_type == 'single') whereCondition.date = finalDate;

        let pricing = await TicketPricing.findOne({ where: whereCondition });
        let resMessage = 'Ticket pricing set successfully';

        if (pricing) {
            pricing.price = price;
            await pricing.save();
            resMessage = 'Ticket pricing updated successfully';
        } else {
            pricing = await TicketPricing.create({
                event_id,
                ticket_type_id,
                event_slot_id: access_type == 'slot' ? event_slot_id : null,
                date: finalDate,
                price
            });
        }

        return { success: true, message: resMessage, data: pricing };

    } catch (error) {
        console.error('❌ Error setting ticket pricing:', error);
        return {
            success: false,
            code: 'DB_ERROR',
            message: 'Database error: ' + error.message
        };
    }
};

// module.exports.setTicketPricing = async (req) => {
//     try {
//         const { event_id, ticket_type_id, event_slot_id, price, date } = req.body;

//         // 1️⃣ Fetch event and ticket
//         const event = await Event.findByPk(event_id);
//         if (!event) return { success: false, message: "Event not found" };

//         // ✅ 1. Validate Ticket Type
//         const ticket = await TicketType.findOne({
//             where: { id: ticket_type_id, eventid: event_id }
//         });

//         if (!ticket) {
//             return { success: false, code: 'TICKET_NOT_FOUND', message: 'Ticket type not found' };
//         }

//         const { access_type } = ticket;

//         let finalDate = null; // date value that will go into pricing table

//         // ✅ 2. Conditional logic based on access_type
//         if (access_type == 'event') {
//             // No slot or date needed
//             if (event_slot_id || date) {
//                 return { success: false, code: 'VALIDATION_FAILED', message: 'For event-level pricing, do not provide slot or date.' };
//             }
//         }
//         else if (access_type == 'day') {
//             // Date required, slot not allowed
//             if (!date) {
//                 return { success: false, code: 'VALIDATION_FAILED', message: 'Date is required for day-based ticket pricing.' };
//             }
//             finalDate = date;
//         }
//         else if (access_type == 'slot') {
//             // Slot required, derive date from slot
//             if (!event_slot_id) {
//                 return { success: false, code: 'VALIDATION_FAILED', message: 'Event Slot ID is required for slot-based ticket pricing.' };
//             }

//             const slot = await EventSlots.findOne({
//                 where: { id: event_slot_id, event_id }
//             });

//             if (!slot) {
//                 return { success: false, code: 'SLOT_NOT_FOUND', message: 'Event slot not found' };
//             }

//             finalDate = slot.slot_date; // ✅ Auto-set date from slot
//         }

//         // ✅ 3. Find existing record to update or create
//         let whereCondition = { event_id, ticket_type_id };

//         if (access_type == 'slot') {
//             whereCondition.event_slot_id = event_slot_id;
//         } else if (access_type == 'day') {
//             whereCondition.date = finalDate;
//         }

//         let pricing = await TicketPricing.findOne({ where: whereCondition });
//         let resMessage = 'Ticket pricing set successfully';

//         if (pricing) {
//             // Update
//             pricing.price = price;
//             await pricing.save();
//             resMessage = 'Ticket pricing updated successfully';
//         } else {
//             // Create
//             pricing = await TicketPricing.create({
//                 event_id,
//                 ticket_type_id,
//                 event_slot_id: access_type == 'slot' ? event_slot_id : null,
//                 date: finalDate,
//                 price
//             });
//         }

//         return {
//             success: true,
//             message: resMessage,
//             data: pricing
//         };

//     } catch (error) {
//         console.error('❌ Error setting ticket pricing:', error);
//         return {
//             success: false,
//             code: 'DB_ERROR',
//             message: 'Database error: ' + error.message
//         };
//     }
// };
