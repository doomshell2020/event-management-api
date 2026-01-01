const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { Company, Event, EventSlots, TicketType, TicketPricing, Wellness, WellnessSlots, Currency, OrderItems } = require('../../../models');
const { convertToUTC, convertUTCToLocal } = require('../../../common/utils/timezone'); // ✅ Reuse timezone util
const moment = require('moment');


module.exports.deleteSlotById = async (event_id, slot_id) => {
    try {
        // ✅ 1. Validate event existence
        const event = await Event.findByPk(event_id);
        if (!event) {
            return { success: false, code: "NOT_FOUND", message: "Event not found" };
        }

        // ✅ 2. Find the slot
        const slot = await EventSlots.findOne({
            where: { id: slot_id, event_id },
        });

        if (!slot) {
            return {
                success: false,
                code: "NOT_FOUND",
                message: `Slot with ID ${slot_id} not found for event ${event_id}`,
            };
        }

        // ✅ 3. Delete the slot
        await slot.destroy();

        return {
            success: true,
            message: `Slot (ID: ${slot_id}) deleted successfully`,
        };
    } catch (error) {
        console.error("❌ Error in deleteSlotById service:", error);
        return {
            success: false,
            code: "SERVER_ERROR",
            message: "Internal server error",
        };
    }
};

module.exports.deleteSlotsByDate = async (event_id, date) => {
    try {
        // ✅ Validate Event
        const event = await Event.findByPk(event_id, {
            attributes: ["id", "event_timezone"]
        });

        if (!event) {
            return { success: false, code: 'NOT_FOUND', message: 'Event not found' };
        }

        const timezone = event.event_timezone || "UTC"; // fallback
        const dateOnly = date.split('T')[0]; // e.g. "2025-11-17"
        const startLocal = moment.tz(`${dateOnly} 00:00:00`, timezone);
        const endLocal = moment.tz(`${dateOnly} 23:59:59`, timezone);
        const startOfDayUTC = convertToUTC(startLocal.format(), timezone);
        const endOfDayUTC = convertToUTC(endLocal.format(), timezone);

        console.log("🕒 Deleting slots in UTC range:", startOfDayUTC, "→", endOfDayUTC, timezone);

        // const dateOnly = moment(date).format('YYYY-MM-DD'); // normalize to YYYY-MM-DD
        // const slots = await EventSlots.findAll({
        //     where: { event_id, date: dateOnly },
        // });


        const slots = await EventSlots.findAll({
            where: {
                event_id,
                slot_date: { [Op.between]: [startOfDayUTC, endOfDayUTC] }
            }
        });

        if (!slots.length) {
            return {
                success: false,
                code: 'NOT_FOUND',
                message: `No slots found for ${dateOnly} (UTC range: ${startOfDayUTC.toISOString()} - ${endOfDayUTC.toISOString()})`
            };
        }

        const deletedCount = await EventSlots.destroy({
            where: {
                event_id,
                slot_date: { [Op.between]: [startOfDayUTC, endOfDayUTC] }
            }
        });

        return {
            success: true,
            message: `${deletedCount} slot(s) deleted successfully for ${dateOnly}`,
            data: { event_id, date: dateOnly, deletedCount }
        };

    } catch (error) {
        console.error('❌ Error in deleteSlotsByDate service:', error);
        return { success: false, code: 'SERVER_ERROR', message: 'Internal server error' };
    }
};

module.exports.getEventSlots = async (event_id) => {
    try {
        // ✅ 1. Validate event
        const event = await Event.findByPk(event_id);
        if (!event) {
            return { success: false, code: 'NOT_FOUND', message: 'Event not found' };
        }

        // ✅ 2. Fetch slots for event
        const slots = await EventSlots.findAll({
            where: { event_id },
            order: [['slot_date', 'ASC']],
            attributes: ['id', 'event_id', 'slot_date', 'slot_name', 'start_time', 'end_time', 'description']
        });

        if (!slots.length) {
            return { success: false, code: 'NOT_FOUND', message: 'No slots found for this event' };
        }

        // ✅ 3. Return formatted data
        return {
            success: true,
            message: 'Slots fetched successfully',
            data: { event_id, total_slots: slots.length, slots }
        };

    } catch (error) {
        console.error('❌ Error in getEventSlots service:', error);
        return { success: false, code: 'SERVER_ERROR', message: 'Internal server error' };
    }
};

