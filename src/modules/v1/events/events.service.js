const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { Company, Event } = require('../../../models');
const { convertToUTC, convertUTCToLocal } = require('../../../common/utils/timezone'); // ✅ Reuse timezone util


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
            date_to,
            sale_start,
            sale_end
        } = req.body || {};

        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const imagePath = "uploads/events";
        let whereCondition = {};

        // ✅ Role-based restriction (non-admins see only their own events)
        if (user.role_id !== 1) {
            whereCondition.event_org_id = user.id;
        }

        // ✅ ID Filter
        if (id) whereCondition.id = id;

        // ✅ Organizer ID
        if (org_id) whereCondition.event_org_id = org_id;

        // ✅ Company ID
        if (company_id) whereCondition.company_id = company_id;

        // ✅ Slug
        if (slug && slug.trim() !== "") whereCondition.slug = slug.trim();

        // ✅ Status
        if (status && status.trim() !== "") whereCondition.status = status.trim();

        // ✅ Search by Name
        if (search && search.trim() !== "") {
            whereCondition.name = { [Op.like]: `%${search.trim()}%` };
        }

        // ✅ Event Date Range Filter
        if (date_from && date_to) {
            whereCondition.date_from = { [Op.between]: [new Date(date_from), new Date(date_to)] };
        } else if (date_from) {
            whereCondition.date_from = { [Op.gte]: new Date(date_from) };
        } else if (date_to) {
            whereCondition.date_from = { [Op.lte]: new Date(date_to) };
        }

        // ✅ Sale Start / End Date Range Filters
        if (sale_start && sale_end) {
            whereCondition.sale_start = { [Op.between]: [new Date(sale_start), new Date(sale_end)] };
        } else if (sale_start) {
            whereCondition.sale_start = { [Op.gte]: new Date(sale_start) };
        } else if (sale_end) {
            whereCondition.sale_start = { [Op.lte]: new Date(sale_end) };
        }

        // ✅ Fetch Events
        const events = await Event.findAll({
            where: whereCondition,
            order: [["date_from", "DESC"]],
        });

        // ✅ Format and Convert Dates
        const formattedEvents = events.map((event) => {
            const data = event.toJSON();
            const tz = data.event_timezone || "UTC";

            const formatDate = (date) =>
                date
                    ? {
                        utc: date,
                        local: convertUTCToLocal(date, tz),
                        timezone: tz,
                    }
                    : null;

            return {
                ...data,
                feat_image: data.feat_image
                    ? `${baseUrl.replace(/\/$/, "")}/${imagePath}/${data.feat_image}`
                    : `${baseUrl.replace(/\/$/, "")}/${imagePath}/default.jpg`,
                date_from: formatDate(data.date_from),
                date_to: formatDate(data.date_to),
                sale_start: formatDate(data.sale_start),
                sale_end: formatDate(data.sale_end),
            };
        });

        // ✅ Send Response
        return {
            success: true,
            message: "Event list fetched successfully",
            data: formattedEvents,
            filters_used: whereCondition, // optional debug info
        };
    } catch (error) {

        return {
            success: false,
            message: "Internal server error: " + error.message,
            code: "INTERNAL_ERROR",
        };
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
            approve_timer,
            is_free,
            allow_register,
            request_rsvp,
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

        // ✅ RSVP validation for free events
        if (is_free == 'Y' && !request_rsvp) {
            return {
                success: false,
                message: 'request_rsvp is required for free events',
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
        if (is_free !== 'Y') {
            if (!ticket_limit || !payment_currency || !sale_start || !sale_end || !approve_timer) {
                return {
                    success: false,
                    message:
                        'Paid events require ticket_limit, payment_currency, sale_start, sale_end, and approve_timer',
                    code: 'VALIDATION_FAILED',
                };
            }
        }

        // ✅ Convert all date/time fields → UTC using timezone
        const formatted_date_from = convertToUTC(date_from, finalTimezone);
        const formatted_date_to = convertToUTC(date_to, finalTimezone);
        const formatted_sale_start = sale_start ? convertToUTC(sale_start, finalTimezone) : null;
        const formatted_sale_end = sale_end ? convertToUTC(sale_end, finalTimezone) : null;
        const formatted_request_rsvp = request_rsvp ? convertToUTC(request_rsvp, finalTimezone) : null;

        const admin_status = is_free == 'Y' ? 'Y' : 'N';

        // ✅ Build final event object
        const eventData = {
            name: name.trim(),
            desp: desp.trim(),
            date_from: formatted_date_from,
            date_to: formatted_date_to,
            location,
            company_id,
            country_id,
            ticket_limit: ticket_limit || 0,
            video_url,
            payment_currency,
            slug: slug.trim(),
            sale_start: formatted_sale_start,
            sale_end: formatted_sale_end,
            approve_timer,
            feat_image,
            event_org_id: user_id,
            fee_assign: 'user',
            is_free: is_free == 'Y' ? 'Y' : 'N',
            allow_register: allow_register == 'Y' ? 'Y' : 'N',
            admineventstatus: admin_status,
            request_rsvp: formatted_request_rsvp,
            event_timezone: finalTimezone, // ✅ Always store timezone (defaulted if missing)
        };

        // console.log('>>>>>>>>>>>>>>>>>', eventData);

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
            location,
            company_id,
            country_id,
            ticket_limit,
            video_url,
            payment_currency,
            slug,
            sale_start,
            sale_end,
            approve_timer,
            is_free,
            allow_register,
            request_rsvp,
            feat_image,
            status
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

        // ✅ Determine effective values for validation
        const effectiveIsFree = is_free !== undefined ? is_free : existingEvent.is_free;
        const effectiveRequestRsvp = request_rsvp !== undefined ? request_rsvp : existingEvent.request_rsvp;
        // console.log('>>>>>>>',effectiveIsFree);
        
        // ✅ Free event validation
        if (effectiveIsFree == 'Y' && !effectiveRequestRsvp) {
            return { success: false, message: 'request_rsvp is required for free events', code: 'VALIDATION_FAILED' };
        }

        // ✅ Paid event validation
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
        if (approve_timer !== undefined) existingEvent.approve_timer = approve_timer;
        if (allow_register !== undefined) existingEvent.allow_register = allow_register == 'Y' ? 'Y' : 'N';
        if (is_free !== undefined) existingEvent.is_free = is_free == 'Y' ? 'Y' : 'N';
        if (request_rsvp) existingEvent.request_rsvp = new Date(request_rsvp);
        if (status !== undefined && status !== null) existingEvent.status = status;

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