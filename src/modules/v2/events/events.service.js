const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { Company, Event, EventSlots, TicketType, TicketPricing } = require('../../../models');
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
            event_type
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
            event_type,
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
        } = updateData;

        // ✅ Conditional duplicate check (only if name or slug is changed)
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


        // ✅ Paid event validation
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


        // ✅ Update only provided fields
        if (name) existingEvent.name = name.trim();
        if (desp) existingEvent.desp = desp.trim();
        if (date_from) existingEvent.date_from = new Date(date_from);
        if (date_to) existingEvent.date_to = new Date(date_to);
        if (location) existingEvent.location = location;
        if (company_id) existingEvent.company_id = company_id;
        if (country_id) existingEvent.country_id = country_id;
        if (ticket_limit !== undefined) existingEvent.ticket_limit = ticket_limit;
        if (video_url) existingEvent.video_url = video_url;
        if (payment_currency) existingEvent.payment_currency = payment_currency;
        if (slug) existingEvent.slug = slug.trim();
        if (sale_start) existingEvent.sale_start = new Date(sale_start);
        if (sale_end) existingEvent.sale_end = new Date(sale_end);

        // ✅ Handle optional image update
        if (feat_image) {
            const allowedExt = ['png', 'jpg', 'jpeg'];
            const ext = feat_image.split('.').pop().toLowerCase();
            if (!allowedExt.includes(ext)) {
                return { success: false, message: 'Uploaded file is not a valid image', code: 'INVALID_IMAGE' };
            }

            // Remove old image
            const oldImagePath = path.join(process.cwd(), 'uploads/events', existingEvent.feat_image);
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);

            existingEvent.feat_image = feat_image;
        }

        // ✅ Save updates
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
        const { search, status } = req.body || {};
        let whereCondition = {};

        if (user.role_id != 1) {
            whereCondition.event_org_id = user.id;
        }

        if (search && search.trim() !== '') {
            whereCondition.name = { [Op.like]: `%${search.trim()}%` };
        }

        if (status && status.trim() !== '') {
            whereCondition.status = status;
        }

        const events = await Event.findAll({
            where: whereCondition,
            order: [['date_from', 'DESC']],
        });

        // ✅ Convert UTC → Local before sending
        const formattedEvents = events.map(event => {
            const data = event.toJSON();
            const tz = data.event_timezone || 'UTC';

            return {
                ...data,
                date_from: {
                    utc: data.date_from,
                    local: convertUTCToLocal(data.date_from, tz),
                    timezone: tz
                },
                date_to: {
                    utc: data.date_to,
                    local: convertUTCToLocal(data.date_to, tz),
                    timezone: tz
                },
                sale_start: data.sale_start ? {
                    utc: data.sale_start,
                    local: convertUTCToLocal(data.sale_start, tz),
                    timezone: tz
                } : null,
                sale_end: data.sale_end ? {
                    utc: data.sale_end,
                    local: convertUTCToLocal(data.sale_end, tz),
                    timezone: tz
                } : null
            };
        });


        return {
            success: true,
            message: 'Event list fetched successfully',
            data: formattedEvents,
        };
    } catch (error) {
        console.error('Error fetching event list:', error.message);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'INTERNAL_ERROR',
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

        // Fetch event with slots -> ticket pricing -> ticket type
        const event = await Event.findOne({
            where: { id: event_id },
            include: [
                {
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
                },
                {
                    model: TicketType,
                    as: 'tickets'
                }
            ]
        });

        if (!event) {
            return {
                success: false,
                code: 'EVENT_NOT_FOUND',
                message: 'Event not found'
            };
        }

        return {
            success: true,
            message: 'Event details fetched successfully',
            data: event
        };

    } catch (error) {
        console.error('Error fetching event details:', error.message);
        return {
            success: false,
            code: 'DB_ERROR',
            message: 'Internal server error: ' + error.message
        };
    }
};
