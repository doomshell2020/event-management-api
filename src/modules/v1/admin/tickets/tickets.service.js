const { Op, Sequelize } = require('sequelize');
const { User, Event, TicketType, Orders, Currency, OrderItems, AddonTypes, Package, WellnessSlots, Wellness, TicketPricing, EventSlots } = require('../../../../models');




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
                    model: WellnessSlots, as: "appointment", attributes: ["wellness_id",'date','slot_start_time','slot_end_time'],
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
            purchaseTo,
            type
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
        /* ============================
     📅 PURCHASE DATE FILTER (OrderItems)
  ============================ */
        const orderItemWhere = {};

        const from = purchaseFrom
            ? new Date(`${purchaseFrom}T00:00:00`)
            : null;

        const to = purchaseTo
            ? new Date(`${purchaseTo}T23:59:59`)
            : null;
        if (from && to) {
            orderItemWhere.createdAt = { [Op.between]: [from, to] };
        } else if (from) {
            orderItemWhere.createdAt = { [Op.gte]: from };
        } else if (to) {
            orderItemWhere.createdAt = { [Op.lte]: to };
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
           🧩 TYPE FILTER (ORDER ITEMS)
        ============================ */
        const typeWhere = {};

        if (type) {
            if (type === "ticket") {
                typeWhere.type = {
                    [Op.in]: ["ticket", "ticket_price", "comps", "committesale"]
                };
            } else {
                // addon / appointment / package
                typeWhere.type = type;
            }
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
            where: {
                ...ticketWhere,
                ...orderItemWhere,   // ✅ DATE FILTER HERE
                ...typeWhere
            },
            // where: ticketWhere,
            //  ...orderItemWhere   // ✅ DATE FILTER HERE
            include: [
                { model: TicketType, as: "ticketType", attributes: ["title"] },
                { model: AddonTypes, as: "addonType", attributes: ["name"] },
                { model: Package, as: "package", attributes: ["name"] },
                {
                    model: WellnessSlots, as: "appointment", attributes: ["wellness_id",'date','slot_start_time','slot_end_time'],
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
                    // where: Object.keys(orderWhere).length ? orderWhere : undefined,
                    // required: !!hasAnyFilter,
                    // required: false,
                    required: !!event,
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
        console.log("event_id, type", event_id, type)

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

        // ✅ Allowed types
        const ALLOWED_TYPES = [
            'ticket',
            'addon',
            'appointment',
            'package',
            'committesale',
            'comps',
        ];

        if (!ALLOWED_TYPES.includes(type)) {
            return {
                success: false,
                message: 'Invalid type provided.',
                code: 'VALIDATION_ERROR',
            };
        }

        // ✅ STRICT type + id condition (BUG FIX)
        const typeCondition = {
            ticket: {
                type: {
                    [Op.in]: ['ticket', 'ticket_price', 'comps', 'committesale']
                },
                [Op.or]: [
                    { ticket_id: { [Op.ne]: null } },
                    { ticket_pricing_id: { [Op.ne]: null } }
                ]
            },
            // ticket: {
            //     type: 'ticket',
            //     ticket_id: { [Op.ne]: null },
            // },
            addon: {
                type: 'addon',
                addon_id: { [Op.ne]: null },
            },
            appointment: {
                type: 'appointment',
                appointment_id: { [Op.ne]: null },
            },
            package: {
                type: 'package',
                package_id: { [Op.ne]: null },
            },
            // committesale: {
            //     type: 'committesale',
            //     ticket_id: { [Op.ne]: null },
            // },
            // comps: {
            //     type: 'comps',
            //     ticket_id: { [Op.ne]: null },
            // },
        };

        const tickets = await OrderItems.findAll({
            where: {
                event_id,
                ...typeCondition[type], // 👈 key fix
            },
            attributes: [
                'id',
                'type',
                'order_id',
                'user_id',
                'event_id',
                'ticket_id',
                'addon_id',
                'appointment_id',
                'ticket_pricing_id',
                'package_id',
                'count',
            ],
            include: [
                {
                    model: TicketType,
                    as: "ticketType",
                    attributes: ["title"],
                },
                {
                    model: AddonTypes,
                    as: "addonType",
                    attributes: ["name"],
                },
                {
                    model: Package,
                    as: "package",
                    attributes: ["name"],
                },
                {
                    model: WellnessSlots,
                    as: "appointment",
                    attributes: ["wellness_id",'date','slot_start_time','slot_end_time'],
                    include: [
                        {
                            model: Wellness,
                            as: "wellnessList",
                            attributes: ["name"],
                        },
                    ],
                },
                {
                    model: Orders,
                    as: 'order',
                    attributes: ['sub_total', 'tax_total', 'created'],
                    include: [
                        {
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


// module.exports.getTicketsWithEventIdAndType = async (req) => {
//     try {
//         const adminId = req.user?.id;
//         const { event_id, type } = req.params;
//         if (!adminId) {
//             return {
//                 success: false,
//                 message: 'Unauthorized access.',
//                 code: 'UNAUTHORIZED',
//             };
//         }

//         if (!event_id || !type) {
//             return {
//                 success: false,
//                 message: 'Event ID and type are required.',
//                 code: 'VALIDATION_ERROR',
//             };
//         }

//         // ✅ Allowed types (important)
//         const ALLOWED_TYPES = ['ticket', 'addon', 'appointment', 'package','committesale'];

//         if (!ALLOWED_TYPES.includes(type)) {
//             return {
//                 success: false,
//                 message: 'Invalid type provided.',
//                 code: 'VALIDATION_ERROR',
//             };
//         }

//         // ✅ Dynamic condition based on type
//         const typeCondition = {
//             ticket: { ticket_id: { [Op.ne]: null } },
//             addon: { addon_id: { [Op.ne]: null } },
//             appointment: { appointment_id: { [Op.ne]: null } },
//             package: { package_id: { [Op.ne]: null } }, 
//         };

//         const tickets = await OrderItems.findAll({
//             where: {
//                 event_id,
//                 ...typeCondition[type],
//             },
//             attributes: [
//                 'id',
//                 "type",
//                 'order_id',
//                 'user_id',
//                 'event_id',
//                 'ticket_id',
//                 'addon_id',
//                 'appointment_id',
//                 "package_id",
//                 'count',
//             ],
//             include: [
//                 { model: TicketType, as: "ticketType", attributes: ["title"] },
//                 { model: AddonTypes, as: "addonType", attributes: ["name"] },
//                 { model: Package, as: "package", attributes: ["name"] },
//                 {
//                     model: WellnessSlots, as: "appointment", attributes: ["wellness_id"],
//                     include: [{ model: Wellness, as: "wellnessList", attributes: ["name"] }]
//                 },

//                 {
//                     model: Orders,
//                     as: 'order',
//                     attributes: ['sub_total', 'tax_total', 'created'],
//                     include: [{
//                         model: User,
//                         as: 'user',
//                         attributes: [
//                             'id',
//                             'email',
//                             'first_name',
//                             'last_name',
//                             'mobile',
//                         ],
//                     },
//                     {
//                         model: Event,
//                         as: 'event',
//                         attributes: ['name', 'date_from', 'date_to'],
//                         include: [
//                             {
//                                 model: Currency,
//                                 as: 'currencyName',
//                                 attributes: ['Currency_symbol'],
//                             },
//                         ],
//                     },
//                     ],
//                 },
//             ],
//             order: [['id', 'DESC']],
//         });

//         return {
//             success: true,
//             message: 'Tickets fetched successfully.',
//             data: tickets,
//         };
//     } catch (error) {
//         console.error('Error fetching tickets:', error);
//         return {
//             success: false,
//             message: 'An unexpected error occurred while fetching tickets.',
//             code: 'INTERNAL_SERVER_ERROR',
//         };
//     }
// };


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


