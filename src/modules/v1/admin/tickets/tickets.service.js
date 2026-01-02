const { Op, Sequelize } = require('sequelize');
const { User, Event, TicketType, Orders, Currency, OrderItems } = require('../../../../models');




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
                // { model: User, attributes: ['id', 'email', 'first_name', 'last_name'], as: "Organizer" },
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
                'order_id',
                'user_id',
                'event_id',
                'ticket_id',
                'addon_id',
                'appointment_id',
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

        const hasAnyFilter =
            customer || mobile || event || ticketNumber || purchaseFrom || purchaseTo;

        console.log("SEARCH PARAMS =>", {
            customer, mobile, event, ticketNumber, purchaseFrom, purchaseTo
        });

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



