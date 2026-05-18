const financeService = require('./finance.service');
const apiResponse = require('../../../../common/utils/apiResponse');
const { fn, col, literal, Sequelize, Op } = require('sequelize');
const { User, Event, TicketType, Orders, Currency, OrderItems, PackageDetails, AddonTypes, Package, WellnessSlots, Wellness } = require('../../../../models');


// exports.getEventDetails = async (req, res) => {
//     try {
//         /* ============================
//            0. Get event_id from query
//         ============================ */
//         const { event_id } = req.query;

//         /* ============================
//            1. Fetch Events
//         ============================ */
//         const eventWhere = {};
//         if (event_id) eventWhere.id = event_id;

//         const events = await Event.findAll({
//             where: eventWhere,
//             attributes: ["id", "name", "date_from", "date_to"],
//             include: [
//                 {
//                     model: Currency,
//                     as: "currencyName",
//                     attributes: ["Currency_symbol"],
//                 },
//             ],
//             order: [["id", "DESC"]],
//         });

//         if (!events.length) {
//             return apiResponse.success(res, "No events found.", { events: [] });
//         }

//         const eventIds = events.map(e => e.id);

//         /* ============================
//            2. Orders Summary
//         ============================ */
//         const ordersSummary = await Orders.findAll({
//             attributes: [
//                 "event_id",
//                 [fn("COUNT", col("id")), "total_orders"],
//                 [fn("SUM", col("sub_total")), "sub_total_sum"],
//                 [fn("SUM", col("tax_total")), "tax_total_sum"],
//                 [fn("SUM", col("grand_total")), "grand_total_sum"],
//             ],
//             where: { event_id: eventIds },
//             group: ["event_id"],
//             raw: true,
//         });

//         /* ============================
//            3. OrderItems Type Wise Count
//         ============================ */
//         const orderItemsSummary = await OrderItems.findAll({
//             attributes: [
//                 "event_id",
//                 [
//                     fn(
//                         "SUM",
//                         literal(`CASE WHEN type IN ('ticket','ticket_price','comps','committesale') THEN 1 ELSE 0 END`)
//                     ),
//                     "ticket_count",
//                 ],
//                 [fn("SUM", literal(`CASE WHEN type='addon' THEN 1 ELSE 0 END`)), "addon_count"],
//                 [fn("SUM", literal(`CASE WHEN type='appointment' THEN 1 ELSE 0 END`)), "appointment_count"],
//                 [fn("SUM", literal(`CASE WHEN type='package' THEN 1 ELSE 0 END`)), "package_count"],
//             ],
//             where: { event_id: eventIds },
//             group: ["event_id"],
//             raw: true,
//         });

//         /* ============================
//            4. Cancelled Items Count
//         ============================ */
//         const cancelledItemsSummary = await OrderItems.findAll({
//             attributes: [
//                 "event_id",
//                 [
//                     fn(
//                         "SUM",
//                         literal(`CASE WHEN type IN ('ticket','ticket_price','comps','committesale') THEN 1 ELSE 0 END`)
//                     ),
//                     "cancel_ticket_count",
//                 ],
//                 [fn("SUM", literal(`CASE WHEN type='addon' THEN 1 ELSE 0 END`)), "cancel_addon_count"],
//                 [fn("SUM", literal(`CASE WHEN type='appointment' THEN 1 ELSE 0 END`)), "cancel_appointment_count"],
//                 [fn("SUM", literal(`CASE WHEN type='package' THEN 1 ELSE 0 END`)), "cancel_package_count"],
//                 [fn("SUM", literal(`CASE WHEN type='comps' THEN 1 ELSE 0 END`)), "cancel_comps_count"],
//                 [fn("SUM", literal(`CASE WHEN type='committesale' THEN 1 ELSE 0 END`)), "cancel_committesale_count"],
//             ],
//             where: {
//                 event_id: eventIds,
//                 cancel_status: "cancel",
//             },
//             group: ["event_id"],
//             raw: true,
//         });
//         const cancelledAmountSummary = await OrderItems.findAll({
//             attributes: [
//                 "event_id",

//                 // Base price
//                 [fn("SUM", col("OrderItems.price")), "cancel_sub_total"],

//                 // ✅ Tax = platform fee + payment gateway fee (applied on price + platform fee)
//                 [
//                     fn(
//                         "SUM",
//                         literal(`
//                     (
//                         (OrderItems.price * (order.platform_fee_percent / 100))
//                         +
//                         (
//                             (OrderItems.price + (OrderItems.price * (order.platform_fee_percent / 100)))
//                             * (order.payment_gateway_percent / 100)
//                         )
//                     )
//                 `)
//                     ),
//                     "cancel_tax_amount",
//                 ],

//                 // ✅ Grand total = price + total tax
//                 [
//                     fn(
//                         "SUM",
//                         literal(`
//                     OrderItems.price +
//                     (
//                         (OrderItems.price * (order.platform_fee_percent / 100))
//                         +
//                         (
//                             (OrderItems.price + (OrderItems.price * (order.platform_fee_percent / 100)))
//                             * (order.payment_gateway_percent / 100)
//                         )
//                     )
//                 `)
//                     ),
//                     "cancel_grand_total",
//                 ],
//             ],
//             include: [
//                 {
//                     model: Orders,
//                     as: "order",
//                     attributes: [],
//                 },
//             ],
//             where: {
//                 event_id: eventIds,
//                 cancel_status: "cancel",
//             },
//             group: ["event_id"],
//             raw: true,
//         });


//         /* ============================
//            6. STAFF COUNT
//         ============================ */
//         const staffRaw = await User.findAll({
//             attributes: ["id", "eventId"],
//             where: {
//                 [Op.or]: eventIds.map(eventId =>
//                     Sequelize.where(
//                         fn("FIND_IN_SET", eventId, col("eventId")),
//                         { [Op.gt]: 0 }
//                     )
//                 ),
//             },
//             raw: true,
//         });

//         const staffMap = {};
//         eventIds.forEach(id => (staffMap[id] = 0));

//         staffRaw.forEach(user => {
//             const userEvents = user.eventId.split(",").map(Number);
//             userEvents.forEach(eid => {
//                 if (staffMap[eid] !== undefined) staffMap[eid] += 1;
//             });
//         });

//         /* ============================
//            7. Create Maps
//         ============================ */
//         const ordersMap = {};
//         ordersSummary.forEach(o => (ordersMap[o.event_id] = o));

//         const itemsMap = {};
//         orderItemsSummary.forEach(i => (itemsMap[i.event_id] = i));

//         const cancelMap = {};
//         cancelledItemsSummary.forEach(c => (cancelMap[c.event_id] = c));

//         const cancelAmountMap = {};
//         cancelledAmountSummary.forEach(c => (cancelAmountMap[c.event_id] = c));

//         /* ============================
//            8. Final Response
//         ============================ */
//         const responseData = events.map(event => {
//             const orderData = ordersMap[event.id] || {};
//             const itemData = itemsMap[event.id] || {};
//             const cancelData = cancelMap[event.id] || {};
//             const cancelAmountData = cancelAmountMap[event.id] || {};

