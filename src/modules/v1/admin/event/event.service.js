const { Op, Sequelize } = require('sequelize');
const { User, Event, TicketType, Orders, Currency, OrderItems, AddonTypes, WellnessSlots, Wellness } = require('../../../../models');




// Get event List..
module.exports.getEventList = async (req, res) => {
    try {
        const adminId = req.user?.id;
        if (!adminId) {
            return {
                success: false,
                message: 'Unauthorized access. Admin authentication required.',
                code: 'UNAUTHORIZED'
            };
        }
        const events = await Event.findAll({
            // where: { role_id: 2 }, // Event Organiser role
            include: [{ model: User, attributes: ['id', 'email', 'first_name', 'last_name'], as: "Organizer" },
            { model: TicketType, attributes: ['id', 'title', 'type'], as: "tickets" },
            {
                model: Orders,
                as: "orders",
                attributes: []
            },
            {
                model: Currency,
                as: "currencyName",
                attributes: ['Currency_symbol']
            }
            ],
            attributes: [
                'id',
                'name',
                'location',
                'event_org_id',
                'date_from',
                'date_to',
                'status',
                'featured',
                'video_url',
                'slug',

                // 🔥 TOTAL SALES
                [Sequelize.fn('SUM', Sequelize.col('orders.sub_total')), 'total_sales'],

                // 🔥 TOTAL TAX
                [Sequelize.fn('SUM', Sequelize.col('orders.tax_total')), 'total_tax'],

                // 🔥 GRAND TOTAL (optional)
                [Sequelize.fn('SUM', Sequelize.col('orders.grand_total')), 'grand_total']

            ],
            group: ['Event.id', 'Organizer.id', 'tickets.id'],
            order: [['id', 'DESC']]
        });
        return {
            success: true,
            message: 'Events fetched successfully.',
            data: events
        };
    } catch (error) {
        console.error('Error fetching event:', error);
        return {
            success: false,
            message: 'An unexpected error occurred while fetching event.',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};


// Status update Api..
module.exports.updateStatusEvent = async (req) => {
    try {
        const eventId = req.params.id;
        const { status } = req.body;
        // Find record
        const existingEvent = await Event.findByPk(eventId);
        if (!existingEvent) {
            return {
                success: false,
                message: 'Event  not found',
                code: 'EVENT_NOT_FOUND'
            };
        }
        // Update ONLY status
        await existingEvent.update({ status });
        return {
            success: true,
            message: 'Event Status updated successfully',
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            code: 'DB_ERROR'
        };
    }
};


// featured Status update Api..
module.exports.updateEventFeatured = async (req) => {
    try {
        const { id } = req.params;
        const { featured } = req.body;

        const event = await Event.findByPk(id);
        if (!event) {
            return {
                success: false,
                message: 'Event not found',
                code: 'EVENT_NOT_FOUND'
            };
        }
        await event.update({ featured });
        return {
            success: true,
            message: `Event ${featured ? 'marked as featured' : 'removed from featured'} successfully`
        };
    } catch (error) {
        return {
            success: false,
            message: 'Failed to update event featured status',
            code: 'DB_ERROR'
        };
    }
};


module.exports.deleteEvent = async (req) => {
    try {
        const { id } = req.params;
        // Find existing event
        const event = await Event.findByPk(id);
        if (!event) {
            return {
                success: false,
                message: 'Event not found',
                code: 'EVENT_NOT_FOUND'
            };
        }

        // Delete event
        await event.destroy();

        return {
            success: true,
            message: 'Event deleted successfully'
        };
    } catch (error) {
        console.error('Error deleting event:', error);
        return {
            success: false,
            message: 'Failed to delete event',
            code: 'DB_ERROR'
        };
    }
};


// Get event ticket type List..
module.exports.getTicketTypesByEvent = async (req) => {
    try {
        const eventId = req.params.id;
        if (!eventId) {
            return {
                success: false,
                message: 'Event ID is required.',
                code: 'VALIDATION_ERROR'
            };
        }

        // const ticketTypes = await TicketType.findAll({
        const ticketTypes = await Event.findAll({
            where: { id: eventId },
            attributes: ['id', 'name'],
            include: [{ model: TicketType, attributes: ['id', 'eventid', 'title', 'count', 'price', 'access_type', 'type', 'sold_out'], as: "tickets" },
            { model: Currency, as: "currencyName", attributes: ['Currency_symbol'] }
            ],
            order: [['id', 'DESC']]
        });

        // attributes: ['id', 'eventid', 'title', 'count', 'price', 'access_type', 'type', 'sold_out'],
        return {
            success: true,
            message: 'Ticket types fetched successfully.',
            data: ticketTypes
        };
    } catch (error) {
        console.error('Error fetching ticket types:', error);
        return {
            success: false,
            message: 'An unexpected error occurred while fetching ticket types.',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};

// View event Organizer By id 
module.exports.getEventOrganizerById = async (userId) => {
    try {
        if (!userId) {
            return {
                success: false,
                message: 'Event organizer ID is required.',
                code: 'VALIDATION_FAILED'
            };
        }
        const organizer = await User.findOne({
            where: {
                id: userId,
                role_id: 2 // ✅ Event Organizer only
            },
            attributes: [
                'id',
                'first_name',
                'last_name',
                'email',
                'mobile'
            ]
        });

        if (!organizer) {
            return {
                success: false,
                message: 'Event organizer not found.',
                code: 'ORGANIZER_NOT_FOUND'
            };
        }

        return {
            success: true,
            message: 'Event organizer fetched successfully.',
            data: organizer
        };

    } catch (error) {
        console.error('❌ Error fetching event organizer:', error);
        return {
            success: false,
            message: 'Internal server error.',
            code: 'DB_ERROR'
        };
    }
};

// get staff list with eventId
module.exports.getEventStaff = async (req) => {
    try {
        // const adminId = req.user?.id;
        const { eventId } = req.params;
        // if (!adminId) {
        //     return {
        //         success: false,
        //         message: 'Unauthorized access. Admin authentication required.',
        //         code: 'UNAUTHORIZED'
        //     };
        // }
        if (!eventId) {
            return {
                success: false,
                message: 'Event ID is required.',
                code: 'VALIDATION_ERROR'
            };
        }
        const staff = await User.findAll({
            where: Sequelize.where(
                Sequelize.fn('FIND_IN_SET', eventId, Sequelize.col('eventId')),
                { [Op.gt]: 0 }
            ),
            attributes: [
                'id',
                'email',
                'first_name',
                'last_name',
                'mobile'
            ],
            order: [['id', 'DESC']]
        });

        return {
            success: true,
            message: 'Event staff fetched successfully.',
            data: staff
        };
    } catch (error) {
        console.error('Error fetching event staff:', error);
        return {
            success: false,
            message: 'An unexpected error occurred while fetching event staff.',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};


// search event details..service
module.exports.searchEventList = async (req) => {
    try {
        let { eventName, organizer, fromDate, toDate } = req.query;
        const whereCondition = {};
        // ✅ Event name filter
        if (eventName) {
            whereCondition.name = {
                [Op.like]: `%${eventName}%`
            };
        }

        // ✅ Date handling (FULL DAY RANGE)
        const from = fromDate
            ? new Date(new Date(fromDate).setHours(0, 0, 0, 0))
            : null;

        const to = toDate
            ? new Date(new Date(toDate).setHours(23, 59, 59, 999))
            : null;

        // ✅ STRICT DATE FILTER + DATA SAFETY
        if (from && to) {
            whereCondition[Op.and] = [
                { date_from: { [Op.gte]: from } },
                { date_to: { [Op.lte]: to } },
                { date_from: { [Op.lte]: { [Op.col]: "date_to" } } } // safety
            ];
        }
        else if (from) {
            whereCondition[Op.and] = [
                { date_from: { [Op.gte]: from } },
                { date_from: { [Op.lte]: { [Op.col]: "date_to" } } }
            ];
        }
        else if (to) {
            whereCondition[Op.and] = [
                { date_to: { [Op.lte]: to } },
                { date_from: { [Op.lte]: { [Op.col]: "date_to" } } }
            ];
        }

        const events = await Event.findAll({
            where: whereCondition,
            include: [
                {
                    model: User,
                    as: "Organizer",
                    attributes: ["id", "email", "first_name", "last_name"],
                    where: organizer
                        ? {
                            [Op.or]: [
                                { first_name: { [Op.like]: `%${organizer}%` } },
                                { last_name: { [Op.like]: `%${organizer}%` } }
                            ]
                        }
                        : undefined,
                    required: !!organizer
                },
                {
                    model: TicketType,
                    as: "tickets",
                    attributes: ["id", "title"]
                }, {
                    model: Orders,
                    as: "orders",
                    // attributes: ["id", "event_id", "event_id", "tax_total", 'grand_total']
                    attributes: []
                },
                {
                    model: Currency,
                    as: "currencyName",
                    attributes: ['Currency_symbol']
                }
            ],
            attributes: [
                "id",
                "name",
                "location",
                "event_org_id",
                "date_from",
                "date_to",
                "status",
                "featured",
                "video_url",
                'slug',

                // 🔥 TOTAL SALES
                [Sequelize.fn('SUM', Sequelize.col('orders.sub_total')), 'total_sales'],

                // 🔥 TOTAL TAX
                [Sequelize.fn('SUM', Sequelize.col('orders.tax_total')), 'total_tax'],

                // 🔥 GRAND TOTAL (optional)
                [Sequelize.fn('SUM', Sequelize.col('orders.grand_total')), 'grand_total']

            ],
            group: ['Event.id', 'Organizer.id', 'tickets.id'],
            order: [["id", "DESC"]]
        });

        return {
            success: true,
            message: "Events fetched successfully.",
            data: events
        };

    } catch (error) {
        console.error("Error searching events:", error);
        return {
            success: false,
            message: "An unexpected error occurred while searching events.",
            code: "INTERNAL_SERVER_ERROR"
        };
    }
};



// Get Event details with particular order details
module.exports.getEventDetailsWithOrderDetails = async (req) => {
    try {
        const { id: eventId } = req.params;
        if (!eventId) {
            return {
                success: false,
                message: "Event ID is required.",
                code: "VALIDATION_ERROR",
            };
        }
        const eventDetails = await Event.findOne({
            where: { id: eventId },
            include: [
                {
                    model: Currency,
                    as: "currencyName",
                    attributes: ['Currency_symbol', 'Currency']
                },
                {
                    model: OrderItems,
                    as: "orderItems",
                    attributes: ['id', 'user_id', 'ticket_id', 'addon_id', 'appointment_id'],
                    include: [{
                        model: Orders,
                        as: "order",
                        attributes: ['id', 'sub_total', 'tax_total', 'created'],
                        include: [{ model: User, attributes: ['id', 'email', 'first_name', 'last_name', 'mobile'], as: "user" }]
                    },
                    {
                        model: TicketType,
                        as: "ticketType",
                        attributes: ['title']
                    },
                    {
                        model: AddonTypes,
                        as: "addonType",
                        attributes: ['name']
                    },
                    {
                        model: WellnessSlots,
                        as: "appointment",
                        attributes: ['wellness_id'],
                        include: {
                            model: Wellness,
                            as: 'wellnessList',
                            attributes: ['name']
                        }
                    },
                    ]
                }
            ],
            attributes: ['id', 'name', 'date_from', 'date_to', 'location'],
            order: [['id', 'DESC']]
        });
        if (!eventDetails) {
            return {
                success: false,
                message: "Event not found.",
                code: "NOT_FOUND",
            };
        }


        // ===============================
        // 🔹 CALCULATE TOTALS
        // ===============================
        let totalSubTotal = 0;
        let totalTaxTotal = 0;

        const uniqueOrders = new Map();
        eventDetails.orderItems.forEach(item => {
            if (item.order && !uniqueOrders.has(item.order.id)) {
                uniqueOrders.set(item.order.id, {
                    sub_total: Number(item.order.sub_total || 0),
                    tax_total: Number(item.order.tax_total || 0)
                });
            }
        });

        for (const order of uniqueOrders.values()) {
            totalSubTotal += order.sub_total;
            totalTaxTotal += order.tax_total;
        }

        return {
            success: true,
            message: "Event details fetched successfully.",
            data: {
                ...eventDetails.toJSON(),
                totalSubTotal,
                totalTaxTotal
            }
            // data: eventDetails,
            // totalSales:totalSubTotal,
            // totalTax:totalTaxTotal
        };

    } catch (error) {
        console.error("Error fetching event details:", error);

        return {
            success: false,
            message: "An unexpected error occurred while fetching event details.",
            code: "INTERNAL_SERVER_ERROR",
        };
    }
};


// service...
module.exports.getEventByName = async (search = "") => {
    try {
        const whereCondition = {};

        // 👇 name based search
        if (search) {
            whereCondition.name = {
                [Op.like]: `%${search}%`,   // MySQL
                // [Op.iLike]: `%${search}%` // PostgreSQL
            };
        }

        const events = await Event.findAll({
            where: whereCondition,
            attributes: ["id", "name"],
            order: [["id", "DESC"]],
            limit: 20, // 👈 autocomplete friendly
        });

        return {
            success: true,
            message: "Events fetched successfully.",
            data: events,
        };
    } catch (error) {
        console.error("Error fetching events:", error);
        return {
            success: false,
            message: "An unexpected error occurred while fetching events.",
            code: "INTERNAL_SERVER_ERROR",
        };
    }
};



// services/event.service.js
module.exports.getEventById = async (req) => {
    try {
        const eventId = req.params.event_id;
        if (!eventId) {
            return {
                success: false,
                message: 'Event ID is required.',
                code: 'VALIDATION_ERROR',
            };
        }

        const event = await Event.findOne({
            where: { id: eventId },
            attributes: ['id', 'name'],
        });

        if (!event) {
            return {
                success: false,
                message: 'Event not found.',
                code: 'NOT_FOUND',
            };
        }

        return {
            success: true,
            message: 'Event fetched successfully.',
            data: event,
        };
    } catch (error) {
        console.error('Error fetching event by id:', error);
        return {
            success: false,
            message: 'An unexpected error occurred while fetching event.',
            code: 'INTERNAL_SERVER_ERROR',
        };
    }
};



// search staff list with eventId service
module.exports.searchEventStaff = async (req) => {
    try {
        const { event_id, first_name, email } = req.query;
        if (!event_id) {
            return {
                success: false,
                message: "Event ID is required.",
                code: "VALIDATION_ERROR",
            };
        }

        const whereCondition = {
            [Op.and]: [
                Sequelize.where(
                    Sequelize.fn("FIND_IN_SET", event_id, Sequelize.col("eventId")),
                    { [Op.gt]: 0 }
                ),
            ],
        };

        // 🔍 First name search
        if (first_name) {
            whereCondition[Op.and].push({
                first_name: { [Op.like]: `%${first_name}%` },
            });
        }

        // 🔍 Email search
        if (email) {
            whereCondition[Op.and].push({
                email: { [Op.like]: `%${email}%` },
            });
        }

        const staff = await User.findAll({
            where: whereCondition,
            attributes: ["id", "email", "first_name", "last_name", "mobile"],
            order: [["id", "DESC"]],
        });

        return {
            success: true,
            message: "Event staff fetched successfully.",
            data: staff,
        };
    } catch (error) {
        console.error("Error fetching event staff:", error);
        return {
            success: false,
            message: "An unexpected error occurred while fetching event staff.",
            code: "INTERNAL_SERVER_ERROR",
        };
    }
};