module.exports.createSlot = async (event_id, slotArray) => {
    try {
        // ✅ 1. Validate event
        const event = await Event.findByPk(event_id);
        if (!event) {
            return { success: false, code: 'VALIDATION_FAILED', message: 'Event not found' };
        }

        // ✅ 2. Validate slots array
        if (!Array.isArray(slotArray) || slotArray.length == 0) {
            return { success: false, code: 'VALIDATION_FAILED', message: 'No slot data provided' };
        }

        const { event_timezone } = event;

        const slotRecords = [];

        // ✅ 3. Validate and prepare slot data (prevent duplicates)
        for (const slot of slotArray) {
            const { slot_date, start_time, end_time, slot_name, description } = slot;
            const formatted_slot_date = convertToUTC(slot.slot_date, event_timezone);
            // console.log('>>>>>>>>>>>>>>>>>>>',formatted_start);
            if (!slot_date || !slot_name || !start_time || !end_time) {
                return {
                    success: false,
                    code: 'VALIDATION_FAILED',
                    message: 'Each slot must include date, name, start time, and end time.',
                };
            }

            // 🔍 Check for duplicate slot (same event, same date, same time range)
            const existingSlot = await EventSlots.findOne({
                where: {
                    event_id,
                    slot_name,
                    slot_date: formatted_slot_date,
                    start_time,
                    end_time,
                },
            });

            if (existingSlot) {
                return {
                    success: false,
                    code: 'DUPLICATE_ERROR',
                    message: `Slot "${slot_name}" already exists for ${slot_date} (${start_time} → ${end_time}).`,
                };
            }

            // ✅ Add to records for bulk creation
            slotRecords.push({
                event_id,
                slot_date,
                slot_name,
                start_time,
                end_time,
                description: description || null,
            });
        }

        // ✅ 4. Bulk insert into DB
        const createdSlots = await EventSlots.bulkCreate(slotRecords);

        return {
            success: true,
            message: 'Slot(s) created successfully',
            slots: createdSlots,
        };

    } catch (error) {
        console.error('❌ Error creating slots:', error.message);
        return { success: false, code: 'SERVER_ERROR', message: 'Internal server error :' + error.message };
    }
};

module.exports.createEvent = async (req, res) => {
    try {
        const {
            name,
            desp,
            date_from,
            date_to,
            location,
            company_id,
            country_id,
            ticket_limit,
            video_url,
            payment_currency,
            slug,
            sale_start,
            sale_end,
            event_timezone,
            entry_type
        } = req.body;

        const user_id = req.user?.id;
        // ✅ Set default timezone if missing or empty
        const finalTimezone = event_timezone && event_timezone.trim() !== ''
            ? event_timezone
            : 'UTC';


        // ✅ Required field validation
        if (
            !name ||
            !desp ||
            !date_from ||
            !date_to ||
            !location ||
            !company_id ||
            !country_id ||
            !slug) {
            return {
                success: false,
                message:
                    'Please complete all required fields before submitting the form (including timezone)',
                code: 'VALIDATION_FAILED',
            };
        }

        // ✅ Image required
        if (!req.file) {
            return {
                success: false,
                message: 'Event image (feat_image) is required',
                code: 'VALIDATION_FAILED',
            };
        }


        // ✅ Duplicate check
        const existingEvent = await Event.findOne({
            where: {
                [Op.or]: [{ name: name.trim() }, { slug: slug.trim() }],
            },
        });

        if (existingEvent) {
            return {
                success: false,
                message: 'An event with the same name or slug already exists',
                code: 'DUPLICATE_ERROR',
            };
        }

        // ✅ Validate image extension
        const { filename } = req.file;
        const allowedExt = ['png', 'jpg', 'jpeg'];
        const ext = filename.split('.').pop().toLowerCase();
        if (!allowedExt.includes(ext)) {
            return {
                success: false,
                message:
                    'Uploaded file is not a valid image. Only JPG, PNG, and JPEG files are allowed.',
                code: 'INVALID_IMAGE',
            };
        }

        const feat_image = filename;

        // ✅ Extra validation for paid events
        if (!ticket_limit || !payment_currency || !sale_start || !sale_end) {
            return {
                success: false,
                message:
                    'Paid events require ticket_limit, payment_currency, sale_start, sale_end',
                code: 'VALIDATION_FAILED',
            };

        }

        // ✅ Convert all date/time fields → UTC using timezone
        const formatted_date_from = convertToUTC(date_from, finalTimezone);
        const formatted_date_to = convertToUTC(date_to, finalTimezone);
        const formatted_sale_start = sale_start ? convertToUTC(sale_start, finalTimezone) : null;
        const formatted_sale_end = sale_end ? convertToUTC(sale_end, finalTimezone) : null;

        // ✅ Build final event object
        const eventData = {
            name: name.trim(),
            desp: desp.trim(),
            date_from: formatted_date_from,
            date_to: formatted_date_to,
            sale_start: formatted_sale_start,
            sale_end: formatted_sale_end,
            location,
            entry_type,
            company_id,
            country_id,
            ticket_limit: ticket_limit || 0,
            video_url,
            payment_currency,
            slug: slug.trim(),
            feat_image,
            event_org_id: user_id,
            fee_assign: 'user',
            event_timezone: finalTimezone, // ✅ Always store timezone (defaulted if missing)
        };

        // ✅ Save to DB
        const newEvent = await Event.create(eventData);

        if (!newEvent) {
            return {
                success: false,
                message: 'Event creation failed',
                code: 'CREATION_FAILED',
            };
        }

        return { success: true, event: newEvent };

    } catch (error) {
        console.error('Error creating event:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'INTERNAL_ERROR',
        };
    }
};

