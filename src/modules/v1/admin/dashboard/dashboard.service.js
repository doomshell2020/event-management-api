const { Op, Sequelize } = require('sequelize');
const { User, Event, TicketType, Orders, Currency, OrderItems, AddonTypes, WellnessSlots, Wellness } = require('../../../../models');




// Get event List..
module.exports.getLatestEvents = async (req, res) => {
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
            subQuery: false,
            order: [['id', 'DESC']],
            limit: 5,

            include: [
                {
                    model: User,
                    as: "Organizer",
                    attributes: ['id', 'email', 'first_name', 'last_name']
                },
                {
                    model: TicketType,
                    as: "tickets",
                    attributes: ['id', 'title', 'type'],
                    separate: true   // ⭐ VERY IMPORTANT
                },
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

                [Sequelize.fn('COALESCE',
                    Sequelize.fn('SUM', Sequelize.col('orders.sub_total')), 0), 'total_sales'],

                [Sequelize.fn('COALESCE',
                    Sequelize.fn('SUM', Sequelize.col('orders.tax_total')), 0), 'total_tax'],

                [Sequelize.fn('COALESCE',
                    Sequelize.fn('SUM', Sequelize.col('orders.grand_total')), 0), 'grand_total']
            ],

            group: ['Event.id', 'Organizer.id', 'currencyName.id']
        });

        return {
            success: true,
            message: 'Latest Events fetched successfully.',
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



// Get Ticket List..
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
            limit:5,
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

// dashboard counts (customers,organizers,events,sales,earning)
module.exports.getDashboardCounts = async (req, res) => {
    try {
        const adminId = req.user?.id;
        if (!adminId) {
            return {
                success: false,
                message: 'Unauthorized access',
                code: 'UNAUTHORIZED'
            };
        }

        const [
            totalActiveCustomers,
            totalInActiveCustomers,
            totalActiveOrganizers,
            totalInActiveOrganizers,
            totalActiveEvents,
            totalInActiveEvents,
            totalSales,
            totalEarnings
        ] = await Promise.all([

            // 🧑 Customers
            User.count({ where: { role_id: 3, status: 'Y' } }),
            User.count({ where: { role_id: 3, status: 'N' } }),

            // 🎤 Organizers
            User.count({ where: { role_id: 2, status: 'Y' } }),
            User.count({ where: { role_id: 2, status: 'N' } }),

            // 🎉 Events
            Event.count({ where: { status: 'Y' } }),
            Event.count({ where: { status: 'N' } }),

            // 🛒 Total Sales (Orders Count)
            Orders.sum('grand_total'),
            // Orders.count(),

            // 💰 Total Earnings (Sum of Grand Total)
            Orders.sum('tax_total')
        ]);

        return {
            success: true,
            message: 'Dashboard data fetched successfully',
            data: {
                customers: {
                    active: totalActiveCustomers,
                    inactive: totalInActiveCustomers
                },
                organizers: {
                    active: totalActiveOrganizers,
                    inactive: totalInActiveOrganizers
                },
                events: {
                    active: totalActiveEvents,
                    inactive: totalInActiveEvents
                },
                total_sales: totalSales,
                total_earning: totalEarnings || 0
            }
        };

    } catch (error) {
        console.error('Dashboard Error:', error);
        return {
            success: false,
            message: 'Dashboard fetch failed',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};


// payment chart data....
module.exports.getPaymentChartData = async (req, res) => {
    try {
        // const adminId = req.user?.id;
        // if (!adminId) {
        //     return {
        //         success: false,
        //         message: 'Unauthorized access',
        //         code: 'UNAUTHORIZED'
        //     };
        // }

        const result = await Orders.findAll({
            attributes: [
                [Sequelize.fn('MONTH', Sequelize.col('createdAt')), 'month'],
                [Sequelize.fn('SUM', Sequelize.col('grand_total')), 'total_amount']
            ],
            where: Sequelize.where(
                Sequelize.fn('YEAR', Sequelize.col('createdAt')),
                new Date().getFullYear()
            ),
            group: [Sequelize.fn('MONTH', Sequelize.col('createdAt'))],
            order: [[Sequelize.fn('MONTH', Sequelize.col('createdAt')), 'ASC']]
        });

        // Initialize all months with 0
        const monthlyData = Array(12).fill(0);

        result.forEach(item => {
            const monthIndex = item.dataValues.month - 1;
            monthlyData[monthIndex] = Number(item.dataValues.total_amount || 0);
        });

        return {
            success: true,
            message: 'Payment chart data fetched successfully',
            data: {
                months: [
                    "Jan","Feb","March","April","May","June",
                    "July","Aug","Sep","Oct","Nov","Dec"
                ],
                view_price: monthlyData,
                purchased_price: monthlyData // agar future me logic alag ho
            }
        };

    } catch (error) {
        console.error('Payment Chart Error:', error);
        return {
            success: false,
            message: 'Payment chart fetch failed',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};


// payment pie chart.....
module.exports.getPaymentPieChart = async (req, res) => {
    try {
        const result = await Orders.findAll({
            attributes: [
                'paymenttype',
                [Sequelize.fn('SUM', Sequelize.col('grand_total')), 'total']
            ],
            group: ['paymenttype'] // ✅ FIXED
        });

        // Default values
        const pieData = {
            Earnings: 0,
            EventOffice: 0,
            Cash: 0,
            Online: 0
        };

        result.forEach(item => {
            const method = item.paymenttype; // ✅ FIXED
            const total = Number(item.dataValues.total || 0);

            if (method === 'free') pieData.EventOffice = total;
            if (method === 'cash') pieData.Cash = total;
            if (method === 'stripe') pieData.Online = total;
        });

        // Earnings = sum of all payment types
        pieData.Earnings =
            pieData.EventOffice + pieData.Cash + pieData.Online;

        return {
            success: true,
            message: 'Payment pie chart data fetched successfully',
            data: {
                labels: Object.keys(pieData),
                series: Object.values(pieData)
            }
        };

    } catch (error) {
        console.error('Pie Chart Error:', error);
        return {
            success: false,
            message: 'Pie chart fetch failed',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};
