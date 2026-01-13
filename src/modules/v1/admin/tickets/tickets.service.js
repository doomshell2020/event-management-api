const { Op, Sequelize } = require('sequelize');
const { User, Event, TicketType, Orders, Currency, OrderItems, AddonTypes, Package, WellnessSlots, Wellness,TicketPricing ,EventSlots} = require('../../../../models');




// Get event List..
module.exports.getTicketList = async (req, res) => {
    try {
        const adminId = req.user?.id;
        if (!adminId) {
            return {
                success: false,
                message: 'Unauthorized access. Admin authentication required.',
                code: 'UNAUTHORIZED'
            };
        }
        const tickets = await OrderItems.findAll({
            include: [
                { model: TicketType, as: "ticketType", attributes: ["title"] },
                { model: AddonTypes, as: "addonType", attributes: ["name"] },
                { model: Package, as: "package", attributes: ["name"] },
                {
                    model: WellnessSlots, as: "appointment", attributes: ["wellness_id"],
                    include: [{ model: Wellness, as: "wellnessList", attributes: ["name"] }]
                },
                 {
                    model: TicketPricing, as: 'ticketPricing', required: false, attributes: ["id", "price"],
                    include: [{ model: TicketType, as: "ticket", required: false, attributes: ["title"] },
                    { model: EventSlots, as: "slot", required: false, attributes: ["id", "slot_name"] }
                    ]
                },
                {
                    model: Orders,
                    as: "order",
                    attributes: ['sub_total', 'tax_total', 'created'],
                    include: [
                        { model: User, attributes: ['id', 'email', 'first_name', 'last_name', 'mobile'], as: "user" }, {
                            model: Event, attributes: ['name', 'date_from', 'date_to'], as: "event", include: {
                                model: Currency, as: "currencyName", attributes: ['Currency_symbol']
                            }
                        },]
                },
            ],
            attributes: [
                'id',
                "type",
                'order_id',
                'user_id',
                'event_id',
                'ticket_id',
                'addon_id',
                'appointment_id',
                'package_id',
                "ticket_pricing_id",
                'count'
            ],

            order: [['id', 'DESC']]
        });
        return {
            success: true,
            message: 'Tickets fetched successfully.',
            data: tickets
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


// search event details..service
module.exports.searchTicketList = async (req) => {
    try {
        let {
            customer,
            mobile,
            email,
            event,
            ticketNumber,
            purchaseFrom,
            purchaseTo
        } = req.query;

        const clean = (v) => (v && v.trim() !== "" ? v.trim() : null);

        customer = clean(customer);
        mobile = clean(mobile);
        event = clean(event);
        ticketNumber = clean(ticketNumber);
        email = clean(email);

        const hasAnyFilter =
            customer || mobile || event || ticketNumber || purchaseFrom || purchaseTo || email;

        /* ============================
           📅 PURCHASE DATE FILTER
        ============================ */
        const orderWhere = {};

        if (purchaseFrom || purchaseTo) {
            const from = purchaseFrom
                ? new Date(new Date(purchaseFrom).setHours(0, 0, 0, 0))
                : null;

            const to = purchaseTo
                ? new Date(new Date(purchaseTo).setHours(23, 59, 59, 999))
                : null;

            if (from && to) orderWhere.created = { [Op.between]: [from, to] };
            else if (from) orderWhere.created = { [Op.gte]: from };
            else if (to) orderWhere.created = { [Op.lte]: to };
        }

        /* ============================
           🎟 TICKET NUMBER FILTER
        ============================ */
        const ticketWhere = {};
        if (ticketNumber) {
            const ticketId = Number(ticketNumber);
            ticketWhere[Op.or] = [
                { ticket_id: ticketId },
                { addon_id: ticketId },
                { appointment_id: ticketId }
            ];
        }

        /* ============================
           👤 USER FILTER
        ============================ */
        const userWhere = {};

        if (customer) {
            userWhere.first_name = { [Op.like]: `%${customer}%` };
            // userWhere[Op.or] = [
            //     { first_name: { [Op.like]: `%${customer}%` } },
            // ];
        }

        if (mobile) {
            userWhere.mobile = { [Op.like]: `%${mobile}%` };
        }

        if (email) {
            userWhere.email = { [Op.like]: `%${email}%` };
        }

        /* ============================
           🎉 EVENT FILTER
        ============================ */
        const eventWhere = event
            ? { name: { [Op.like]: `%${event}%` } }
            : undefined;

        /* ============================
           🔎 FETCH TICKETS (FIXED)
        ============================ */
        const tickets = await OrderItems.findAll({
            where: ticketWhere,
            include: [
                { model: TicketType, as: "ticketType", attributes: ["title"] },
                { model: AddonTypes, as: "addonType", attributes: ["name"] },
                { model: Package, as: "package", attributes: ["name"] },
                {
                    model: WellnessSlots, as: "appointment", attributes: ["wellness_id"],
                    include: [{ model: Wellness, as: "wellnessList", attributes: ["name"] }]
                },
                {
                    model: TicketPricing, as: 'ticketPricing', required: false, attributes: ["id", "price"],
                    include: [{ model: TicketType, as: "ticket", required: false, attributes: ["title"] },
                    { model: EventSlots, as: "slot", required: false, attributes: ["id", "slot_name"] }
                    ]
                },
                {
                    model: Orders,
                    as: "order",
                    attributes: ['sub_total', 'tax_total', 'created'],
                    where: Object.keys(orderWhere).length ? orderWhere : undefined,
                    required: !!hasAnyFilter,
                    include: [
                        {
                            model: User,
                            as: "user",
                            attributes: ['id', 'email', 'first_name', 'last_name', 'mobile'],
                            where: Object.keys(userWhere).length ? userWhere : undefined,
                            required: Object.keys(userWhere).length > 0
                        },
                        {
                            model: Event,
                            as: "event",
                            attributes: ['name', 'date_from', 'date_to'],
                            where: eventWhere,
                            required: !!event,
                            include: {
                                model: Currency,
                                as: "currencyName",
                                attributes: ['Currency_symbol']
                            }
                        }
                    ]
                }
            ],
            order: [['id', 'DESC']]
        });

        return {
            success: true,
            message: "Tickets fetched successfully",
            data: tickets
        };

    } catch (error) {
        console.error("Search error:", error);
        return {
            success: false,
            message: "Search failed",
            code: "INTERNAL_SERVER_ERROR"
        };
    }
};



// services/ticket.service.js
module.exports.getTicketsWithEventIdAndType = async (req) => {
    try {
        const adminId = req.user?.id;
        const { event_id, type } = req.params;
        if (!adminId) {
            return {
                success: false,
                message: 'Unauthorized access.',
                code: 'UNAUTHORIZED',
            };
        }

        if (!event_id || !type) {
            return {
                success: false,
                message: 'Event ID and type are required.',
                code: 'VALIDATION_ERROR',
            };
        }

        // ✅ Allowed types (important)
        const ALLOWED_TYPES = ['ticket', 'addon', 'appointment', 'package'];

        if (!ALLOWED_TYPES.includes(type)) {
            return {
                success: false,
                message: 'Invalid type provided.',
                code: 'VALIDATION_ERROR',
            };
        }

        // ✅ Dynamic condition based on type
        const typeCondition = {
            ticket: { ticket_id: { [Op.ne]: null } },
            addon: { addon_id: { [Op.ne]: null } },
            appointment: { appointment_id: { [Op.ne]: null } },
            package: { package_id: { [Op.ne]: null } }, // ✅ FIX
        };

        const tickets = await OrderItems.findAll({
            where: {
                event_id,
                ...typeCondition[type],
            },
            attributes: [
                'id',
                "type",
                'order_id',
                'user_id',
                'event_id',
                'ticket_id',
                'addon_id',
                'appointment_id',
                "package_id",
                'count',
            ],
            include: [
                { model: TicketType, as: "ticketType", attributes: ["title"] },
                { model: AddonTypes, as: "addonType", attributes: ["name"] },
                { model: Package, as: "package", attributes: ["name"] },
                {
                    model: WellnessSlots, as: "appointment", attributes: ["wellness_id"],
                    include: [{ model: Wellness, as: "wellnessList", attributes: ["name"] }]
                },

                {
                    model: Orders,
                    as: 'order',
                    attributes: ['sub_total', 'tax_total', 'created'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: [
                            'id',
                            'email',
                            'first_name',
                            'last_name',
                            'mobile',
                        ],
                    },
                    {
                        model: Event,
                        as: 'event',
                        attributes: ['name', 'date_from', 'date_to'],
                        include: [
                            {
                                model: Currency,
                                as: 'currencyName',
                                attributes: ['Currency_symbol'],
                            },
                        ],
                    },
                    ],
                },
            ],
            order: [['id', 'DESC']],
        });

        return {
            success: true,
            message: 'Tickets fetched successfully.',
            data: tickets,
        };
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return {
            success: false,
            message: 'An unexpected error occurred while fetching tickets.',
            code: 'INTERNAL_SERVER_ERROR',
        };
    }
};


const ITEM_TYPE_COLUMN_MAP = {
    ticket: 'ticket_id',
    addon: 'addon_id',
    package: 'package_id',
    appointment: 'appointment_id',
};

module.exports.getOrderItemsByItem = async (req) => {
    try {

        const { event_id, item_id, item_type } = req.body;
        if (!event_id || !item_id || !item_type) {
            return {
                success: false,
                message: 'event_id, item_id and item_type are required',
                code: 'VALIDATION_ERROR',
            };
        }

        const column = ITEM_TYPE_COLUMN_MAP[item_type];

        if (!column) {
            return {
                success: false,
                message: 'Invalid item_type provided',
                code: 'VALIDATION_ERROR',
            };
        }

        const items = await OrderItems.findAll({
            where: {
                event_id,
                [column]: item_id,
            },
            attributes: [
                'id',
                "type",
                'order_id',
                'user_id',
                'event_id',
                'ticket_id',
                'addon_id',
                'package_id',
                'appointment_id',
                'count',
            ],
            include: [
                { model: TicketType, as: "ticketType", attributes: ["title"] },
                { model: AddonTypes, as: "addonType", attributes: ["name"] },
                { model: Package, as: "package", attributes: ["name"] },
                {
                    model: WellnessSlots, as: "appointment", attributes: ["wellness_id"],
                    include: [{ model: Wellness, as: "wellnessList", attributes: ["name"] }]
                },
                {
                    model: Orders,
                    as: "order",
                    attributes: ['sub_total', 'tax_total', 'created'],
                    include: [
                        { model: User, attributes: ['id', 'email', 'first_name', 'last_name', 'mobile'], as: "user" }, {
                            model: Event, attributes: ['name', 'date_from', 'date_to'], as: "event", include: {
                                model: Currency, as: "currencyName", attributes: ['Currency_symbol']
                            }
                        },]
                },
            ],
            order: [['id', 'DESC']],
        });

        return {
            success: true,
            message: 'Order items fetched successfully',
            data: items,
        };
    } catch (error) {
        console.error('Service error:', error);
        return {
            success: false,
            message: 'Error fetching order items',
            code: 'INTERNAL_SERVER_ERROR',
        };
    }
};


