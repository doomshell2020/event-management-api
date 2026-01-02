const { Op, Sequelize } = require('sequelize');
const { User, Event, Orders, Currency, OrderItems } = require('../../../../models');


// Get event List..
module.exports.getOrdersList = async (req, res) => {
    try {
        const adminId = req.user?.id;
        if (!adminId) {
            return {
                success: false,
                message: 'Unauthorized access. Admin authentication required.',
                code: 'UNAUTHORIZED'
            };
        }
        const orders = await Orders.findAll({
            include: [{ model: User, attributes: ['id', 'email', 'first_name', 'last_name', 'mobile'], as: "user" },
            {
                model: Event, attributes: ['name'], as: "event", include: {
                    model: Currency, as: "currencyName", attributes: ['Currency_symbol']
                }
            },
            { model: OrderItems, as: "orderItems", attributes: ['order_id', 'ticket_id', 'count'] }

            ],
            attributes: [
                'id',
                'RRN',
                'order_uid',
                'user_id',
                'event_id',
                'sub_total',
                'tax_total',
                'created'
            ],

            order: [['id', 'DESC']]
        });
        return {
            success: true,
            message: 'Orders fetched successfully.',
            data: orders
        };
    } catch (error) {
        console.error('Error fetching orders:', error);
        return {
            success: false,
            message: 'An unexpected error occurred while fetching event.',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};

// search order details..service
module.exports.searchOrdersList = async (req) => {
    try {
        const { customer, event, orderFrom, orderTo } = req.query;
        const whereCondition = {};
        const eventWhere = {};
        /* ============================
           📅 ORDER DATE FILTER (created)
        ============================ */
        const from = orderFrom
            ? new Date(new Date(orderFrom).setHours(0, 0, 0, 0))
            : null;

        const to = orderTo
            ? new Date(new Date(orderTo).setHours(23, 59, 59, 999))
            : null;

        if (from && to) {
            whereCondition.created = {
                [Op.between]: [from, to]
            };
        } else if (from) {
            whereCondition.created = {
                [Op.gte]: from
            };
        } else if (to) {
            whereCondition.created = {
                [Op.lte]: to
            };
        }
        /* ============================
           🎟 EVENT SEARCH
        ============================ */
        if (event) {
            eventWhere.name = {
                [Op.like]: `%${event}%`
            };
        }

        /* ============================
           🔎 FETCH ORDERS
        ============================ */
        const orders = await Orders.findAll({
            where: whereCondition,
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: ['id', 'email', 'first_name', 'last_name', 'mobile'],
                    // where: Object.keys(userWhere).length ? userWhere : undefined,
                       where: customer
                        ? {
                            [Op.or]: [
                                { first_name: { [Op.like]: `%${customer}%` } },
                                { last_name: { [Op.like]: `%${customer}%` } }
                            ]
                        }
                        : undefined,
                    required: !!customer
                },
                {
                    model: Event,
                    as: "event",
                    attributes: ['id', 'name'],
                    where: Object.keys(eventWhere).length ? eventWhere : undefined,
                    required: !!event,
                    include: {
                        model: Currency,
                        as: "currencyName",
                        attributes: ['Currency_symbol']
                    }
                },
                {
                    model: OrderItems,
                    as: "orderItems",
                    attributes: ['order_id', 'ticket_id', 'count']
                }
            ],
            attributes: [
                'id',
                'RRN',
                'order_uid',
                'user_id',
                'event_id',
                'sub_total',
                'tax_total',
                'grand_total',
                'created'
            ],
            order: [['id', 'DESC']]
        });

        return {
            success: true,
            message: 'Orders fetched successfully.',
            data: orders
        };

    } catch (error) {
        console.error('Error searching orders:', error);
        return {
            success: false,
            message: 'An unexpected error occurred while searching orders.',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};