module.exports.updateEvent = async (eventId, updateData, user) => {
    try {
        const existingEvent = await Event.findByPk(eventId);
        if (!existingEvent) {
            return { success: false, message: 'Event not found', code: 'NOT_FOUND' };
        }

        const {
            name,
            desp,
            date_from,
            date_to,
            sale_start,
            sale_end,
            feat_image,
            location,
            company_id,
            country_id,
            ticket_limit,
            video_url,
            payment_currency,
            slug,
            status,
            is_free,
            request_rsvp,
            approve_timer,
            allow_register,
            event_timezone
        } = updateData;

        if (
            Object.keys(updateData).length == 1 &&      // only one key in object
            updateData.hasOwnProperty("status")          // that key is "status"
        ) {
            existingEvent.status = updateData.status;
            await existingEvent.save();

            return {
                success: true,
                message: "Event status updated successfully",
                event: existingEvent
            };
        }

        if (name || slug) {
            const duplicateEvent = await Event.findOne({
                where: {
                    [Op.or]: [
                        name ? { name: name.trim() } : null,
                        slug ? { slug: slug.trim() } : null
                    ].filter(Boolean),
                    id: { [Op.ne]: eventId }
                }
            });

            if (duplicateEvent) {
                return { success: false, message: 'Another event with the same name or slug already exists', code: 'DUPLICATE_ERROR' };
            }
        }

        const effectiveIsFree = is_free !== undefined ? is_free : existingEvent.is_free;
        const effectiveRequestRsvp = request_rsvp !== undefined ? request_rsvp : existingEvent.request_rsvp;

        if (effectiveIsFree == 'Y' && !effectiveRequestRsvp) {
            return { success: false, message: 'request_rsvp is required for free events', code: 'VALIDATION_FAILED' };
        }

        if (effectiveIsFree !== 'Y') {
            if ((ticket_limit == undefined && !existingEvent.ticket_limit) ||
                (payment_currency == undefined && !existingEvent.payment_currency) ||
                (sale_start == undefined && !existingEvent.sale_start) ||
                (sale_end == undefined && !existingEvent.sale_end) ||
                (approve_timer == undefined && !existingEvent.approve_timer)) {
                return {
                    success: false,
                    message: 'Paid events require ticket_limit, payment_currency, sale_start, sale_end, and approve_timer',
                    code: 'VALIDATION_FAILED'
                };
            }
        }

        if ((ticket_limit == undefined && !existingEvent.ticket_limit) ||
            (payment_currency == undefined && !existingEvent.payment_currency) ||
            (sale_start == undefined && !existingEvent.sale_start) ||
            (sale_end == undefined && !existingEvent.sale_end)) {
            return {
                success: false,
                message: 'Events require ticket_limit, payment_currency, sale_start, sale_end',
                code: 'VALIDATION_FAILED'
            };
        }

        if (name) existingEvent.name = name.trim();
        if (desp) existingEvent.desp = desp.trim();
        if (date_from) existingEvent.date_from = new Date(date_from);
        if (date_to) existingEvent.date_to = new Date(date_to);
        if (location) existingEvent.location = location;
        if (company_id) existingEvent.company_id = company_id;
        if (country_id) existingEvent.country_id = country_id;
        if (ticket_limit != undefined) existingEvent.ticket_limit = ticket_limit;
        if (video_url) existingEvent.video_url = video_url;
        if (payment_currency) existingEvent.payment_currency = payment_currency;
        if (slug) existingEvent.slug = slug.trim();
        if (sale_start) existingEvent.sale_start = new Date(sale_start);
        if (sale_end) existingEvent.sale_end = new Date(sale_end);
        if (status != undefined && status !== null) existingEvent.status = status;
        if (event_timezone != undefined && event_timezone !== null) existingEvent.event_timezone = event_timezone;

        if (approve_timer !== undefined) existingEvent.approve_timer = approve_timer;
        if (allow_register !== undefined) existingEvent.allow_register = allow_register == 'Y' ? 'Y' : 'N';
        if (is_free !== undefined) existingEvent.is_free = is_free == 'Y' ? 'Y' : 'N';
        if (request_rsvp) existingEvent.request_rsvp = new Date(request_rsvp);

        // Handle optional image update
        if (feat_image) {
            const allowedExt = ['png', 'jpg', 'jpeg'];
            const ext = feat_image.split('.').pop().toLowerCase();
            if (!allowedExt.includes(ext)) {
                return { success: false, message: 'Uploaded file is not a valid image', code: 'INVALID_IMAGE' };
            }
            const oldImagePath = path.join(process.cwd(), 'uploads/events', existingEvent.feat_image);
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            existingEvent.feat_image = feat_image;
        }
        // Save updates
        await existingEvent.save();
        return { success: true, event: existingEvent };
    } catch (error) {
        console.error('Error updating event:', error);
        return { success: false, message: 'Internal server error: ' + error.message, code: 'INTERNAL_ERROR' };
    }
};