//             return {
//                 event_id: event.id,
//                 event_name: event.name,
//                 date_from: event.date_from,
//                 date_to: event.date_to,

//                 currency_symbol: event.currencyName?.Currency_symbol || "",

//                 total_orders: Number(orderData.total_orders || 0),
//                 sub_total_sum: Number(orderData.sub_total_sum || 0),
//                 tax_total_sum: Number(orderData.tax_total_sum || 0),
//                 grand_total_sum: Number(orderData.grand_total_sum || 0),

//                 ticket_count: Number(itemData.ticket_count || 0),
//                 addon_count: Number(itemData.addon_count || 0),
//                 appointment_count: Number(itemData.appointment_count || 0),
//                 package_count: Number(itemData.package_count || 0),

//                 cancel_ticket_count: Number(cancelData.cancel_ticket_count || 0),
//                 cancel_addon_count: Number(cancelData.cancel_addon_count || 0),
//                 cancel_appointment_count: Number(cancelData.cancel_appointment_count || 0),
//                 cancel_package_count: Number(cancelData.cancel_package_count || 0),
//                 cancel_comps_count: Number(cancelData.cancel_comps_count || 0),
//                 cancel_committesale_count: Number(cancelData.cancel_committesale_count || 0),

//                 // ✅ Accurate cancel amounts
//                 cancel_sub_total: Number(cancelAmountData.cancel_sub_total || 0),
//                 cancel_tax_amount: Number(cancelAmountData.cancel_tax_amount || 0),
//                 cancel_grand_total: Number(cancelAmountData.cancel_grand_total || 0),

//                 staff_count: Number(staffMap[event.id] || 0),
//             };
//         });

//         /* ============================
//            9. Send Response
//         ============================ */
//         return apiResponse.success(res, "Events fetched successfully.", {
//             events: responseData,
//         });
//     } catch (error) {
//         console.error("Error fetching event details:", error);
//         return apiResponse.error(res, "Internal Server Error");
//     }
// };