module.exports.companyCreateEvent = async (req, res) => {
    try {
        const { name } = req.body;
        const user_id = req.user?.id;

        // ✅ Validate required fields
        if (!name) {
            return {
                success: false,
                message: 'Company name is required',
                code: 'VALIDATION_FAILED'
            };
        }

        if (!user_id) {
            return {
                success: false,
                message: 'User not authenticated',
                code: 'VALIDATION_FAILED'
            };
        }

        // ✅ Check for duplicate company for the same user
        const existingCompany = await Company.findOne({
            where: {
                name: name.trim(),
                user_id: user_id
            }
        });

        if (existingCompany) {
            return {
                success: false,
                message: 'You already have a company with the same name',
                code: 'DUPLICATE_ERROR'
            };
        }

        // ✅ Create new company
        const newCompany = await Company.create({
            name: name.trim(),
            user_id: user_id,
            status: 'Y' // Default status, change if needed
        });

        if (!newCompany) {
            return {
                success: false,
                message: 'Company creation failed',
                code: 'CREATION_FAILED'
            };
        }

        return {
            success: true,
            message: 'Company created successfully',
            company: newCompany
        };

    } catch (error) {
        console.error('Error creating company:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'INTERNAL_ERROR'
        };
    }
};

module.exports.companyList = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) {
            return {
                success: false,
                message: 'User not authenticated',
                code: 'VALIDATION_FAILED'
            };
        }

        const companies = await Company.findAll({
            where: { user_id: user_id }
        });

        return {
            success: true,
            message: 'Company list fetched successfully',
            companies: companies
        };

    } catch (error) {
        console.error('Error fetching company list:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'INTERNAL_ERROR'
        };
    }

}

module.exports.eventList = async (req, res) => {
    try {
        const user = req.user;
        const {
            search,
            status,
            id,
            company_id,
            slug,
            org_id,
            date_from,
            date_to
        } = req.body || {};

        let whereCondition = {};

        // 🔒 Restrict organizer (if not admin)
        if (user.role_id !== 1) {
            whereCondition.event_org_id = user.id;
        }

        // 🔍 Search by event name
        if (search && search.trim() !== "") {
            whereCondition.name = { [Op.like]: `%${search.trim()}%` };
        }

        // 🏷️ Filter by event status
        if (status && status.trim() !== "") {
            whereCondition.status = status;
        }

        // 🆔 Filter by event ID
        if (id) {
            whereCondition.id = id;
        }

        // 🏢 Filter by company
        if (company_id) {
            whereCondition.company_id = company_id;
        }

        // 🧩 Filter by slug
        if (slug && slug.trim() !== "") {
            whereCondition.slug = slug.trim();
        }

        // 👨‍💼 Filter by organizer ID
        if (org_id) {
            whereCondition.event_org_id = org_id;
        }

        // 📅 Date range filters
        if (date_from && date_to) {
            whereCondition.date_from = { [Op.between]: [date_from, date_to] };
        } else if (date_from) {
            whereCondition.date_from = { [Op.gte]: date_from };
        } else if (date_to) {
            whereCondition.date_to = { [Op.lte]: date_to };
        }

        // 🧾 Fetch events
        const events = await Event.findAll({
            where: whereCondition,
            order: [["date_from", "DESC"]],
        });

        // 🕒 Convert UTC → Local
        const formattedEvents = events.map((event) => {
            const data = event.toJSON();
            const tz = data.event_timezone || "UTC";

            const convertDate = (date) =>
                date
                    ? {
                        utc: date,
                        local: convertUTCToLocal(date, tz),
                        timezone: tz,
                    }
                    : null;

            return {
                ...data,
                date_from: convertDate(data.date_from),
                date_to: convertDate(data.date_to),
                sale_start: convertDate(data.sale_start),
                sale_end: convertDate(data.sale_end),
            };
        });

        // ✅ Response
        return {
            success: true,
            message: "Event list fetched successfully",
            data: formattedEvents,
        };
    } catch (error) {
        console.error("Error fetching event list:", error);
        return {
            success: false,
            message: "Internal server error: " + error.message,
            code: "INTERNAL_ERROR",
        };
    }
};

module.exports.getEventDetails = async (req, res) => {
    try {
        const { event_id } = req.params;

        if (!event_id) {
            return {
                success: false,
                code: 'VALIDATION_FAILED',
                message: 'Event ID is required'
            };
        }

        // Step 1️⃣: Get event basic info (to check entry_type)
        const event = await Event.findOne({
            where: { id: event_id },
            include: [{ model: TicketType, as: 'tickets' }]
        });

        if (!event) {
            return {
                success: false,
                code: 'EVENT_NOT_FOUND',
                message: 'Event not found'
            };
        }

        const { entry_type } = event;

        // Step 2️⃣: Build dynamic includes
        const includeConfig = [
            {
                model: TicketType,
                as: 'tickets',
                include: [
                    {
                        model: TicketPricing,
                        as: 'pricings'
                    }
                ]
            }
        ];

        // Only add slots if event type is slot-based
        if (entry_type == 'slot' || entry_type == 'multi') {
            includeConfig.push({
                model: EventSlots,
                as: 'slots',
                include: [
                    {
                        model: TicketPricing,
                        as: 'pricings',
                        include: [
                            {
                                model: TicketType,
                                as: 'ticket'
                            }
                        ]
                    }
                ]
            });
        }

        // Step 3️⃣: Fetch event with proper structure
        const eventDetails = await Event.findOne({
            where: { id: event_id },
            include: includeConfig
        });

        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const imagePath = "uploads/events";


        const data = eventDetails.toJSON();
        const tz = data.event_timezone || "UTC";

        const formatDate = (date) =>
            date
                ? {
                    utc: date,
                    local: convertUTCToLocal(date, tz),
                    timezone: tz
                }
                : null;

        const formattedEvent = {
            ...data,
            feat_image: data.feat_image
                ? `${baseUrl.replace(/\/$/, "")}/${imagePath}/${data.feat_image}`
                : `${baseUrl.replace(/\/$/, "")}/${imagePath}/default.jpg`,

            date_from: formatDate(data.date_from),
            date_to: formatDate(data.date_to),
            sale_start: formatDate(data.sale_start),
            sale_end: formatDate(data.sale_end)
        };

        return {
            success: true,
            message: "Event details fetched successfully",
            data: formattedEvent
        };

    } catch (error) {
        console.error('❌ Error fetching event details:', error.message);
        return {
            success: false,
            code: 'DB_ERROR',
            message: 'Internal server error: ' + error.message
        };
    }
};