exports.getEventDetails = async (req, res) => {
    try {

        /* =====================================================
           1. EVENT ID
        ===================================================== */

        const { event_id } = req.query;

        const eventWhere = {};

        if (event_id) {
            eventWhere.id = event_id;
        }

        /* =====================================================
           2. EVENTS
        ===================================================== */

        const events = await Event.findAll({

            where: eventWhere,

            attributes: [
                "id",
                "name",
                "date_from",
                "date_to"
            ],

            include: [
                {
                    model: Currency,
                    as: "currencyName",
                    attributes: ["Currency_symbol"],
                }
            ],

            order: [["id", "DESC"]],

            raw: true,
            nest: true,
        });

        if (!events.length) {

            return apiResponse.success(
                res,
                "No events found.",
                { events: [] }
            );

        }

        const eventIds = events.map(e => e.id);

        /* =====================================================
           3. PACKAGE CONFIGURATION
        ===================================================== */

        const packages = await Package.findAll({

            where: {
                event_id: eventIds
            },

            include: [
                {
                    model: PackageDetails,
                    as: "details",
                    attributes: [
                        "ticket_type_id",
                        "addon_id",
                        "qty"
                    ]
                }
            ],

            attributes: [
                "id",
                "event_id"
            ]
        });

        const packageMap = {};

        packages.forEach((pkg) => {

            let ticket = 0;
            let addon = 0;

            pkg.details.forEach((d) => {

                if (d.ticket_type_id) {
                    ticket += Number(d.qty || 0);
                }

                if (d.addon_id) {
                    addon += Number(d.qty || 0);
                }

            });

            packageMap[pkg.id] = {
                event_id: pkg.event_id,
                ticket,
                addon
            };

        });

        /* =====================================================
           4. ITEM SUMMARY
        ===================================================== */

        const itemSummary = await OrderItems.findAll({

            attributes: [

                "event_id",

                /* ============================
                   DIRECT TICKETS
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE
                                WHEN type IN (
                                    'ticket',
                                    'ticket_price',
                                    'comps',
                                    'committesale'
                                )
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "ticket_count"
                ],

                /* ============================
                   DIRECT ADDONS
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE
                                WHEN type='addon'
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "addon_count"
                ],

                /* ============================
                   PACKAGE COUNT
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE
                                WHEN type='package'
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "package_count"
                ],

                /* ============================
                   APPOINTMENT COUNT
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE
                                WHEN type='appointment'
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "appointment_count"
                ],

                /* ============================
                   CANCEL COUNTS
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE
                                WHEN type IN (
                                    'ticket',
                                    'ticket_price',
                                    'comps',
                                    'committesale'
                                )
                                AND cancel_status='cancel'
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "cancel_ticket_count"
                ],

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE
                                WHEN type='addon'
                                AND cancel_status='cancel'
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "cancel_addon_count"
                ],

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE
                                WHEN type='appointment'
                                AND cancel_status='cancel'
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "cancel_appointment_count"
                ],

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE
                                WHEN type='package'
                                AND cancel_status='cancel'
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "cancel_package_count"
                ],

                /* ============================
                   FACE VALUE
                ============================ */
                [
                    fn(
                        "SUM",
                        literal(`
            IFNULL(price,0)
        `)
                    ),
                    "sub_total_sum"
                ],
            ],

            where: {
                event_id: eventIds
            },

            group: ["event_id"],

            raw: true,
        });

        /* =====================================================
           5. PACKAGE SALES
        ===================================================== */

        const packageSales = await OrderItems.findAll({

            where: {
                event_id: eventIds,
                type: "package"
            },

            attributes: [

                "event_id",
                "package_id",

                [
                    fn(
                        "SUM",
                        literal("IFNULL(count,1)")
                    ),
                    "sold"
                ]
            ],

            group: [
                "event_id",
                "package_id"
            ],

            raw: true,
        });

        /* =====================================================
           6. PACKAGE TICKET/ADDON CALCULATION
        ===================================================== */

        const packageSalesMap = {};

        packageSales.forEach((sale) => {

            const pkg = packageMap[sale.package_id];

            if (!pkg) return;

            if (!packageSalesMap[sale.event_id]) {

                packageSalesMap[sale.event_id] = {
                    tickets: 0,
                    addons: 0
                };

            }

            packageSalesMap[sale.event_id].tickets +=
                Number(sale.sold || 0) * pkg.ticket;

            packageSalesMap[sale.event_id].addons +=
                Number(sale.sold || 0) * pkg.addon;




        });

        /* =====================================================
           7. ORDER FINANCIAL SUMMARY
        ===================================================== */

        const orderSummary = await Orders.findAll({

            attributes: [

                "event_id",

                [
                    fn("COUNT", col("id")),
                    "total_orders"
                ],

                /* ============================
                   TAX
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
            IFNULL(tax_total,0)
        `)
                    ),
                    "tax_total_sum"
                ],

                /* ============================
                   DISCOUNT
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
            IFNULL(discount_amount,0)
        `)
                    ),
                    "discount_total_sum"
                ],

                /* ============================
                   GRAND TOTAL
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
            IFNULL(grand_total,0)
        `)
                    ),
                    "grand_total_sum"
                ],

                // [
                //     fn(
                //         "SUM",
                //         literal(`
                //             CASE
                //                 WHEN (
                //                     cancel_status IS NULL
                //                     OR cancel_status != 'cancel'
                //                 )
                //                 THEN IFNULL(grand_total,0)
                //                 ELSE 0
                //             END
                //         `)
                //     ),
                //     "grand_total_sum"
                // ],

                /* ============================
                   CANCEL GRAND TOTAL
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE
                                WHEN cancel_status='cancel'
                                THEN IFNULL(grand_total,0)
                                ELSE 0
                            END
                        `)
                    ),
                    "cancel_grand_total"
                ],
            ],

            where: {
                event_id: eventIds
            },

            group: ["event_id"],

            raw: true,
        });

        /* =====================================================
           8. STAFF COUNT
        ===================================================== */

        const staffRaw = await User.findAll({

            attributes: [
                "id",
                "eventId"
            ],

            where: {
                [Op.or]: eventIds.map((eventId) =>
                    Sequelize.where(
                        fn(
                            "FIND_IN_SET",
                            eventId,
                            col("eventId")
                        ),
                        { [Op.gt]: 0 }
                    )
                )
            },

            raw: true,
        });

        const staffMap = {};

        eventIds.forEach((id) => {
            staffMap[id] = 0;
        });

        staffRaw.forEach((user) => {

            const userEvents =
                user.eventId
                    ?.split(",")
                    ?.map(Number) || [];

            userEvents.forEach((eid) => {

                if (
                    staffMap[eid] !== undefined
                ) {
                    staffMap[eid] += 1;
                }

            });

        });

        /* =====================================================
           9. CREATE MAPS
        ===================================================== */

        const itemMap = {};

        itemSummary.forEach((item) => {

            itemMap[item.event_id] = item;

        });

        const orderMap = {};

        orderSummary.forEach((order) => {

            orderMap[order.event_id] = order;

        });

        /* =====================================================
           10. FINAL RESPONSE
        ===================================================== */

        const responseData = events.map((event) => {

            const itemData =
                itemMap[event.id] || {};

            const orderData =
                orderMap[event.id] || {};

            const packageData =
                packageSalesMap[event.id] || {};
            return {

                event_id: event.id,

                event_name: event.name,

                date_from: event.date_from,

                date_to: event.date_to,

                currency_symbol:
                    event.currencyName?.Currency_symbol || "",

                /* ============================
                   ORDERS
                ============================ */

                total_orders:
                    Number(orderData.total_orders || 0),

                /* ============================
                   SALES
                ============================ */

                sub_total_sum:
                    Number(itemData.sub_total_sum || 0),

                tax_total_sum:
                    Number(orderData.tax_total_sum || 0),

                discount_total_sum:
                    Number(orderData.discount_total_sum || 0),

                grand_total_sum:
                    Number(orderData.grand_total_sum || 0),

                cancel_grand_total:
                    Number(orderData.cancel_grand_total || 0),

                /* ============================
                   COUNTS
                ============================ */

                ticket_count:
                    Number(itemData.ticket_count || 0)
                    +
                    Number(packageData.tickets || 0),

                addon_count:
                    Number(itemData.addon_count || 0)
                    +
                    Number(packageData.addons || 0),

                package_count:
                    Number(itemData.package_count || 0),

                appointment_count:
                    Number(itemData.appointment_count || 0),

                /* ============================
                   CANCEL COUNTS
                ============================ */

                cancel_ticket_count:
                    Number(itemData.cancel_ticket_count || 0),

                cancel_addon_count:
                    Number(itemData.cancel_addon_count || 0),

                cancel_appointment_count:
                    Number(itemData.cancel_appointment_count || 0),

                cancel_package_count:
                    Number(itemData.cancel_package_count || 0),

                /* ============================
                   STAFF
                ============================ */

                staff_count:
                    Number(staffMap[event.id] || 0),
            };

        });

        /* =====================================================
           11. RESPONSE
        ===================================================== */

        return apiResponse.success(
            res,
            "Events fetched successfully.",
            {
                events: responseData,
            }
        );

    } catch (error) {

        console.error(
            "Error fetching event details:",
            error
        );

        return apiResponse.error(
            res,
            "Internal Server Error"
        );
    }
};






exports.eventSalesMonthlyReport = async (req, res) => {
    try {

        /* =====================================================
           1. EVENT ID
        ===================================================== */
        const { eventId } = req.params;

        /* =====================================================
           2. EVENT DETAILS
        ===================================================== */
        const event = await Event.findOne({
            where: { id: eventId },
            attributes: ["id", "name"],
            include: [
                {
                    model: Currency,
                    as: "currencyName",
                    attributes: ["Currency_symbol"],
                }
            ]
        });

        if (!event) {
            return apiResponse.success(
                res,
                "Event not found",
                { data: {} }
            );
        }

        /* =====================================================
           3. PACKAGE CONFIGURATION MAP
        ===================================================== */

        const packages = await Package.findAll({

            where: {
                event_id: eventId
            },

            include: [
                {
                    model: PackageDetails,
                    as: "details",
                    attributes: [
                        "ticket_type_id",
                        "addon_id",
                        "qty"
                    ]
                }
            ],

            attributes: ["id"]
        });

        const packageMap = Object.fromEntries(

            packages.map((pkg) => {

                let ticket = 0;
                let addon = 0;

                pkg.details.forEach((d) => {

                    if (d.ticket_type_id) {
                        ticket += Number(d.qty || 0);
                    }

                    if (d.addon_id) {
                        addon += Number(d.qty || 0);
                    }

                });

                return [
                    pkg.id,
                    {
                        ticket,
                        addon
                    }
                ];

            })
        );

        /* =====================================================
           4. ITEM SUMMARY
        ===================================================== */

        const itemSummary = await OrderItems.findAll({

            attributes: [

                [
                    fn(
                        "DATE_FORMAT",
                        col("createdAt"),
                        "%m/%Y"
                    ),
                    "month"
                ],

                /* ============================
                   DIRECT SOLD COUNTS
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE 
                                WHEN type='ticket'
                                AND (cancel_status IS NULL OR cancel_status!='cancel')
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "tickets"
                ],

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE 
                                WHEN type='addon'
                                AND (cancel_status IS NULL OR cancel_status!='cancel')
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "addons"
                ],

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE 
                                WHEN type='package'
                                AND (cancel_status IS NULL OR cancel_status!='cancel')
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "packages"
                ],

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE 
                                WHEN type='appointment'
                                AND (cancel_status IS NULL OR cancel_status!='cancel')
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "appointments"
                ],

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE 
                                WHEN type='committesale'
                                AND (cancel_status IS NULL OR cancel_status!='cancel')
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "committees"
                ],

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE 
                                WHEN type='comps'
                                AND (cancel_status IS NULL OR cancel_status!='cancel')
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "comps"
                ],

                /* ============================
                   CANCEL COUNTS
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE 
                                WHEN type='ticket'
                                AND cancel_status='cancel'
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "cancel_tickets"
                ],

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE 
                                WHEN type='addon'
                                AND cancel_status='cancel'
                                THEN IFNULL(count,1)
                                ELSE 0
                            END
                        `)
                    ),
                    "cancel_addons"
                ],

                /* ============================
                   FACE VALUE
                ============================ */
                [
                    fn(
                        "SUM",
                        literal(`
            IFNULL(price,0)
        `)
                    ),
                    "face_value"
                ],
            ],

            where: {
                event_id: eventId
            },

            group: [
                literal("month")
            ],

            order: [
                [literal("month"), "ASC"]
            ],

            raw: true,
        });

        /* =====================================================
           5. PACKAGE SALES MONTHLY
        ===================================================== */

        const packageSales = await OrderItems.findAll({

            where: {
                event_id: eventId,
                type: "package",
                cancel_status: null
            },

            attributes: [

                [
                    fn(
                        "DATE_FORMAT",
                        col("createdAt"),
                        "%m/%Y"
                    ),
                    "month"
                ],

                "package_id",

                [
                    fn(
                        "SUM",
                        col("count")
                    ),
                    "sold"
                ]
            ],

            group: [
                literal("month"),
                "package_id"
            ],

            raw: true,
        });

        /* =====================================================
           6. PACKAGE MONTHLY CALCULATION
        ===================================================== */

        const packageMonthlyData = {};

        packageSales.forEach((sale) => {

            const pkg = packageMap[sale.package_id];

            if (!pkg) return;

            if (!packageMonthlyData[sale.month]) {

                packageMonthlyData[sale.month] = {
                    tickets: 0,
                    addons: 0
                };

            }

            packageMonthlyData[sale.month].tickets +=
                Number(sale.sold || 0) * pkg.ticket;

            packageMonthlyData[sale.month].addons +=
                Number(sale.sold || 0) * pkg.addon;

        });

        /* =====================================================
           7. FINANCIAL SUMMARY (ORDER BASED)
        ===================================================== */

        const financialSummary = await Orders.findAll({

            attributes: [

                [
                    fn(
                        "DATE_FORMAT",
                        col("createdAt"),
                        "%m/%Y"
                    ),
                    "month"
                ],

                /* ============================
                   TAX
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
            IFNULL(tax_total,0)
        `)
                    ),
                    "tax"
                ],
                /* ============================
                   DISCOUNT
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE
                                WHEN cancel_status IS NULL
                                OR cancel_status!='cancel'
                                THEN IFNULL(discount_amount,0)
                                ELSE 0
                            END
                        `)
                    ),
                    "discount_amount"
                ],

                /* ============================
                   GROSS AMOUNT
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
            IFNULL(grand_total,0)
        `)
                    ),
                    "gross_amount"
                ],

                /* ============================
                   NET RECEIVED
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE
                                WHEN cancel_status IS NULL
                                OR cancel_status!='cancel'
                                THEN IFNULL(grand_total,0)
                                ELSE 0
                            END
                        `)
                    ),
                    "net_received"
                ],

                /* ============================
                   CANCEL AMOUNT
                ============================ */

                [
                    fn(
                        "SUM",
                        literal(`
                            CASE
                                WHEN cancel_status='cancel'
                                THEN IFNULL(grand_total,0)
                                ELSE 0
                            END
                        `)
                    ),
                    "cancel_amount"
                ],
            ],

            where: {
                event_id: eventId
            },

            group: [
                literal("month")
            ],

            order: [
                [literal("month"), "ASC"]
            ],

            raw: true,
        });

        /* =====================================================
           8. MERGE ALL DATA
        ===================================================== */

        const mergedData = {};

        /* ============================
           ITEM DATA
        ============================ */

        itemSummary.forEach((item) => {

            mergedData[item.month] = {

                month: item.month,

                tickets:
                    Number(item.tickets || 0)
                    +
                    Number(
                        packageMonthlyData[item.month]?.tickets || 0
                    ),

                addons:
                    Number(item.addons || 0)
                    +
                    Number(
                        packageMonthlyData[item.month]?.addons || 0
                    ),

                packages:
                    Number(item.packages || 0),

                appointments:
                    Number(item.appointments || 0),

                committees:
                    Number(item.committees || 0),

                comps:
                    Number(item.comps || 0),

                cancel_tickets:
                    Number(item.cancel_tickets || 0),

                cancel_addons:
                    Number(item.cancel_addons || 0),

                face_value:
                    Number(item.face_value || 0),

                tax: 0,
                discount_amount: 0,
                gross_amount: 0,
                net_received: 0,
                cancel_amount: 0,
            };

        });

        /* ============================
           FINANCIAL DATA
        ============================ */

        financialSummary.forEach((finance) => {

            if (!mergedData[finance.month]) {

                mergedData[finance.month] = {
                    month: finance.month
                };

            }

            mergedData[finance.month].tax =
                Number(finance.tax || 0);

            mergedData[finance.month].discount_amount =
                Number(finance.discount_amount || 0);

            mergedData[finance.month].gross_amount =
                Number(finance.gross_amount || 0);

            mergedData[finance.month].net_received =
                Number(finance.net_received || 0);

            mergedData[finance.month].cancel_amount =
                Number(finance.cancel_amount || 0);

        });

        /* =====================================================
           9. FINAL MONTHS ARRAY
        ===================================================== */

        const months = Object.values(mergedData);

        /* =====================================================
           10. TOTALS
        ===================================================== */

        const totals = {

            tickets: 0,
            addons: 0,
            packages: 0,
            appointments: 0,
            committees: 0,
            comps: 0,

            cancel_tickets: 0,
            cancel_addons: 0,

            face_value: 0,

            tax: 0,
            discount_amount: 0,
            gross_amount: 0,
            net_received: 0,

            cancel_amount: 0,
        };

        months.forEach((m) => {

            Object.keys(totals).forEach((key) => {

                totals[key] += Number(m[key] || 0);

            });

        });

        /* =====================================================
           11. FINAL NET AMOUNT
        ===================================================== */

        const net_amount_received =
            totals.gross_amount - totals.cancel_amount;

        /* =====================================================
           12. RESPONSE
        ===================================================== */

        return apiResponse.success(
            res,
            "Monthly sales report fetched",
            {
                event: {
                    id: event.id,
                    name: event.name,
                    currency_symbol:
                        event.currencyName?.Currency_symbol || "",
                },

                months,

                gross_total: totals,

                net_amount_received,
            }
        );

    } catch (error) {

        console.error(
            "Monthly Sales Error:",
            error
        );

        return apiResponse.error(
            res,
            "Internal Server Error"
        );
    }
};


// sales by ticket 
exports.getEventSalesTypes = async (req, res) => {
    try {

        const { event_id } = req.params;

        if (!event_id) {

            return apiResponse.error(
                res,
                "Event ID is required"
            );
        }

        /* =====================================================
           1. EVENT INFO
        ===================================================== */

        const event = await Event.findOne({

            where: { id: event_id },

            attributes: ["id", "name"],

            include: [
                {
                    model: Currency,
                    as: "currencyName",
                    attributes: ["Currency_symbol"],
                }
            ],
        });

        if (!event) {

            return apiResponse.success(
                res,
                "No event found.",
                {
                    event: null,
                    ticketInfo: {
                        tickets: [],
                        packages: [],
                        addons: [],
                        appointments: [],
                        summary: {},
                    }
                }
            );
        }

        /* =====================================================
           2. PACKAGE MAP
        ===================================================== */

        const allPackages = await Package.findAll({

            where: { event_id },

            include: [
                {
                    model: PackageDetails,
                    as: "details",
                    attributes: [
                        "ticket_type_id",
                        "addon_id",
                        "qty"
                    ]
                }
            ],

            attributes: ["id"]
        });

        const packageMap = Object.fromEntries(

            allPackages.map((pkg) => {

                let ticket = 0;
                let addon = 0;

                pkg.details.forEach((d) => {

                    if (d.ticket_type_id) {
                        ticket += Number(d.qty || 0);
                    }

                    if (d.addon_id) {
                        addon += Number(d.qty || 0);
                    }

                });

                return [
                    pkg.id,
                    {
                        ticket,
                        addon
                    }
                ];
            })
        );

        /* =====================================================
           3. TICKETS
        ===================================================== */

        const ticketsRaw = await OrderItems.findAll({

            attributes: [
                "type",
                "ticket_id",

                [
                    fn(
                        "COUNT",
                        col("OrderItems.id")
                    ),
                    "sold"
                ],

                [
                    fn(
                        "SUM",
                        col("OrderItems.price")
                    ),
                    "face_value"
                ],
            ],

            where: {
                event_id,
                type: {
                    [Op.in]: [
                        "ticket",
                        "committesale",
                        "comps"
                    ]
                },
            },

            include: [
                {
                    model: TicketType,
                    as: "ticketType",

                    attributes: [
                        "id",
                        "title",
                        "price",
                        "count"
                    ],
                }
            ],

            group: [
                "OrderItems.ticket_id",
                "OrderItems.type",
                "ticketType.id",
            ],

            raw: true,
        });

        const tickets = ticketsRaw.map((t) => ({

            id: t["ticketType.id"],

            name: t["ticketType.title"],

            type: t.type,

            unit_price: Number(
                t["ticketType.price"] || 0
            ),

            sold: Number(t.sold || 0),

            count: Number(
                t["ticketType.count"] || 0
            ),

            face_value: Number(
                t.face_value || 0
            ),
        }));

        /* =====================================================
           4. PACKAGES
        ===================================================== */

        const packagesRaw = await OrderItems.findAll({

            attributes: [
                "package_id",

                [
                    fn(
                        "COUNT",
                        col("OrderItems.id")
                    ),
                    "sold"
                ],

                [
                    fn(
                        "SUM",
                        col("OrderItems.price")
                    ),
                    "face_value"
                ],
            ],

            where: {
                event_id,
                type: "package"
            },

            include: [
                {
                    model: Package,
                    as: "package",

                    attributes: [
                        "id",
                        "name",
                        "grandtotal",
                        "total_package",
                    ],
                }
            ],

            group: [
                "package_id",
                "package.id"
            ],

            raw: true,
        });

        const packages = packagesRaw.map((p) => ({

            id: p["package.id"],

            name: p["package.name"],

            unit_price: Number(
                p["package.grandtotal"] || 0
            ),

            sold: Number(p.sold || 0),

            count: Number(
                p["package.total_package"] || 0
            ),

            face_value: Number(
                p.face_value || 0
            ),
        }));

        /* =====================================================
           5. ADDONS
        ===================================================== */

        const addonsRaw = await OrderItems.findAll({

            attributes: [
                "addon_id",

                [
                    fn(
                        "COUNT",
                        col("OrderItems.id")
                    ),
                    "sold"
                ],

                [
                    fn(
                        "SUM",
                        col("OrderItems.price")
                    ),
                    "face_value"
                ],
            ],

            where: {
                event_id,
                type: "addon"
            },

            include: [
                {
                    model: AddonTypes,
                    as: "addonType",

                    attributes: [
                        "id",
                        "name",
                        "price",
                        "count"
                    ],
                }
            ],

            group: [
                "addon_id",
                "addonType.id"
            ],

            raw: true,
        });

        const addons = addonsRaw.map((a) => ({

            id: a["addonType.id"],

            name: a["addonType.name"],

            unit_price: Number(
                a["addonType.price"] || 0
            ),

            sold: Number(a.sold || 0),

            count: Number(
                a["addonType.count"] || 0
            ),

            face_value: Number(
                a.face_value || 0
            ),
        }));

        /* =====================================================
           6. APPOINTMENTS
        ===================================================== */

        const appointmentsRaw = await OrderItems.findAll({

            attributes: [
                "appointment_id",

                [
                    fn(
                        "COUNT",
                        col("OrderItems.id")
                    ),
                    "sold"
                ],

                [
                    fn(
                        "SUM",
                        col("OrderItems.price")
                    ),
                    "face_value"
                ],
            ],

            where: {
                event_id,
                type: "appointment"
            },

            include: [
                {
                    model: WellnessSlots,
                    as: "appointment",

                    attributes: [
                        "id",
                        "price",
                        "count"
                    ],

                    include: {
                        model: Wellness,
                        as: "wellnessList",
                        attributes: ["name"],
                    }
                }
            ],

            group: [
                "appointment_id",
                "appointment.id"
            ],

            raw: true,
        });

        const appointments = appointmentsRaw.map((a) => ({

            id: a["appointment.id"],

            name:
                a["appointment.wellnessList.name"],

            unit_price: Number(
                a["appointment.price"] || 0
            ),

            sold: Number(a.sold || 0),

            count: Number(
                a["appointment.count"] || 0
            ),

            face_value: Number(
                a.face_value || 0
            ),
        }));

        /* =====================================================
           7. PACKAGE ASSIGNED COUNTS
        ===================================================== */

        let packageAssignedTicketCount = 0;

        let packageAssignedAddonCount = 0;

        packagesRaw.forEach((pkg) => {

            const qty =
                Number(pkg.sold || 0);

            const packageId =
                pkg.package_id;

            const map =
                packageMap[packageId];

            if (map) {

                packageAssignedTicketCount +=
                    qty * map.ticket;

                packageAssignedAddonCount +=
                    qty * map.addon;
            }
        });

        /* =====================================================
           8. TOTAL ORDERS
        ===================================================== */

        const totalOrdersCount =
            await Orders.count({
                where: { event_id },
            });

        /* =====================================================
           9. TOTAL HELPERS
        ===================================================== */

        const calcTotals = (arr) => ({

            total_sold:
                arr.reduce(
                    (s, i) => s + i.sold,
                    0
                ),

            total_face_value:
                arr.reduce(
                    (s, i) => s + i.face_value,
                    0
                ),
        });

        /* =====================================================
           10. PRICE SUMMARY
        ===================================================== */

        const priceInfo = await Orders.findOne({

            attributes: [

                [
                    fn(
                        "SUM",
                        col("sub_total")
                    ),
                    "total_amount"
                ],

                [
                    fn(
                        "SUM",
                        col("tax_total")
                    ),
                    "total_taxes"
                ],

                [
                    fn(
                        "SUM",
                        col("grand_total")
                    ),
                    "gross_total"
                ],
            ],

            where: { event_id },

            raw: true,
        });

        /* =====================================================
           11. CANCEL INFO
        ===================================================== */

        const cancelAmount =
            await OrderItems.findOne({

                attributes: [
                    [
                        fn(
                            "SUM",
                            col("price")
                        ),
                        "cancel_amount"
                    ]
                ],

                where: {
                    event_id,
                    cancel_status: "cancel"
                },

                raw: true,
            });

        const cancelAmountValue =
            Number(
                cancelAmount?.cancel_amount || 0
            );

        const cancelTax =
            +(
                cancelAmountValue * 0.08
            ).toFixed(2);

        /* =====================================================
           12. FINAL COUNTS
        ===================================================== */

        const calcTotalCount = (arr) =>
            arr.reduce(
                (sum, item) =>
                    sum + Number(item.count || 0),
                0
            );

        const ticketsCountTotal =
            calcTotalCount(tickets)
        // + packageAssignedTicketCount;

        const packagesCountTotal =
            calcTotalCount(packages);

        const addonsCountTotal =
            calcTotalCount(addons)
        // + packageAssignedAddonCount;

        const appointmentsCountTotal =
            calcTotalCount(appointments);

        const grandTotalCount =
            ticketsCountTotal +
            packagesCountTotal +
            addonsCountTotal +
            appointmentsCountTotal;

        /* =====================================================
           13. SUMMARY TOTALS
        ===================================================== */

        const ticketSummary = calcTotals(tickets);

        const packageSummary = calcTotals(packages);

        const addonSummary = calcTotals(addons);

        const appointmentSummary = calcTotals(appointments);

        /* =====================================================
           14. PACKAGE FACE VALUE CALCULATION
        ===================================================== */

        let packageAssignedTicketFaceValue = 0;

        let packageAssignedAddonFaceValue = 0;

        packagesRaw.forEach((pkg) => {

            const qty =
                Number(pkg.sold || 0);

            const packageId =
                pkg.package_id;

            const packageDetails =
                allPackages.find(
                    p => p.id == packageId
                );

            if (!packageDetails?.details) {
                return;
            }

            packageDetails.details.forEach((d) => {

                /* =========================================
                   TICKET FACE VALUE
                ========================================= */

                if (d.ticket_type_id) {

                    const ticketObj =
                        tickets.find(
                            t => t.id == d.ticket_type_id
                        );

                    const ticketPrice =
                        Number(ticketObj?.unit_price || 0);

                    packageAssignedTicketFaceValue +=
                        qty *
                        Number(d.qty || 0) *
                        ticketPrice;
                }

                /* =========================================
                   ADDON FACE VALUE
                ========================================= */

                if (d.addon_id) {

                    const addonObj =
                        addons.find(
                            a => a.id == d.addon_id
                        );

                    const addonPrice =
                        Number(addonObj?.unit_price || 0);

                    packageAssignedAddonFaceValue +=
                        qty *
                        Number(d.qty || 0) *
                        addonPrice;
                }
            });
        });

        /* =====================================================
           15. FINAL SUMMARY
        ===================================================== */

        const finalSummary = {

            tickets: {

                total_sold:
                    ticketSummary.total_sold +
                    packageAssignedTicketCount,

                total_face_value:
                    ticketSummary.total_face_value +
                    packageAssignedTicketFaceValue,
            },

            packages: {

                total_sold:
                    packageSummary.total_sold,

                total_face_value:
                    packageSummary.total_face_value,
            },

            addons: {

                total_sold:
                    addonSummary.total_sold +
                    packageAssignedAddonCount,

                total_face_value:
                    addonSummary.total_face_value +
                    packageAssignedAddonFaceValue,
            },

            appointments: {

                total_sold:
                    appointmentSummary.total_sold,

                total_face_value:
                    appointmentSummary.total_face_value,
            }
        };

        /* =====================================================
           16. RESPONSE
        ===================================================== */

        return apiResponse.success(
            res,
            "Event sales fetched successfully.",
            {

                event: {

                    id: event.id,

                    name: event.name,

                    currency_symbol:
                        event.currencyName
                            ?.Currency_symbol || "",
                },

                ticketInfo: {

                    tickets,

                    packages,

                    addons,

                    appointments,

                    package_assigned: {

                        tickets:
                            packageAssignedTicketCount,

                        addons:
                            packageAssignedAddonCount,
                    },

                    count_summary: {

                        tickets:
                            ticketsCountTotal,

                        packages:
                            packagesCountTotal,

                        addons:
                            addonsCountTotal,

                        appointments:
                            appointmentsCountTotal,

                        total:
                            grandTotalCount
                    },

                    summary:
                        finalSummary
                },

                priceInfo: {

                    total_amount:
                        Number(
                            priceInfo?.total_amount || 0
                        ),

                    total_taxes:
                        Number(
                            priceInfo?.total_taxes || 0
                        ),

                    gross_total:
                        Number(
                            priceInfo?.gross_total || 0
                        ),
                },

                cancelAmount: {

                    cancel_amount:
                        cancelAmountValue,

                    cancel_tax:
                        cancelTax,
                },

                totalOrdersCount
            }
        );

    } catch (error) {

        console.error(
            "Error fetching event sales types:",
            error
        );

        return apiResponse.error(
            res,
            "Internal Server Error"
        );
    }
};


// exports.getEventSalesTypes = async (req, res) => {
//     try {
//         const { event_id } = req.params;
//         if (!event_id) {
//             return apiResponse.error(res, "Event ID is required");
//         }

//         /* ============================
//            1. EVENT INFO
//         ============================ */
//         const event = await Event.findOne({
//             where: { id: event_id },
//             attributes: ["id", "name"],
//             include: [{
//                 model: Currency,
//                 as: "currencyName",
//                 attributes: ["Currency_symbol"],
//             }],
//         });

//         if (!event) {
//             return apiResponse.success(res, "No event found.", {
//                 event: null,
//                 ticketInfo: {
//                     tickets: [],
//                     packages: [],
//                     addons: [],
//                     appointments: [],
//                     summary: {},
//                 }
//             });
//         }

//         /* ============================
//            2. TICKETS / COMMITTEE / COMPS
//         ============================ */
//         const ticketsRaw = await OrderItems.findAll({
//             attributes: [
//                 "type",
//                 "ticket_id",
//                 [fn("COUNT", col("OrderItems.id")), "sold"],
//                 [fn("SUM", col("OrderItems.price")), "face_value"],
//             ],
//             where: {
//                 event_id,
//                 type: { [Op.in]: ["ticket", "committesale", "comps"] },
//             },
//             include: [{
//                 model: TicketType,
//                 as: "ticketType",
//                 attributes: ["id", "title", "price", 'count'],
//             }],
//             group: [
//                 "OrderItems.ticket_id",
//                 "OrderItems.type",
//                 "ticketType.id",
//             ],
//             raw: true,
//         });

//         const tickets = ticketsRaw.map(t => ({
//             id: t["ticketType.id"],
//             name: t["ticketType.title"],
//             type: t.type,
//             unit_price: Number(t["ticketType.price"] || 0),
//             sold: Number(t.sold || 0),
//             count: Number(t["ticketType.count"] || 0), // ✅
//             face_value: Number(t.face_value || 0),
//         }));

//         /* ============================
//            3. PACKAGES
//         ============================ */
//         const packagesRaw = await OrderItems.findAll({
//             attributes: [
//                 "package_id",
//                 [fn("COUNT", col("OrderItems.id")), "sold"],
//                 [fn("SUM", col("OrderItems.price")), "face_value"],
//             ],
//             where: { event_id, type: "package" },
//             include: [{
//                 model: Package,
//                 as: "package",
//                 attributes: ["id", "name", "grandtotal", "total_package"],
//             }],
//             group: ["package_id", "package.id"],
//             raw: true,
//         });

//         const packages = packagesRaw.map(p => ({
//             id: p["package.id"],
//             name: p["package.name"],
//             unit_price: Number(p["package.grandtotal"] || 0),
//             sold: Number(p.sold || 0),
//             count: Number(p["package.total_package"] || 0), // ✅
//             face_value: Number(p.face_value || 0),
//         }));

//         /* ============================
//            4. ADDONS
//         ============================ */
//         const addonsRaw = await OrderItems.findAll({
//             attributes: [
//                 "addon_id",
//                 [fn("COUNT", col("OrderItems.id")), "sold"],
//                 [fn("SUM", col("OrderItems.price")), "face_value"],
//             ],
//             where: { event_id, type: "addon" },
//             include: [{
//                 model: AddonTypes,
//                 as: "addonType",
//                 attributes: ["id", "name", "price", "count"],
//             }],
//             group: ["addon_id", "addonType.id"],
//             raw: true,
//         });

//         const addons = addonsRaw.map(a => ({
//             id: a["addonType.id"],
//             name: a["addonType.name"],
//             unit_price: Number(a["addonType.price"] || 0),
//             sold: Number(a.sold || 0),
//             count: Number(a["addonType.count"] || 0), // ✅
//             face_value: Number(a.face_value || 0),
//         }));

//         /* ============================
//            5. APPOINTMENTS
//         ============================ */
//         const appointmentsRaw = await OrderItems.findAll({
//             attributes: [
//                 "appointment_id",
//                 [fn("COUNT", col("OrderItems.id")), "sold"],
//                 [fn("SUM", col("OrderItems.price")), "face_value"],
//             ],
//             where: { event_id, type: "appointment" },
//             include: [{
//                 model: WellnessSlots,
//                 as: "appointment",
//                 attributes: ["id", "price", "count"],
//                 include: {
//                     model: Wellness,
//                     as: "wellnessList",
//                     attributes: ["name"],
//                 }
//             }],
//             group: ["appointment_id", "appointment.id"],
//             raw: true,
//         });

//         const appointments = appointmentsRaw.map(a => ({
//             id: a["appointment.id"],
//             name: a["appointment.wellnessList.name"],
//             unit_price: Number(a["appointment.price"] || 0),
//             sold: Number(a.sold || 0),
//             count: Number(a["appointment.count"] || 0), // ✅
//             face_value: Number(a.face_value || 0),
//         }));


//         // TOTAL ORDERS
//         const totalOrdersCount = await Orders.count({
//             where: { event_id },
//         });

//         /* ============================
//            6. TOTAL HELPERS
//         ============================ */
//         const calcTotals = (arr) => ({
//             total_sold: arr.reduce((s, i) => s + i.sold, 0),
//             total_face_value: arr.reduce((s, i) => s + i.face_value, 0),
//         });

//         /* ============================
//            7. PRICE SUMMARY
//         ============================ */
//         const priceInfo = await Orders.findOne({
//             attributes: [
//                 [fn("SUM", col("sub_total")), "total_amount"],
//                 [fn("SUM", col("tax_total")), "total_taxes"],
//                 [fn("SUM", col("grand_total")), "gross_total"],
//             ],
//             where: { event_id },
//             raw: true,
//         });

//         /* ============================
//            8. CANCEL INFO
//         ============================ */
//         const cancelAmount = await OrderItems.findOne({
//             attributes: [[fn("SUM", col("price")), "cancel_amount"]],
//             where: { event_id, cancel_status: "cancel" },
//             raw: true,
//         });

//         const cancelAmountValue = Number(cancelAmount?.cancel_amount || 0);
//         const cancelTax = +(cancelAmountValue * 0.08).toFixed(2);

//         /* ============================
//            9. FINAL RESPONSE
//         ============================ */

//         const calcTotalCount = (arr) =>
//             arr.reduce((sum, item) => sum + Number(item.count || 0), 0);

//         const ticketsCountTotal = calcTotalCount(tickets);
//         const packagesCountTotal = calcTotalCount(packages);
//         const addonsCountTotal = calcTotalCount(addons);
//         const appointmentsCountTotal = calcTotalCount(appointments);

//         const grandTotalCount =
//             ticketsCountTotal +
//             packagesCountTotal +
//             addonsCountTotal +
//             appointmentsCountTotal;

//         return apiResponse.success(res, "Event sales fetched successfully.", {
//             event: {
//                 id: event.id,
//                 name: event.name,
//                 currency_symbol: event.currencyName?.Currency_symbol || "",
//             },
//             ticketInfo: {
//                 tickets,
//                 packages,
//                 addons,
//                 appointments,

//                 count_summary: {
//                     tickets: ticketsCountTotal,
//                     packages: packagesCountTotal,
//                     addons: addonsCountTotal,
//                     appointments: appointmentsCountTotal,
//                     total: grandTotalCount // 🔥 FINAL
//                 },


//                 summary: {
//                     tickets: calcTotals(tickets),
//                     packages: calcTotals(packages),
//                     addons: calcTotals(addons),
//                     appointments: calcTotals(appointments),
//                 }
//             },
//             priceInfo: {
//                 total_amount: Number(priceInfo?.total_amount || 0),
//                 total_taxes: Number(priceInfo?.total_taxes || 0),
//                 gross_total: Number(priceInfo?.gross_total || 0),
//             },
//             cancelAmount: {
//                 cancel_amount: cancelAmountValue,
//                 cancel_tax: cancelTax,
//             },
//             totalOrdersCount
//         });

//     } catch (error) {
//         console.error("Error fetching event sales types:", error);
//         return apiResponse.error(res, "Internal Server Error");
//     }
// };


// ======================================================
// GET COMPLETED ORDERS BY EVENT
// ======================================================

exports.getCompletedOrdersByEvent = async (req, res) => {
    try {

        const { event_id } = req.params;

        if (!event_id) {

            return apiResponse.error(
                res,
                "Event ID is required"
            );
        }

        /* =====================================================
           1. PACKAGE MAP
        ===================================================== */

        const packages = await Package.findAll({

            where: { event_id },

            include: [
                {
                    model: PackageDetails,
                    as: "details",

                    attributes: [
                        "ticket_type_id",
                        "addon_id",
                        "qty"
                    ]
                }
            ],

            attributes: ["id"],
        });

        const packageMap = Object.fromEntries(

            packages.map((pkg) => {

                let ticket = 0;
                let addon = 0;

                pkg.details.forEach((d) => {

                    if (d.ticket_type_id) {
                        ticket += Number(d.qty || 0);
                    }

                    if (d.addon_id) {
                        addon += Number(d.qty || 0);
                    }

                });

                return [
                    pkg.id,
                    {
                        ticket,
                        addon
                    }
                ];
            })
        );

        /* =====================================================
           2. FETCH ORDERS
        ===================================================== */

        const orders = await Orders.findAll({

            where: {
                event_id
            },

            attributes: [

                "id",
                "order_uid",

                // ✅ DB VALUES
                "sub_total",
                "discount_amount",
                "tax_total",
                "grand_total",

                // IMPORTANT
                "cancel_status",

                "created",
            ],

            include: [

                {
                    model: OrderItems,
                    as: "orderItems",

                    attributes: [
                        "id",
                        "type",
                        "count",
                        "package_id",
                        "cancel_status"
                    ],

                    required: false,
                },

                {
                    model: User,
                    as: "user",

                    attributes: [
                        "first_name",
                        "last_name",
                        "email",
                        "mobile"
                    ],
                },

                {
                    model: Event,
                    as: "event",

                    attributes: ["name"],

                    include: [
                        {
                            model: Currency,
                            as: "currencyName",

                            attributes: [
                                "Currency_symbol"
                            ],
                        }
                    ]
                }
            ],

            order: [["created", "DESC"]],
        });

        /* =====================================================
           3. NO DATA
        ===================================================== */

        if (!orders.length) {

            return apiResponse.success(
                res,
                "No completed orders found for this event",
                {
                    total_orders: 0,
                    orders: []
                }
            );
        }

        /* =====================================================
           4. FORMAT RESPONSE
        ===================================================== */

        const formattedOrders = orders.map((order) => {

            const itemCount = {

                ticket: 0,
                addon: 0,
                appointment: 0,
                package: 0,
                comps: 0,
                committesale: 0,
            };

            /* =================================================
               LOOP ORDER ITEMS
            ================================================= */

            (order.orderItems || []).forEach((item) => {

                // SKIP CANCELLED ITEMS
                // if (item.cancel_status === "cancel") {
                //     return;
                // }

                const qty =
                    Number(item.count || 1);

                /* =========================
                   TICKET
                ========================= */

                if (
                    item.type === "ticket"
                    || item.type === "ticket_price"
                ) {

                    itemCount.ticket += qty;
                }

                /* =========================
                   ADDON
                ========================= */

                if (item.type === "addon") {

                    itemCount.addon += qty;
                }

                /* =========================
                   APPOINTMENT
                ========================= */

                if (item.type === "appointment") {

                    itemCount.appointment += qty;
                }

                /* =========================
                   PACKAGE
                ========================= */

                if (item.type === "package") {

                    itemCount.package += qty;

                    const pkg =
                        packageMap[item.package_id];

                    if (pkg) {

                        itemCount.ticket +=
                            qty * pkg.ticket;

                        itemCount.addon +=
                            qty * pkg.addon;
                    }
                }

                /* =========================
                   COMPS
                ========================= */

                if (item.type === "comps") {

                    itemCount.comps += qty;
                }

                /* =========================
                   COMMITTEE SALE
                ========================= */

                if (item.type === "committesale") {

                    itemCount.committesale += qty;
                }

            });

            /* =================================================
               TOTAL ITEMS
            ================================================= */

            const totalItems =
                Object.values(itemCount)
                    .reduce((a, b) => a + b, 0);

            /* =================================================
               FINAL AMOUNTS
            ================================================= */

            // ✅ ORIGINAL FACE VALUE
            const grossSubTotal =
                Number(order.sub_total || 0);

            // ✅ DISCOUNT
            const discountAmount =
                Number(order.discount_amount || 0);

            // ✅ TAX
            const taxTotal =
                Number(order.tax_total || 0);

            // ✅ GRAND TOTAL
            // already discount adjusted in DB
            const grandTotal =
                Number(order.grand_total || 0);

            /* =================================================
               CANCEL AMOUNT
            ================================================= */

            // if order cancelled
            // whole grand total becomes cancel amount

            const cancelAmount =
                order.cancel_status === "cancel"
                    ? grandTotal
                    : 0;

            /* =================================================
               NET RECEIVED
            ================================================= */

            const netReceived =
                grandTotal - cancelAmount;

            /* =================================================
               FINAL RESPONSE
            ================================================= */

            return {

                order_id: order.id,

                order_uid: order.order_uid,

                created: order.created,

                user: {

                    first_name:
                        order.user?.first_name || "",

                    last_name:
                        order.user?.last_name || "",

                    email:
                        order.user?.email || "",

                    mobile:
                        order.user?.mobile || "",
                },

                event: {

                    name:
                        order.event?.name || "",

                    currency_symbol:
                        order.event?.currencyName
                            ?.Currency_symbol || "",
                },

                amount: {

                    // ✅ FACE VALUE
                    gross_sub_total:
                        Number(grossSubTotal.toFixed(2)),

                    // ✅ DISCOUNT
                    discount_amount:
                        Number(discountAmount.toFixed(2)),

                    // ✅ TAX
                    tax_total:
                        Number(taxTotal.toFixed(2)),

                    // ✅ GRAND TOTAL
                    grand_total:
                        Number(grandTotal.toFixed(2)),

                    // ✅ CANCEL AMOUNT
                    cancel_amount:
                        Number(cancelAmount.toFixed(2)),

                    // ✅ FINAL RECEIVED
                    net_received:
                        Number(netReceived.toFixed(2)),
                },

                item_count: itemCount,

                total_items: totalItems,
            };
        });

        /* =====================================================
           5. RESPONSE
        ===================================================== */

        return apiResponse.success(
            res,
            "Completed orders fetched successfully",
            {
                total_orders: formattedOrders.length,
                orders: formattedOrders
            }
        );

    } catch (error) {

        console.error(
            "Completed Orders Error:",
            error
        );

        return apiResponse.error(
            res,
            "Internal Server Error"
        );
    }
};