module.exports.deleteEvent = async (eventId) => {
    try {
        // ✅ Find the event
        const event = await Event.findByPk(eventId);

        if (!event) {
            return { success: false, code: "NOT_FOUND", message: "Event not found" };
        }

        // ✅ Delete image from filesystem (if exists)
        if (event.feat_image) {
            const imagePath = path.join(process.cwd(), 'uploads/events', event.feat_image);
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log("🗑️ Deleted image file:", imagePath);
                } catch (err) {
                    console.error("Error deleting event image:", err.message);
                }
            }
        }

        // ✅ Delete event record
        await event.destroy();

        return {
            success: true,
            message: "Event deleted successfully",
            data: { id: eventId },
        };
    } catch (error) {
        console.error("Service error in deleteEvent:", error);
        return {
            success: false,
            code: "DB_ERROR",
            message: "Database error occurred while deleting the event",
        };
    }
};

//...// new api.. get event details and appointments slots  function..
// module.exports.getEventAppointmentsDetails = async (req, res) => {
//     try {
//         const { event_id } = req.params;

//         if (!event_id) {
//             return {
//                 success: false,
//                 code: "VALIDATION_FAILED",
//                 message: "Event ID is required"
//             };
//         }

//         // Step 1️⃣: Fetch event with ticket types
//         const event = await Event.findOne({
//             where: { id: event_id },
//             include: [
//                 {
//                     model: Wellness, as: "wellness",
//                     where: { status: 'Y' },
//                     include: [{ model: WellnessSlots, as: 'wellnessSlots' }, { model: Currency, as: 'currencyName', attributes: ['Currency_symbol', 'Currency'] }]
//                 } // If needed
//             ],
//             attributes: ['id', 'event_org_id', 'name', 'desp', 'location', 'feat_image']
//         });


//         if (!event) {
//             return {
//                 success: false,
//                 code: "EVENT_NOT_FOUND",
//                 message: "Event not found"
//             };
//         }

//         // Step 2️⃣: Format event image path
//         const baseUrl = process.env.BASE_URL || "http://localhost:5000";
//         const imagePath = "uploads/events";

//         const data = event.toJSON();

//         const formattedEvent = {
//             ...data,
//             feat_image: data.feat_image
//                 ? `${baseUrl.replace(/\/$/, "")}/${imagePath}/${data.feat_image}`
//                 : `${baseUrl.replace(/\/$/, "")}/${imagePath}/default.jpg`
//         };

//         // Add base URL to wellness images
//         if (formattedEvent.wellness && Array.isArray(formattedEvent.wellness)) {
//             formattedEvent.wellness = formattedEvent.wellness.map(well => ({
//                 ...well,
//                 Image: well.Image
//                     ? `${baseUrl.replace(/\/$/, "")}/uploads/wellness/${well.Image}`
//                     : `${baseUrl.replace(/\/$/, "")}/uploads/wellness/default.jpg`
//             }));
//         }

//         // Step 3️⃣: Final Response
//         return {
//             success: true,
//             message: "Event & appointment slot details fetched successfully",
//             data: formattedEvent
//         };

//     } catch (error) {
//         console.error("❌ Error fetching event details:", error.message);
//         return {
//             success: false,
//             code: "DB_ERROR",
//             message: "Internal server error: " + error.message
//         };
//     }
// };


// service......
module.exports.getEventAppointmentsDetails = async (req, res) => {
    try {
        const { event_id } = req.params;

        if (!event_id) {
            return {
                success: false,
                code: "VALIDATION_FAILED",
                message: "Event ID is required"
            };
        }

        // Step 1️⃣: Fetch event with wellness & slots
        const event = await Event.findOne({
            where: { id: event_id },
            include: [
                {
                    model: Wellness,
                    as: "wellness",
                    where: { status: 'Y' },
                    include: [
                        { model: WellnessSlots, as: 'wellnessSlots' },
                        { model: Currency, as: 'currencyName', attributes: ['Currency_symbol', 'Currency'] }
                    ]
                }
            ],
            attributes: ['id', 'event_org_id', 'name', 'desp', 'location', 'feat_image']
        });

        if (!event) {
            return {
                success: false,
                code: "EVENT_NOT_FOUND",
                message: "Event not found"
            };
        }

        // Convert to JSON
        const data = event.toJSON();

        // Step 2️⃣: Format event image path
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const imagePath = "uploads/events";

        const formattedEvent = {
            ...data,
            feat_image: data.feat_image
                ? `${baseUrl.replace(/\/$/, "")}/${imagePath}/${data.feat_image}`
                : `${baseUrl.replace(/\/$/, "")}/${imagePath}/default.jpg`
        };

        // Step 3️⃣: Hide fully booked slots
        if (formattedEvent.wellness && Array.isArray(formattedEvent.wellness)) {
            // Collect all slot IDs
            const allSlotIds = [];
            formattedEvent.wellness.forEach(well => {
                if (well.wellnessSlots && Array.isArray(well.wellnessSlots)) {
                    well.wellnessSlots.forEach(slot => allSlotIds.push(slot.id));
                }
            });

            // Fetch all booked order items for these slots
            const bookedOrders = await OrderItems.findAll({
                where: { appointment_id: allSlotIds },
                attributes: ['appointment_id', 'count']
            });

            // Calculate booked count per slot
            const bookedMap = {};
            bookedOrders.forEach(order => {
                if (!bookedMap[order.appointment_id]) bookedMap[order.appointment_id] = 0;
                bookedMap[order.appointment_id] += order.count;
            });

            // Format wellness & filter slots
            formattedEvent.wellness = formattedEvent.wellness.map(well => {
                // Format wellness image
                well.Image = well.Image
                    ? `${baseUrl.replace(/\/$/, "")}/uploads/wellness/${well.Image}`
                    : `${baseUrl.replace(/\/$/, "")}/uploads/wellness/default.jpg`;

                // Filter fully booked slots
                if (well.wellnessSlots && Array.isArray(well.wellnessSlots)) {
                    well.wellnessSlots = well.wellnessSlots.filter(slot => {
                        const booked = bookedMap[slot.id] || 0;
                        return booked < slot.count; // keep only available slots
                    });
                }

                return well;
            });
        }

        // Step 4️⃣: Final response
        return {
            success: true,
            message: "Event & appointment slot details fetched successfully",
            data: formattedEvent
        };

    } catch (error) {
        console.error("❌ Error fetching event details:", error.message);
        return {
            success: false,
            code: "DB_ERROR",
            message: "Internal server error: " + error.message
        };
    }
};


// new function appointments data 
module.exports.getSelectedWellnessSlots = async (req, res) => {
    try {
        const { event_id } = req.params;
        const { slotIds } = req.body;
        if (!event_id) {
            return {
                success: false,
                code: "VALIDATION_FAILED",
                message: "Event ID is required"
            };
        }

        // Step 1️⃣ Fetch event + wellness + ONLY selected slotIds
        const event = await Event.findOne({
            where: { id: event_id },
            include: [
                {
                    model: Wellness,
                    as: "wellness",
                    where: { status: 'Y' },
                    include: [
                        {
                            model: WellnessSlots,
                            as: 'wellnessSlots',
                            where: { id: slotIds }, // 👉 ONLY selected slot IDs
                        },
                        {
                            model: Currency,
                            as: 'currencyName',
                            attributes: ['Currency_symbol', 'Currency']
                        }
                    ]
                }
            ],
            attributes: ['id', 'event_org_id', 'name', 'desp', 'location', 'feat_image']
        });

        if (!event) {
            return {
                success: false,
                code: "EVENT_NOT_FOUND",
                message: "Event not found"
            };
        }

        const data = event.toJSON();

        // Step 2️⃣ Format event image
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const formattedEvent = {
            ...data,
            feat_image: data.feat_image
                ? `${baseUrl}uploads/events/${data.feat_image}`
                : `${baseUrl}/uploads/events/default.jpg`
        };

        // Step 3️⃣ Format wellness & slot images (NO filtering)
        if (Array.isArray(formattedEvent.wellness)) {
            formattedEvent.wellness = formattedEvent.wellness.map(well => {
                well.Image = well.Image
                    ? `${baseUrl}uploads/wellness/${well.Image}`
                    : `${baseUrl}/uploads/wellness/default.jpg`;

                return well; // return formatted data
            });
        }

        // Step 4️⃣ Final response
        return {
            success: true,
            message: "Event & appointment slot details fetched successfully",
            data: formattedEvent
        };

    } catch (error) {
        console.error("❌ Error fetching event details:", error.message);
        return {
            success: false,
            code: "DB_ERROR",
            message: "Internal server error: " + error.message
        };
    }
};