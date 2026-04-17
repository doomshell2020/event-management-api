const apiResponse = require('../../../common/utils/apiResponse');
const { Orders, TicketType, CommitteeMembers, AddonTypes, CommitteeAssignTickets, TicketPricing, Package, EventSlots, OrderItems, Event, WellnessSlots, Wellness, User, Currency, PackageDetails, Payouts } = require('../../../models');
const { Op, fn, col, literal, Sequelize } = require("sequelize");

// 📌 Get Single Order Details

exports.getEventDetails = async (req, res) => {
    try {
        const { event_id } = req.params;

        // 1️⃣ Event basic info
        const eventInfo = await Event.findOne({
            where: { id: event_id },
            attributes: ['id', 'event_org_id', 'name', 'entry_type', 'is_free'],
            include: { model: Currency, as: "currencyName", attributes: ['Currency_symbol', 'Currency'] }
        });

        if (!eventInfo) {
            return apiResponse.error(res, "Event not found", 404);
        }

        // Total tickets created
        const totalTicketsCreated = await TicketType.sum('count', {
            where: { eventid: event_id }
        });

        //  Total tickets sold
        const totalTicketsSold = await OrderItems.count({
            where: {
                event_id,
                [Op.or]: [
                    { ticket_id: { [Op.ne]: null } },
                    { ticket_pricing_id: { [Op.ne]: null } }
                ]
            }
        });


        /* ================= ADDONS ================= */

        const totalAddonsCreated = await AddonTypes.sum("count", {
            // where: { userid: org_id }
            where: { event_id: event_id }
        });

        const totalAddonsSoldOut = await OrderItems.sum("count", {
            where: {
                event_id: event_id,
                type: { [Op.in]: ["addon"] }
            }
        });

        /* ================= PACKAGE ================= */

        const totalPackagesCreated = await Package.sum("total_package", {
            // where: { userid: org_id }
            where: { event_id: event_id }
        });

        const totalPackagesSold = await OrderItems.sum("count", {
            where: {
                event_id: event_id,
                type: { [Op.in]: ["package"] }
            }
        });

        // Package map (ticket & addon count)
        const packages = await Package.findAll({
            where: { event_id },
            include: {
                model: PackageDetails,
                as: "details",
                attributes: ["ticket_type_id", "addon_id", 'qty']
            },
            attributes: ["id"]
        });

        const packageMap = Object.fromEntries(
            packages.map(pkg => {

                let ticket = 0;
                let addon = 0;

                pkg.details.forEach(d => {
                    if (d.ticket_type_id) {
                        ticket += Number(d.qty || 0);
                    }
                    if (d.addon_id) {
                        addon += Number(d.qty || 0);
                    }
                });

                return [pkg.id, { ticket, addon }];
            })
        );

        //  Package sales
        const packageSales = await OrderItems.findAll({
            where: { event_id, type: "package" },
            attributes: [
                "package_id",
                [Sequelize.fn("SUM", Sequelize.col("count")), "sold"]
            ],
            group: ["package_id"],
            raw: true
        });
        // Final calculation
        const result = packageSales.reduce(
            (acc, { package_id, sold }) => {
                const pkg = packageMap[package_id];
                if (!pkg) return acc;

                acc.tickets += sold * pkg.ticket;
                acc.addons += sold * pkg.addon;

                return acc;
            },
            { tickets: 0, addons: 0 }
        );
        const totalSoldPackageTickets = result.tickets;
        const totalSoldPackageAddons = result.addons;


        /* ================= APPOINTMENTS ================= */
        const wellnessList = await Wellness.findAll({
            where: {
                event_id: event_id
            },
            attributes: ["id"],
            raw: true
        });

        const wellnessIds = wellnessList.map(w => w.id);

        let totalAppointmentsCreated = 0;
        if (wellnessIds.length > 0) {
            totalAppointmentsCreated = await WellnessSlots.sum("count", {
                where: {
                    wellness_id: { [Op.in]: wellnessIds }
                }
            });
        }

        // fallback
        totalAppointmentsCreated = Number(totalAppointmentsCreated || 0);

        const totalAppointmentsSold = await OrderItems.sum("count", {
            where: {
                event_id: event_id,
                type: { [Op.in]: ["appointment"] }
            }
        });



        //  Total Attendees
        const totalAttendees = await OrderItems.count({
            where: {
                event_id,
                is_scanned: "Y",
                type: {
                    [Op.in]: ["ticket_price", "ticket", "committesale"]
                }
            }
        });

        // console.log("totalAttendees---------",totalAttendees);






        //  Revenue & earnings
        const revenueData = await Orders.findOne({
            where: { event_id },
            attributes: [
                [fn("SUM", col("grand_total")), "total_revenue"],
                [fn("SUM", col("sub_total")), "gross_amount"],
                [fn("SUM", col("platform_fee_tax")), "platform_fee_tax"],
                [fn("SUM", col("payment_gateway_tax")), "payment_gateway_tax"],
                [fn("SUM", col("discount_amount")), "total_discount"],
            ],
            raw: true
        });
        const totalRevenue = Number(revenueData.total_revenue || 0);

        const totalDiscount = Number(revenueData.total_discount || 0);
        const netTotalEarning = Number(revenueData.gross_amount || 0);

        const netEarning = netTotalEarning - totalDiscount;

        // const netEarning = Number(revenueData.gross_amount || 0);

        const platformFee = Number(revenueData.platform_fee_tax || 0);
        const gatewayFee = Number(revenueData.payment_gateway_tax || 0);

        // Committee earnings
        const committeeData = await OrderItems.findOne({
            where: {
                event_id: event_id,
                committee_user_id: { [Op.ne]: null },
                status: "Y"
            },
            attributes: [
                [
                    fn(
                        "SUM",
                        literal(`
          CAST(COALESCE(OrderItems.price,0) AS DECIMAL(10,2))
          * CAST(COALESCE(committeeMembers.commission,0) AS DECIMAL(10,2))
          / 100
        `)
                    ),
                    "committee_earning"
                ]
            ],
            include: [
                {
                    model: CommitteeMembers,
                    as: "committeeMembers",
                    attributes: [],
                    required: true,
                    where: {
                        event_id: event_id
                    }
                }
            ],
            raw: true
        });
        const committeeEarning = Number(committeeData.committee_earning || 0);
        const platformData = await Orders.findOne({
            where: { event_id },
            attributes: [
                [fn("SUM", col("platform_fee_tax")), "platform_earning"],
                [fn("SUM", col("payment_gateway_tax")), "gateway_earning"]
            ],
            raw: true
        });

        const platformEarning = Number(platformData.platform_earning || 0);
        const paymentGatewayEarning = Number(platformData.gateway_earning || 0);

        const totalDistributed = totalRevenue
        const commissionSplit = {
            organizer: totalDistributed
                ? ((netEarning / totalDistributed) * 100).toFixed(2)
                : 0,
            platform: totalDistributed
                ? ((platformEarning / totalDistributed) * 100).toFixed(2)
                : 0,
            gateway: totalDistributed
                ? ((paymentGatewayEarning / totalDistributed) * 100).toFixed(2)
                : 0,
            committee: totalDistributed
                ? ((committeeEarning / totalDistributed) * 100).toFixed(2)
                : 0,
        };


        // Commission Breakdown section...
        const adminInfo = await User.findOne({
            where: { id: 1 },
            attributes: ["id", "payment_gateway_charges", "default_platform_charges"]
        });
        const authProfile = await User.findOne({

            where: { id: eventInfo?.event_org_id },
            attributes: ['default_platform_charges']
        })

        const platformCharges =
            authProfile?.default_platform_charges != null &&
                authProfile?.default_platform_charges != ""
                ? authProfile.default_platform_charges
                : adminInfo?.default_platform_charges || 0;

        const gatewayCharges = adminInfo?.payment_gateway_charges || 0;

        // total tickets /addons / package created and sold-out
        const totalTickets = await TicketType.sum('count', {
            where: { eventid: event_id }
        });
        //  Total tickets sold
        const totalTicketsSoldOut = await OrderItems.count({
            where: {
                event_id,
                [Op.or]: [
                    { ticket_id: { [Op.ne]: null } },
                    { ticket_pricing_id: { [Op.ne]: null } }
                ]
            }
        });

        // Total addons created
        const totalAddons = await AddonTypes.sum('count', {
            where: { event_id: event_id }
        });

        //  Total addons sold
        const totalAddonsSold = await OrderItems.count({
            where: {
                event_id,
                addon_id: { [Op.ne]: null },
            }
        });

        const calculatePercentage = (sold, total) => {
            if (!total || total === 0) return 0;
            return Number(((sold / total) * 100).toFixed(2));
        };

        // Ticket sales progress
        const ticketSalesPercent = calculatePercentage(
            totalTicketsSoldOut,
            totalTickets
        );

        // Addon sales progress
        const addonSalesPercent = calculatePercentage(
            totalAddonsSold,
            totalAddons
        );
        //  COMMITTEE PERFORMANCE (FIXED)
        const committeeRaw = await CommitteeMembers.findAll({
            where: {
                event_id: event_id,
                status: "Y"
            },
            attributes: [
                "user_id",

                // Commission
                [
                    fn("MAX", col("CommitteeMembers.commission")),
                    "commission"
                ],

                // ✅ User first name
                [
                    fn("MAX", col("user.first_name")),
                    "first_name"
                ],

                // ✅ User last name
                [
                    fn("MAX", col("user.last_name")),
                    "last_name"
                ],

                // Total sales
                [
                    fn(
                        "SUM",
                        literal(`CAST(order_items.price AS DECIMAL(10,2))`)
                    ),
                    "total_sales"
                ],

                // Commission earning
                [
                    fn(
                        "SUM",
                        literal(`
                    CAST(order_items.price AS DECIMAL(10,2))
                    * CAST(CommitteeMembers.commission AS DECIMAL(10,2))
                    / 100
                `)
                    ),
                    "member_earning"
                ]
            ],
            include: [
                {
                    model: OrderItems,
                    attributes: [],
                    required: false,
                    as: "order_items",
                    where: {
                        event_id,
                        status: "Y"
                    }
                },
                {
                    model: User,
                    attributes: [],
                    required: false,
                    as: "user"
                }
            ],
            group: ["CommitteeMembers.user_id"],
            raw: true
        });

        const committeePerformance = committeeRaw.map(item => {
            const totalSales = Number(item.total_sales || 0);
            const earning = Number(item.member_earning || 0);

            return {
                committee_user_id: item.user_id,
                first_name: item.first_name,
                last_name: item.last_name,
                commission_percentage: Number(item.commission),
                total_sales: totalSales,
                earning,
            };
        });

        // ✅ Total earning
        const committeeTotalEarning = committeePerformance.reduce(
            (sum, member) => sum + member.earning,
            0
        );

        // Ab earning percentage calculate karo
        const finalCommitteePerformance = committeePerformance.map(member => ({
            ...member,
            earning_percentage: committeeEarning
                ? Number(((member.earning / committeeEarning) * 100).toFixed(2))
                : 0
        }));

        return res.json({
            success: true,
            message: "Event dashboard data fetched",
            data: {
                event: eventInfo,
                summary: {
                    totalTicketsCreated,
                    totalTicketsSold,
                    totalRevenue,
                    netEarning,
                    totalAddonsCreated: totalAddonsCreated || 0,
                    totalAddonsSold: totalAddonsSoldOut || 0,
                    totalPackagesCreated: totalPackagesCreated || 0,
                    totalPackagesSold: totalPackagesSold || 0,
                    totalAppointmentsCreated: totalAppointmentsCreated || 0,
                    totalAppointmentsSold: totalAppointmentsSold || 0,
                    totalAttendees: totalAttendees || 0,
                    totalSoldPackageTickets: totalSoldPackageTickets || 0,
                    totalSoldPackageAddons: totalSoldPackageAddons || 0


                },
                revenueDistribution: {
                    organizer: netEarning,
                    platform: platformEarning,
                    gateway: paymentGatewayEarning,
                    committee: committeeEarning
                },
                commissionSplit: {
                    percentage: commissionSplit,
                    totalDistributed
                },
                commissionBreakdown: {
                    platform_fee: platformFee,
                    gateway_fee: gatewayFee,
                    platform_charge: platformCharges,
                    gateway_charge: gatewayCharges
                },
                salesProgress: {
                    tickets: {
                        total: totalTickets,
                        sold: totalTicketsSoldOut,
                        percentage: ticketSalesPercent
                    },
                    addons: {
                        total: totalAddons,
                        sold: totalAddonsSold,
                        percentage: addonSalesPercent
                    }
                },
                committeePerformance: {
                    totalCommitteeEarning: committeeTotalEarning,
                    members: finalCommitteePerformance
                }
            }
        });

    } catch (error) {
        console.log("Event Dashboard Error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};


// get all events details 
exports.getOrganizersEvent = async (req, res) => {
    try {
        const org_id = req?.user?.id;
        if (!org_id) {
            return res.status(400).json({
                success: false,
                message: "Organizer ID not found"
            });
        }
        const today = new Date();

        /* ================= EVENTS ================= */

        const events = await Event.findAll({
            where: { event_org_id: org_id },
            attributes: ["id", "name", "status", "date_from", "date_to"],
            include: [
                {
                    model: Currency,
                    as: "currencyName",
                    attributes: ["Currency_symbol", "Currency"]
                }
            ],
            order: [["created", "DESC"]]
        });

        const totalEvents = events.length;

        const runningEvents = events.filter(event => {
            const startDate = new Date(event.date_from);
            const endDate = new Date(event.date_to);

            return (
                // event.status === "Y" &&
                startDate <= today &&
                endDate >= today
            );
        }).length;

        const completedEvents = events.filter(event => {
            const endDate = new Date(event.date_to);

            return (
                // event.status === "Y" &&
                endDate < today
            );
        }).length;

        const eventIds = events.map(e => e.id);

        /* ================= TICKETS ================= */

        const totalTicketsCreated = await TicketType.sum("count", {
            where: { userid: org_id }
        });

        const totalTicketsSold = await OrderItems.sum("count", {
            where: {
                event_id: { [Op.in]: eventIds },
                type: { [Op.in]: ["ticket", "ticket_price", 'committesale', 'comps'] }
            }
        });



        /* ================= ADDONS ================= */

        const totalAddonsCreated = await AddonTypes.sum("count", {
            // where: { userid: org_id }
            where: { event_id: { [Op.in]: eventIds }, }
        });

        const totalAddonsSold = await OrderItems.sum("count", {
            where: {
                event_id: { [Op.in]: eventIds },
                type: { [Op.in]: ["addon"] }
            }
        });

        /* ================= PACKAGE ================= */

        const totalPackagesCreated = await Package.sum("total_package", {
            // where: { userid: org_id }
            where: { event_id: { [Op.in]: eventIds }, }
        });

        const totalPackagesSold = await OrderItems.sum("count", {
            where: {
                event_id: { [Op.in]: eventIds },
                type: { [Op.in]: ["package"] }
            }
        });


        // Package map (ticket & addon count)
        const packages = await Package.findAll({
            where: { event_id: { [Op.in]: eventIds } },
            include: {
                model: PackageDetails,
                as: "details",
                attributes: ["ticket_type_id", "addon_id", 'qty']
            },
            attributes: ["id"]
        });

        const packageMap = Object.fromEntries(
            packages.map(pkg => {

                let ticket = 0;
                let addon = 0;

                pkg.details.forEach(d => {
                    if (d.ticket_type_id) {
                        ticket += Number(d.qty || 0);
                    }
                    if (d.addon_id) {
                        addon += Number(d.qty || 0);
                    }
                });

                return [pkg.id, { ticket, addon }];
            })
        );

        //  Package sales
        const packageSales = await OrderItems.findAll({
            where: { event_id: { [Op.in]: eventIds }, type: "package" },
            attributes: [
                "package_id",
                [Sequelize.fn("SUM", Sequelize.col("count")), "sold"]
            ],
            group: ["package_id"],
            raw: true
        });
        // Final calculation
        const result = packageSales.reduce(
            (acc, { package_id, sold }) => {
                const pkg = packageMap[package_id];
                if (!pkg) return acc;

                acc.tickets += sold * pkg.ticket;
                acc.addons += sold * pkg.addon;

                return acc;
            },
            { tickets: 0, addons: 0 }
        );
        const totalSoldPackageTickets = result.tickets;
        const totalSoldPackageAddons = result.addons;


        /* ================= APPOINTMENTS ================= */
        const wellnessList = await Wellness.findAll({
            where: {
                event_id: { [Op.in]: eventIds }
            },
            attributes: ["id"],
            raw: true
        });

        const wellnessIds = wellnessList.map(w => w.id);

        let totalAppointmentsCreated = 0;
        if (wellnessIds.length > 0) {
            totalAppointmentsCreated = await WellnessSlots.sum("count", {
                where: {
                    wellness_id: { [Op.in]: wellnessIds }
                }
            });
        }

        // fallback
        totalAppointmentsCreated = Number(totalAppointmentsCreated || 0);

        const totalAppointmentsSold = await OrderItems.sum("count", {
            where: {
                event_id: { [Op.in]: eventIds },
                type: { [Op.in]: ["appointment"] }
            }
        });



        /* ================= REVENUE ================= */

        const revenueData = await Orders.findOne({
            where: { event_id: { [Op.in]: eventIds } },
            attributes: [
                [fn("SUM", col("grand_total")), "total_revenue"],
                [fn("SUM", col("sub_total")), "gross_amount"],
                [fn("SUM", col("platform_fee_tax")), "platform_fee_tax"],
                [fn("SUM", col("payment_gateway_tax")), "payment_gateway_tax"],
                [fn("SUM", col("discount_amount")), "total_discount"],
            ],
            raw: true
        });

        const totalRevenue = Number(revenueData?.total_revenue || 0);
        // const grossAmount = Number(revenueData?.gross_amount || 0);
        const totalDiscount = Number(revenueData?.total_discount || 0);
        const netTotalEarning = Number(revenueData?.gross_amount || 0);

        const grossAmount = netTotalEarning - totalDiscount;
        const platformFee = Number(revenueData?.platform_fee_tax || 0);
        const gatewayFee = Number(revenueData?.payment_gateway_tax || 0);
        const organizerEarning = grossAmount;


        // Committee earnings
        const committeeData = await OrderItems.findOne({
            where: {
                event_id: { [Op.in]: eventIds },
                committee_user_id: { [Op.ne]: null },
                status: "Y"
            },
            attributes: [
                [
                    fn(
                        "SUM",
                        literal(`
          CAST(COALESCE(OrderItems.price,0) AS DECIMAL(10,2))
          * CAST(COALESCE(committeeMembers.commission,0) AS DECIMAL(10,2))
          / 100
        `)
                    ),
                    "committee_earning"
                ]
            ],
            include: [
                {
                    model: CommitteeMembers,
                    as: "committeeMembers",
                    attributes: [],
                    required: true,
                    where: {
                        event_id: { [Op.in]: eventIds }
                    }
                }
            ],
            raw: true
        });
        const committeeFee = Number(committeeData.committee_earning || 0);

        /* ================= SALES TRENDS ================= */

        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const salesRevenueTrend = await Orders.findAll({
            attributes: [
                [fn("DATE", col("created")), "date"],
                [fn("SUM", col("grand_total")), "revenue"]
            ],
            where: {
                event_id: { [Op.in]: eventIds },
                created: { [Op.gte]: last30Days }
            },
            group: [fn("DATE", col("created"))],
            order: [[fn("DATE", col("created")), "ASC"]],
            raw: true
        });

        const ticketsSoldTrend = await OrderItems.findAll({
            attributes: [
                [fn("DATE", col("createdAt")), "date"],
                [fn("SUM", col("count")), "tickets"]
            ],
            where: {
                event_id: { [Op.in]: eventIds },
                type: { [Op.in]: ["ticket", "ticket_price"] },
                createdAt: { [Op.gte]: last30Days }
            },
            group: [fn("DATE", col("createdAt"))],
            order: [[fn("DATE", col("createdAt")), "ASC"]],
            raw: true
        });

        /* ================= FORMAT SALES TREND ================= */

        const categories = salesRevenueTrend.map(item => item.date);

        const revenueSeries = salesRevenueTrend.map(item =>
            Number(item.revenue || 0)
        );

        const ticketsSeries = ticketsSoldTrend.map(item =>
            Number(item.tickets || 0)
        );


        // ================================
        // Running Events Filter (OLD LOGIC)
        // ================================

        const runningEventsList = events.filter(event => {

            const startDate = new Date(event.date_from);
            const endDate = new Date(event.date_to);

            return (
                // event.status === "Y" &&
                startDate <= today &&
                endDate >= today
            );

        });


        // ======================================
        // NEW FEATURE : LIVE SALES PERFORMANCE
        // ======================================

        const runningEventIds = runningEventsList.map(e => e.id);

        let liveSalesPerformance = [];

        if (runningEventIds.length) {

            // Total Tickets Created per Event
            const eventTickets = await TicketType.findAll({
                attributes: [
                    "eventid",
                    [fn("SUM", col("count")), "total_tickets"]
                ],
                where: {
                    eventid: { [Op.in]: runningEventIds }
                },
                group: ["eventid"],
                raw: true
            });
            // Sold Tickets per Event
            const eventTicketsSold = await OrderItems.findAll({
                attributes: [
                    "event_id",
                    [fn("SUM", col("count")), "sold_tickets"]
                ],
                where: {
                    event_id: { [Op.in]: runningEventIds },
                    type: { [Op.in]: ["ticket", "ticket_price", 'committesale', 'comps'] }
                },
                group: ["event_id"],
                raw: true
            });

            const packages = await Package.findAll({
                where: { event_id: { [Op.in]: runningEventIds } },
                include: {
                    model: PackageDetails,
                    as: "details",
                    attributes: ["ticket_type_id", "addon_id", 'qty']
                },
                attributes: ["id"]
            });

            const packageMap = Object.fromEntries(
                packages.map(pkg => {

                    let ticket = 0;
                    let addon = 0;

                    pkg.details.forEach(d => {
                        if (d.ticket_type_id) {
                            ticket += Number(d.qty || 0);
                        }
                        if (d.addon_id) {
                            addon += Number(d.qty || 0);
                        }
                    });

                    return [pkg.id, { ticket, addon }];
                })
            );

            //  Package sales
            const packageSales = await OrderItems.findAll({
                where: { event_id: { [Op.in]: eventIds }, type: "package" },
                attributes: [
                    "package_id",
                    [Sequelize.fn("SUM", Sequelize.col("count")), "sold"]
                ],
                group: ["package_id"],
                raw: true
            });
            // Final calculation
            const result = packageSales.reduce(
                (acc, { package_id, sold }) => {
                    const pkg = packageMap[package_id];
                    if (!pkg) return acc;

                    acc.tickets += sold * pkg.ticket;
                    acc.addons += sold * pkg.addon;

                    return acc;
                },
                { tickets: 0, addons: 0 }
            );
            const totalSoldPackageTickets = result.tickets;


            // Revenue per Event
            const eventRevenue = await Orders.findAll({
                attributes: [
                    "event_id",
                    [fn("SUM", col("grand_total")), "revenue"]
                ],
                where: {
                    event_id: { [Op.in]: runningEventIds }
                },
                group: ["event_id"],
                raw: true
            });
            // Merge Data
            liveSalesPerformance = runningEventsList.map(event => {

                const ticketsData = eventTickets.find(t => t.eventid === event.id);
                const soldData = eventTicketsSold.find(t => t.event_id === event.id);
                const revenueData = eventRevenue.find(r => r.event_id === event.id);

                const totalTickets = Number(ticketsData?.total_tickets || 0);
                const soldTickets = Number(soldData?.sold_tickets || 0);
                const revenue = Number(revenueData?.revenue || 0);

                const totalSoldTicketsWithPkg = soldTickets + totalSoldPackageTickets;

                const remaining = totalTickets - totalSoldTicketsWithPkg;

                const progress = totalTickets
                    ? Math.round((totalSoldTicketsWithPkg / totalTickets) * 100)
                    : 0;

                return {

                    event_id: event.id,
                    event_name: event.name,
                    event_date: event.date_from,

                    totalTickets,
                    soldTickets: totalSoldTicketsWithPkg,
                    remaining,
                    revenue,
                    progress

                };

            });

        }


        /* ================= SALES PROGRESS ================= */

        const runningEventIdsForProgress = runningEventsList.map(e => e.id);

        let salesProgress = {
            soldPercent: 0,
            soldTickets: 0,
            totalTickets: 0,
            soldRevenue: 0,
            potentialRevenue: 0
        };

        if (runningEventIdsForProgress.length) {

            // Total Tickets
            const totalTicketsData = await TicketType.findOne({
                attributes: [
                    [fn("SUM", col("count")), "totalTickets"]
                ],
                where: {
                    eventid: { [Op.in]: runningEventIdsForProgress }
                },
                raw: true
            });

            // Sold Tickets
            const soldTicketsData = await OrderItems.findOne({
                attributes: [
                    [fn("SUM", col("count")), "soldTickets"]
                ],
                where: {
                    event_id: { [Op.in]: runningEventIdsForProgress },
                    type: { [Op.in]: ["ticket", "ticket_price", 'committesale', 'comps'] }
                },
                raw: true
            });


            const packages = await Package.findAll({
                where: { event_id: { [Op.in]: runningEventIds } },
                include: {
                    model: PackageDetails,
                    as: "details",
                    attributes: ["ticket_type_id", "addon_id", 'qty']
                },
                attributes: ["id"]
            });

            const packageMap = Object.fromEntries(
                packages.map(pkg => {

                    let ticket = 0;
                    let addon = 0;

                    pkg.details.forEach(d => {
                        if (d.ticket_type_id) {
                            ticket += Number(d.qty || 0);
                        }
                        if (d.addon_id) {
                            addon += Number(d.qty || 0);
                        }
                    });

                    return [pkg.id, { ticket, addon }];
                })
            );

            //  Package sales
            const packageSales = await OrderItems.findAll({
                where: { event_id: { [Op.in]: eventIds }, type: "package" },
                attributes: [
                    "package_id",
                    [Sequelize.fn("SUM", Sequelize.col("count")), "sold"]
                ],
                group: ["package_id"],
                raw: true
            });
            // Final calculation
            const result = packageSales.reduce(
                (acc, { package_id, sold }) => {
                    const pkg = packageMap[package_id];
                    if (!pkg) return acc;

                    acc.tickets += sold * pkg.ticket;
                    acc.addons += sold * pkg.addon;

                    return acc;
                },
                { tickets: 0, addons: 0 }
            );
            const totalSoldPackageTickets = result.tickets;

            // Sold Revenue
            const soldRevenueData = await Orders.findOne({
                attributes: [
                    [fn("SUM", col("grand_total")), "soldRevenue"]
                ],
                where: {
                    event_id: { [Op.in]: runningEventIdsForProgress }
                },
                raw: true
            });

            const totalTickets = Number(totalTicketsData?.totalTickets || 0);
            const soldTickets = Number(soldTicketsData?.soldTickets || 0);
            const soldRevenue = Number(soldRevenueData?.soldRevenue || 0);
            const totalSoldTicketsWithPkg = soldTickets + totalSoldPackageTickets;
            const remainingTickets = totalTickets - totalSoldTicketsWithPkg;

            const soldPercent = totalTickets
                ? Math.round((totalSoldTicketsWithPkg / totalTickets) * 100)
                : 0;

            const avgTicketPrice = totalSoldTicketsWithPkg
                ? soldRevenue / totalSoldTicketsWithPkg
                : 0;

            const potentialRevenue = remainingTickets * avgTicketPrice;

            salesProgress = {
                soldPercent,
                soldTickets:totalSoldTicketsWithPkg,
                totalTickets,
                soldRevenue,
                potentialRevenue
            };
        }

        /* ================= HISTORICAL SALES REPORT ================= */

        const completedEventIds = events
            .filter(event => {
                const endDate = new Date(event.date_to);
                // return event.status === "Y" && endDate < today;
                return endDate < today;
            })
            .map(e => e.id);

        let historicalEvents = [];

        if (completedEventIds.length) {

            const eventTicketsSold = await OrderItems.findAll({
                attributes: [
                    "event_id",
                    [fn("SUM", col("count")), "tickets"]
                ],
                where: {
                    event_id: { [Op.in]: completedEventIds },
                    type: { [Op.in]: ["ticket", "ticket_price", 'committesale', 'comps'] }
                },
                group: ["event_id"],
                raw: true
            });

            const eventRevenue = await Orders.findAll({
                attributes: [
                    "event_id",
                    [fn("SUM", col("grand_total")), "revenue"],
                    [fn("SUM", col("platform_fee_tax")), "commission"],
                    [fn("SUM", col("payment_gateway_tax")), "payment_gateway_fee"]
                ],
                where: {
                    event_id: { [Op.in]: completedEventIds }
                },
                group: ["event_id"],
                raw: true
            });

            historicalEvents = events
                .filter(e => completedEventIds.includes(e.id))
                .map(event => {
                    //    console.log("event--------",event?.currencyName?.Currency_symbol);
                    const ticketsData = eventTicketsSold.find(t => t.event_id === event.id);
                    const revenueData = eventRevenue.find(r => r.event_id === event.id);

                    const tickets = Number(ticketsData?.tickets || 0);
                    const revenue = Number(revenueData?.revenue || 0);
                    // const commission = Number(revenueData?.commission || 0);
                    // const commission = Number(revenueData?.commission + revenueData?.payment_gateway_fee || 0);
                    const commission =
                        Number(revenueData?.commission || 0) +
                        Number(revenueData?.payment_gateway_fee || 0);

                    const net = revenue - commission;

                    return {
                        name: event.name,
                        date: event.date_from,
                        CurrencyName: event?.currencyName?.Currency_symbol,
                        tickets,
                        revenue,
                        commission,
                        net
                    };
                });
        }
        const historicalSummary = {
            totalTickets: historicalEvents.reduce((a, b) => a + b.tickets, 0),
            totalRevenue: historicalEvents.reduce((a, b) => a + b.revenue, 0),
            totalCommissions: historicalEvents.reduce((a, b) => a + b.commission, 0),
            netEarnings: historicalEvents.reduce((a, b) => a + b.net, 0)
        };


        /* ================= COMMITTEE PERFORMANCE ================= */

        let committeePerformance = [];

        let committeeSummary = {
            totalAssigned: 0,
            totalSold: 0,
            totalPaid: 0,
            conversionRate: 0,
            totalCommitteeEarning: 0,
            avgConversion: 0
        };

        if (eventIds.length) {

            const committeeRaw = await CommitteeMembers.findAll({
                where: {
                    event_id: { [Op.in]: eventIds },
                    status: "Y"
                },
                attributes: [
                    "user_id",

                    [fn("MAX", col("CommitteeMembers.commission")), "commission"],

                    [fn("MAX", col("user.first_name")), "first_name"],
                    [fn("MAX", col("user.last_name")), "last_name"],

                    // Total Sales
                    //     [
                    //         literal(`(
                    //     SELECT COALESCE(SUM(oi.price),0)
                    //     FROM tbl_order_items oi
                    //     WHERE oi.committee_user_id = CommitteeMembers.user_id
                    //     AND oi.event_id IN (${eventIds.join(",")})
                    //     AND oi.status='Y'
                    // )`),
                    //         "total_sales"
                    //     ],
                    [
                        literal(`(
                    SELECT COALESCE(SUM(oi.price),0)
                    FROM tbl_order_items oi
                    WHERE oi.committee_user_id = CommitteeMembers.user_id
                    AND oi.event_id IN (${eventIds.join(",")})
                    AND oi.status='Y'
                )`),
                        "total_sales"
                    ],

                    // Tickets Sold
                    [
                        literal(`(
    SELECT COALESCE(SUM(oi.count),0)
    FROM tbl_order_items oi
    WHERE oi.committee_user_id = CommitteeMembers.user_id
    AND oi.event_id IN (${eventIds.join(",")})
    AND oi.status = 'Y'
 )`),
                        "tickets_sold"
                    ],

                    // Assigned Tickets
                    [
                        literal(`(
    SELECT COALESCE(SUM(cat.count),0)
    FROM tblcommittee_assigntickets cat
    WHERE cat.user_id = CommitteeMembers.user_id
    AND cat.event_id IN (${eventIds.join(",")})
 )`),
                        "assigned_tickets"
                    ]
                ],

                include: [
                    {
                        model: User,
                        attributes: [],
                        required: false,
                        as: "user"
                    }
                ],

                group: ["CommitteeMembers.user_id"],
                raw: true
            });

            committeePerformance = committeeRaw.map(item => {

                const totalSales = Number(item.total_sales || 0);
                const commission = Number(item.commission || 0);

                const soldTickets = Number(item.tickets_sold || 0);
                const assignedTickets = Number(item.assigned_tickets || 0);

                const earning = (totalSales * commission) / 100;

                const conversion = assignedTickets
                    ? Math.round((soldTickets / assignedTickets) * 100)
                    : 0;
                return {
                    committee_user_id: item.user_id,
                    name: `${item.first_name || ""} ${item.last_name || ""}`,
                    commission_percentage: commission,
                    total_sales: totalSales,
                    soldTickets,
                    assignedTickets,
                    earning,
                    conversion
                };
            });

            const totalAssigned = committeePerformance.reduce(
                (a, b) => a + b.assignedTickets,
                0
            );

            const totalSold = committeePerformance.reduce(
                (a, b) => a + b.soldTickets,
                0
            );

            const totalPaid = committeePerformance.reduce(
                // (a, b) => a + b.earning,
                (a, b) => a + b.total_sales,
                0
            );

            const avgConversion = committeePerformance.length
                ? Math.round(
                    committeePerformance.reduce((a, b) => a + b.conversion, 0) /
                    committeePerformance.length
                )
                : 0;

            committeeSummary = {
                totalAssigned,
                totalSold,
                totalPaid,
                conversionRate: avgConversion,
                totalCommitteeEarning: totalPaid,
                avgConversion
            };
        }







        // ================= PER EVENT DATA =================

        // Total Tickets per event
        const ticketsPerEvent = await TicketType.findAll({
            attributes: [
                "eventid",
                [fn("SUM", col("count")), "totalTickets"]
            ],
            where: { eventid: { [Op.in]: eventIds } },
            group: ["eventid"],
            raw: true
        });

        // Sold Tickets per event
        const soldTicketsPerEvent = await OrderItems.findAll({
            attributes: [
                "event_id",
                [fn("SUM", col("count")), "soldTickets"]
            ],
            where: {
                event_id: { [Op.in]: eventIds },
                type: { [Op.in]: ["ticket", "ticket_price", "committesale", "comps"] }
            },
            group: ["event_id"],
            raw: true
        });

        // Total Addons per event
        const addonsPerEvent = await AddonTypes.findAll({
            attributes: [
                "event_id",
                [fn("SUM", col("count")), "totalAddons"]
            ],
            where: { event_id: { [Op.in]: eventIds } },
            group: ["event_id"],
            raw: true
        });

        // Sold Addons per event
        const soldAddonsPerEvent = await OrderItems.findAll({
            attributes: [
                "event_id",
                [fn("SUM", col("count")), "soldAddons"]
            ],
            where: {
                event_id: { [Op.in]: eventIds },
                type: "addon"
            },
            group: ["event_id"],
            raw: true
        });

        const packagePerEvent = await Package.findAll({
            attributes: [
                "event_id",
                [fn("SUM", col("total_package")), "totalPackages"]
            ],
            where: { event_id: { [Op.in]: eventIds } },
            group: ["event_id"],
            raw: true
        });


        const soldPackagesPerEvent = await OrderItems.findAll({
            attributes: [
                "event_id",
                [fn("SUM", col("count")), "soldPackages"]
            ],
            where: {
                event_id: { [Op.in]: eventIds },
                type: "package"
            },
            group: ["event_id"],
            raw: true
        });

        const wellnessListPerEvent = await Wellness.findAll({
            where: { event_id: { [Op.in]: eventIds } },
            attributes: ["id", "event_id"], // ✅ event_id add karo
            raw: true
        });


        const wellnessId = wellnessListPerEvent.map(w => w.id);
        let appointmentsCreatedPerEvent = [];

        if (wellnessId.length > 0) {
            appointmentsCreatedPerEvent = await WellnessSlots.findAll({
                attributes: [
                    "wellness_id",
                    [fn("SUM", col("count")), "totalAppointments"]
                ],
                where: {
                    wellness_id: { [Op.in]: wellnessId }
                },
                group: ["wellness_id"],
                raw: true
            });
        }

        const wellnessEventMap = {};
        wellnessListPerEvent.forEach(w => {
            wellnessEventMap[w.id] = w.event_id;
        });

        const appointmentEventWise = {};

        appointmentsCreatedPerEvent.forEach(a => {
            const eventId = wellnessEventMap[a.wellness_id];
            if (!eventId) return;

            if (!appointmentEventWise[eventId]) {
                appointmentEventWise[eventId] = 0;
            }

            appointmentEventWise[eventId] += Number(a.totalAppointments || 0);
        });


        const appointmentsSoldPerEvent = await OrderItems.findAll({
            attributes: [
                "event_id",
                [fn("SUM", col("count")), "soldAppointments"]
            ],
            where: {
                event_id: { [Op.in]: eventIds },
                type: "appointment"
            },
            group: ["event_id"],
            raw: true
        });


        // Revenue per event
        const revenuePerEvent = await Orders.findAll({
            attributes: [
                "event_id",

                [fn("SUM", col("grand_total")), "revenue"],
                // Organizer earning (sub_total)
                [fn("SUM", col("sub_total")), "organizerEarning"],

                // Discount
                [fn("SUM", col("discount_amount")), "totalDiscount"],

                // total platform tax..
                [fn("SUM", col("platform_fee_tax")), "totalPlatformFee"],
                // total gateway tax..
                [fn("SUM", col("payment_gateway_tax")), "totalPaymentGatewayFee"],


            ],
            where: { event_id: { [Op.in]: eventIds } },
            group: ["event_id"],
            raw: true
        });


        const packagesPerEvent = await Package.findAll({
            where: { event_id: { [Op.in]: eventIds } },
            include: {
                model: PackageDetails,
                as: "details",
                attributes: ["ticket_type_id", "addon_id", 'qty']
            },
            attributes: ["id", "event_id"]
        });

        const packagePerEventMap = {};

        packagesPerEvent.forEach(pkg => {

            let ticket = 0;
            let addon = 0;

            pkg.details.forEach(d => {
                if (d.ticket_type_id) ticket += Number(d.qty || 0);
                if (d.addon_id) addon += Number(d.qty || 0);
            });

            packagePerEventMap[pkg.id] = {
                event_id: pkg.event_id, // ✅ IMPORTANT
                ticket,
                addon
            };
        });

        //  Package sales
        const packagePerEventSales = await OrderItems.findAll({
            where: { event_id: { [Op.in]: eventIds }, type: "package" },
            attributes: [
                "package_id",
                [Sequelize.fn("SUM", Sequelize.col("count")), "sold"]
            ],
            group: ["package_id"],
            raw: true
        });

        const packageEventWise = {};

        packagePerEventSales.forEach(({ package_id, sold }) => {

            const pkg = packagePerEventMap[package_id];
            if (!pkg) return;

            const eventId = pkg.event_id;

            if (!packageEventWise[eventId]) {
                packageEventWise[eventId] = { tickets: 0, addons: 0 };
            }

            packageEventWise[eventId].tickets += sold * pkg.ticket;
            packageEventWise[eventId].addons += sold * pkg.addon;
        });

        const payoutPerEvent = await Payouts.findAll({
            attributes: [
                "event_id",
                [fn("SUM", col("paid_amount")), "totalPayout"]
            ],
            where: {
                event_id: { [Op.in]: eventIds },

                // ✅ IMPORTANT FILTER
                committee_id: { [Op.ne]: null }
            },
            group: ["event_id"],
            raw: true
        });

        const payoutMap = Object.fromEntries(
            payoutPerEvent.map(p => [
                p.event_id,
                Number(p.totalPayout || 0)
            ])
        );


        // merge inside events....
        const updatedEvents = events.map(event => {

            const totalTickets = ticketsPerEvent.find(t => t.eventid === event.id);
            const soldTickets = soldTicketsPerEvent.find(t => t.event_id === event.id);
            const totalAddons = addonsPerEvent.find(a => a.event_id === event.id);
            const soldAddons = soldAddonsPerEvent.find(a => a.event_id === event.id);
            const revenue = revenuePerEvent.find(r => r.event_id === event.id);
            const pkgData = packageEventWise[event.id] || { tickets: 0, addons: 0 };

            const pkg = packagePerEvent.find(p => p.event_id === event.id);
            const soldPkg = soldPackagesPerEvent.find(p => p.event_id === event.id);
            const soldAppointments = appointmentsSoldPerEvent.find(a => a.event_id === event.id);

            return {
                ...event.toJSON(),

                totalTickets: Number(totalTickets?.totalTickets || 0),
                // soldTickets: Number(soldTickets?.soldTickets || 0),
                soldTickets: Number(soldTickets?.soldTickets || 0) + pkgData.tickets,

                totalAddons: Number(totalAddons?.totalAddons || 0),
                // soldAddons: Number(soldAddons?.soldAddons || 0),
                soldAddons: Number(soldAddons?.soldAddons || 0) + pkgData.addons,

                totalPackages: Number(pkg?.totalPackages || 0),
                soldPackages: Number(soldPkg?.soldPackages || 0),

                totalAppointments: Number(appointmentEventWise[event.id] || 0),
                soldAppointments: Number(soldAppointments?.soldAppointments || 0),

                revenue: Number(revenue?.revenue || 0),
                organizerEarning: Number(revenue?.organizerEarning || 0) - Number(revenue?.totalDiscount || 0),

                PlatformFee: Number(revenue?.totalPlatformFee || 0),
                PaymentGatewayFee: Number(revenue?.totalPaymentGatewayFee || 0),

                totalPayout: payoutMap[event.id] || 0

            };
        });
        /* ================= RESPONSE ================= */
        return res.json({
            success: true,
            message: "Events dashboard data fetched successfully",
            data: {
                events: updatedEvents,
                summary: {
                    total_events: totalEvents,
                    running_events: runningEvents,
                    completed_events: completedEvents,
                    totalTicketsCreated: totalTicketsCreated || 0,
                    totalTicketsSold: totalTicketsSold || 0,
                    totalRevenue,
                    organizerEarning,
                    totalAddonsCreated: totalAddonsCreated || 0,
                    totalAddonsSold: totalAddonsSold || 0,
                    totalPackagesCreated: totalPackagesCreated || 0,
                    totalPackagesSold: totalPackagesSold || 0,
                    totalAppointmentsCreated: totalAppointmentsCreated || 0,
                    totalAppointmentsSold: totalAppointmentsSold || 0,
                    totalSoldPackageTickets: totalSoldPackageTickets || 0,
                    totalSoldPackageAddons: totalSoldPackageAddons || 0,
                },

                salesTrend: {
                    categories,
                    series: [
                        {
                            name: "Tickets Sold",
                            data: ticketsSeries
                        },
                        {
                            name: "Revenue",
                            data: revenueSeries
                        }
                    ]
                },

                revenueDistribution: {
                    organizerEarning,
                    platformFee,
                    committeeFee,
                    gatewayFee
                },
                // New Section
                liveSalesPerformance,

                salesProgress,

                historicalSalesReport: {
                    summary: historicalSummary,
                    events: historicalEvents
                },

                committeePerformance: {
                    summary: committeeSummary,
                    members: committeePerformance
                }
            }
        });

    } catch (error) {

        console.log("Event Dashboard Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });

    }
};



exports.getOrganizerEventDashboardByEventId = async (req, res) => {
    try {

        const org_id = req?.user?.id;
        const { event_id } = req.params;

        if (!org_id) {
            return res.status(400).json({
                success: false,
                message: "Organizer ID not found"
            });
        }

        if (!event_id) {
            return res.status(400).json({
                success: false,
                message: "Event id is required"
            });
        }

        const today = new Date();

        const eventIds = [event_id];

        /* ================= EVENTS ================= */

        const events = await Event.findAll({
            where: { id: event_id },
            attributes: ["id", "name", "status", "date_from", "date_to"],
            include: [
                {
                    model: Currency,
                    as: "currencyName",
                    attributes: ["Currency_symbol", "Currency"]
                }
            ]
        });

        const totalEvents = events.length;

        const runningEvents = events.filter(event => {
            const startDate = new Date(event.date_from);
            const endDate = new Date(event.date_to);

            return (
                // event.status === "Y" &&
                startDate <= today &&
                endDate >= today
            );
        }).length;

        const completedEvents = events.filter(event => {
            const endDate = new Date(event.date_to);

            return (
                // event.status === "Y" &&
                endDate < today
            );
        }).length;

        /* ================= TICKETS ================= */

        const totalTicketsCreated = await TicketType.sum("count", {
            where: { eventid: event_id }
        });

        const totalTicketsSold = await OrderItems.sum("count", {
            where: {
                event_id: { [Op.in]: eventIds },
                type: { [Op.in]: ["ticket", "ticket_price", 'committesale', 'comps'] }
            }
        });



        /* ================= ADDONS ================= */

        const totalAddonsCreated = await AddonTypes.sum("count", {
            // where: { userid: org_id }
            where: { event_id: { [Op.in]: eventIds }, }
        });

        const totalAddonsSold = await OrderItems.sum("count", {
            where: {
                event_id: { [Op.in]: eventIds },
                type: { [Op.in]: ["addon"] }
            }
        });

        /* ================= PACKAGE ================= */

        const totalPackagesCreated = await Package.sum("total_package", {
            // where: { userid: org_id }
            where: { event_id: { [Op.in]: eventIds }, }
        });

        const totalPackagesSold = await OrderItems.sum("count", {
            where: {
                event_id: { [Op.in]: eventIds },
                type: { [Op.in]: ["package"] }
            }
        });


        // Package map (ticket & addon count)
        const packages = await Package.findAll({
            where: { event_id },
            include: {
                model: PackageDetails,
                as: "details",
                attributes: ["ticket_type_id", "addon_id", 'qty']
            },
            attributes: ["id"]
        });

        const packageMap = Object.fromEntries(
            packages.map(pkg => {

                let ticket = 0;
                let addon = 0;

                pkg.details.forEach(d => {
                    if (d.ticket_type_id) {
                        ticket += Number(d.qty || 0);
                    }
                    if (d.addon_id) {
                        addon += Number(d.qty || 0);
                    }
                });

                return [pkg.id, { ticket, addon }];
            })
        );

        //  Package sales
        const packageSales = await OrderItems.findAll({
            where: { event_id, type: "package" },
            attributes: [
                "package_id",
                [Sequelize.fn("SUM", Sequelize.col("count")), "sold"]
            ],
            group: ["package_id"],
            raw: true
        });
        // Final calculation
        const result = packageSales.reduce(
            (acc, { package_id, sold }) => {
                const pkg = packageMap[package_id];
                if (!pkg) return acc;

                acc.tickets += sold * pkg.ticket;
                acc.addons += sold * pkg.addon;

                return acc;
            },
            { tickets: 0, addons: 0 }
        );
        const totalSoldPackageTickets = result.tickets;
        const totalSoldPackageAddons = result.addons;
        /* ================= APPOINTMENTS ================= */
        const wellnessList = await Wellness.findAll({
            where: {
                event_id: { [Op.in]: eventIds }
            },
            attributes: ["id"],
            raw: true
        });

        const wellnessIds = wellnessList.map(w => w.id);

        let totalAppointmentsCreated = 0;
        if (wellnessIds.length > 0) {
            totalAppointmentsCreated = await WellnessSlots.sum("count", {
                where: {
                    wellness_id: { [Op.in]: wellnessIds }
                }
            });
        }

        // fallback
        totalAppointmentsCreated = Number(totalAppointmentsCreated || 0);

        const totalAppointmentsSold = await OrderItems.sum("count", {
            where: {
                event_id: { [Op.in]: eventIds },
                type: { [Op.in]: ["appointment"] }
            }
        });

        /* ================= REVENUE ================= */

        const revenueData = await Orders.findOne({
            where: { event_id: { [Op.in]: eventIds } },
            attributes: [
                [fn("SUM", col("grand_total")), "total_revenue"],
                [fn("SUM", col("sub_total")), "gross_amount"],
                [fn("SUM", col("platform_fee_tax")), "platform_fee_tax"],
                [fn("SUM", col("payment_gateway_tax")), "payment_gateway_tax"],
                [fn("SUM", col("discount_amount")), "total_discount"],
            ],
            raw: true
        });

        const totalRevenue = Number(revenueData?.total_revenue || 0);
        // const grossAmount = Number(revenueData?.gross_amount || 0);
        const totalDiscount = Number(revenueData?.total_discount || 0);
        const netTotalEarning = Number(revenueData?.gross_amount || 0);

        const grossAmount = netTotalEarning - totalDiscount;
        const platformFee = Number(revenueData?.platform_fee_tax || 0);
        const gatewayFee = Number(revenueData?.payment_gateway_tax || 0);
        const organizerEarning = grossAmount;

        /* ================= COMMITTEE EARNING ================= */

        const committeeData = await OrderItems.findOne({
            where: {
                event_id: { [Op.in]: eventIds },
                committee_user_id: { [Op.ne]: null },
                status: "Y"
            },
            attributes: [
                [
                    fn(
                        "SUM",
                        literal(`
                        CAST(COALESCE(OrderItems.price,0) AS DECIMAL(10,2))
                        * CAST(COALESCE(committeeMembers.commission,0) AS DECIMAL(10,2))
                        / 100
                        `)
                    ),
                    "committee_earning"
                ]
            ],
            include: [
                {
                    model: CommitteeMembers,
                    as: "committeeMembers",
                    attributes: [],
                    required: true,
                    where: {
                        event_id: { [Op.in]: eventIds }
                    }
                }
            ],
            raw: true
        });

        const committeeFee = Number(committeeData?.committee_earning || 0);

        /* ================= SALES TRENDS ================= */

        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const salesRevenueTrend = await Orders.findAll({
            attributes: [
                [fn("DATE", col("created")), "date"],
                [fn("SUM", col("grand_total")), "revenue"]
            ],
            where: {
                event_id: { [Op.in]: eventIds },
                created: { [Op.gte]: last30Days }
            },
            group: [fn("DATE", col("created"))],
            order: [[fn("DATE", col("created")), "ASC"]],
            raw: true
        });

        const ticketsSoldTrend = await OrderItems.findAll({
            attributes: [
                [fn("DATE", col("createdAt")), "date"],
                [fn("SUM", col("count")), "tickets"]
            ],
            where: {
                event_id: { [Op.in]: eventIds },
                type: { [Op.in]: ["ticket", "ticket_price"] },
                createdAt: { [Op.gte]: last30Days }
            },
            group: [fn("DATE", col("createdAt"))],
            order: [[fn("DATE", col("createdAt")), "ASC"]],
            raw: true
        });

        const categories = salesRevenueTrend.map(item => item.date);
        const revenueSeries = salesRevenueTrend.map(item => Number(item.revenue || 0));
        const ticketsSeries = ticketsSoldTrend.map(item => Number(item.tickets || 0));

        /* ================= RUNNING EVENTS ================= */

        const runningEventsList = events.filter(event => {

            const startDate = new Date(event.date_from);
            const endDate = new Date(event.date_to);

            return (
                // event.status === "Y" &&
                startDate <= today &&
                endDate >= today
            );

        });

        /* ================= LIVE SALES PERFORMANCE ================= */

        const runningEventIds = runningEventsList.map(e => e.id);

        let liveSalesPerformance = [];

        if (runningEventIds.length) {

            const eventTickets = await TicketType.findAll({
                attributes: [
                    "eventid",
                    [fn("SUM", col("count")), "total_tickets"]
                ],
                where: {
                    eventid: { [Op.in]: runningEventIds }
                },
                group: ["eventid"],
                raw: true
            });

            const eventTicketsSold = await OrderItems.findAll({
                attributes: [
                    "event_id",
                    [fn("SUM", col("count")), "sold_tickets"]
                ],
                where: {
                    event_id: { [Op.in]: runningEventIds },
                    type: { [Op.in]: ["ticket", "ticket_price", 'committesale', 'comps'] }
                },
                group: ["event_id"],
                raw: true
            });

            const eventRevenue = await Orders.findAll({
                attributes: [
                    "event_id",
                    [fn("SUM", col("grand_total")), "revenue"]
                ],
                where: {
                    event_id: { [Op.in]: runningEventIds }
                },
                group: ["event_id"],
                raw: true
            });

            liveSalesPerformance = runningEventsList.map(event => {

                const ticketsData = eventTickets.find(t => t.eventid === event.id);
                const soldData = eventTicketsSold.find(t => t.event_id === event.id);
                const revenueData = eventRevenue.find(r => r.event_id === event.id);

                const totalTickets = Number(ticketsData?.total_tickets || 0);
                const soldTickets = Number(soldData?.sold_tickets || 0);
                const totalSoldTicketsPackage = soldTickets + totalSoldPackageTickets
                const revenue = Number(revenueData?.revenue || 0);

                const remaining = totalTickets - totalSoldTicketsPackage;

                const progress = totalTickets
                    ? Math.round((totalSoldTicketsPackage / totalTickets) * 100)
                    : 0;

                return {

                    event_id: event.id,
                    event_name: event.name,
                    event_date: event.date_from,

                    totalTickets,
                    soldTickets: totalSoldTicketsPackage,
                    remaining,
                    revenue,
                    progress

                };

            });

        }

        /* ================= SALES PROGRESS ================= */

        const runningEventIdsForProgress = runningEventsList.map(e => e.id);

        let salesProgress = {
            soldPercent: 0,
            soldTickets: 0,
            totalTickets: 0,
            soldRevenue: 0,
            potentialRevenue: 0
        };

        if (runningEventIdsForProgress.length) {

            const totalTicketsData = await TicketType.findOne({
                attributes: [
                    [fn("SUM", col("count")), "totalTickets"]
                ],
                where: {
                    eventid: { [Op.in]: runningEventIdsForProgress }
                },
                raw: true
            });

            const soldTicketsData = await OrderItems.findOne({
                attributes: [
                    [fn("SUM", col("count")), "soldTickets"]
                ],
                where: {
                    event_id: { [Op.in]: runningEventIdsForProgress },
                    type: { [Op.in]: ["ticket", "ticket_price", 'committesale', 'comps'] }
                },
                raw: true
            });

            const soldRevenueData = await Orders.findOne({
                attributes: [
                    [fn("SUM", col("grand_total")), "soldRevenue"]
                ],
                where: {
                    event_id: { [Op.in]: runningEventIdsForProgress }
                },
                raw: true
            });

            const totalTickets = Number(totalTicketsData?.totalTickets || 0);
            const soldTickets = Number(soldTicketsData?.soldTickets || 0);
            const soldRevenue = Number(soldRevenueData?.soldRevenue || 0);
            const totalSoldTicketsPackage = soldTickets + totalSoldPackageTickets

            const remainingTickets = totalTickets - totalSoldTicketsPackage;

            const soldPercent = totalTickets
                ? Math.round((totalSoldTicketsPackage / totalTickets) * 100)
                : 0;

            const avgTicketPrice = totalSoldTicketsPackage
                ? soldRevenue / totalSoldTicketsPackage
                : 0;

            const potentialRevenue = remainingTickets * avgTicketPrice;

            salesProgress = {
                soldPercent,
                soldTickets: totalSoldTicketsPackage,
                totalTickets,
                soldRevenue,
                potentialRevenue
            };
        }





        /* ================= HISTORICAL SALES REPORT ================= */

        const completedEventIds = events
            .filter(event => {
                const endDate = new Date(event.date_to);
                // return event.status === "Y" && endDate < today;
                return endDate < today;
            })
            .map(e => e.id);

        let historicalEvents = [];

        if (completedEventIds.length) {

            const eventTicketsSold = await OrderItems.findAll({
                attributes: [
                    "event_id",
                    [fn("SUM", col("count")), "tickets"]
                ],
                where: {
                    event_id: { [Op.in]: completedEventIds },
                    type: { [Op.in]: ["ticket", "ticket_price", 'committesale', 'comps'] }
                },
                group: ["event_id"],
                raw: true
            });

            const eventRevenue = await Orders.findAll({
                attributes: [
                    "event_id",
                    [fn("SUM", col("grand_total")), "revenue"],
                    [fn("SUM", col("platform_fee_tax")), "commission"],
                    [fn("SUM", col("payment_gateway_tax")), "payment_gateway_fee"]
                ],
                where: {
                    event_id: { [Op.in]: completedEventIds }
                },
                group: ["event_id"],
                raw: true
            });

            historicalEvents = events
                .filter(e => completedEventIds.includes(e.id))
                .map(event => {

                    const ticketsData = eventTicketsSold.find(t => t.event_id === event.id);
                    const revenueData = eventRevenue.find(r => r.event_id === event.id);

                    const tickets = Number(ticketsData?.tickets || 0);
                    const revenue = Number(revenueData?.revenue || 0);

                    const commission =
                        Number(revenueData?.commission || 0) +
                        Number(revenueData?.payment_gateway_fee || 0);

                    const net = revenue - commission;

                    return {
                        name: event.name,
                        date: event.date_from,
                        CurrencyName: event?.currencyName?.Currency_symbol,
                        tickets,
                        revenue,
                        commission,
                        net
                    };
                });
        }

        const historicalSummary = {
            totalTickets: historicalEvents.reduce((a, b) => a + b.tickets, 0),
            totalRevenue: historicalEvents.reduce((a, b) => a + b.revenue, 0),
            totalCommissions: historicalEvents.reduce((a, b) => a + b.commission, 0),
            netEarnings: historicalEvents.reduce((a, b) => a + b.net, 0)
        };
        /* ================= COMMITTEE PERFORMANCE ================= */

        let committeePerformance = [];

        let committeeSummary = {
            totalAssigned: 0,
            totalSold: 0,
            totalPaid: 0,
            conversionRate: 0,
            totalCommitteeEarning: 0,
            avgConversion: 0
        };

        if (eventIds.length) {

            const committeeRaw = await CommitteeMembers.findAll({
                where: {
                    event_id: { [Op.in]: eventIds },
                    status: "Y"
                },
                attributes: [
                    "user_id",

                    [fn("MAX", col("CommitteeMembers.commission")), "commission"],

                    [fn("MAX", col("user.first_name")), "first_name"],
                    [fn("MAX", col("user.last_name")), "last_name"],

                    [
                        fn(
                            "SUM",
                            literal(`CAST(order_items.price AS DECIMAL(10,2))`)
                        ),
                        "total_sales"
                    ],

                    [
                        fn(
                            "SUM",
                            literal(`
                        CAST(order_items.price AS DECIMAL(10,2))
                        * CAST(CommitteeMembers.commission AS DECIMAL(10,2))
                        / 100
                    `)
                        ),
                        "member_earning"
                    ],

                    [
                        fn("SUM", col("order_items.count")),
                        "tickets_sold"
                    ],

                    [
                        fn("SUM", col("assignedTickets.count")),
                        "assigned_tickets"
                    ]
                ],

                include: [
                    {
                        model: OrderItems,
                        attributes: [],
                        required: false,
                        as: "order_items",
                        where: {
                            event_id: { [Op.in]: eventIds },
                            status: "Y"
                        }
                    },

                    {
                        model: CommitteeAssignTickets,
                        attributes: [],
                        required: false,
                        as: "assignedTickets"
                    },

                    {
                        model: User,
                        attributes: [],
                        required: false,
                        as: "user"
                    }
                ],

                group: ["CommitteeMembers.user_id"],
                raw: true
            });

            committeePerformance = committeeRaw.map(item => {

                const totalSales = Number(item.total_sales || 0);
                const earning = Number(item.member_earning || 0);
                const soldTickets = Number(item.tickets_sold || 0);
                const assignedTickets = Number(item.assigned_tickets || 0);

                const conversion = assignedTickets
                    ? Math.round((soldTickets / assignedTickets) * 100)
                    : 0;

                return {
                    committee_user_id: item.user_id,
                    name: `${item.first_name || ""} ${item.last_name || ""}`,
                    commission_percentage: Number(item.commission || 0),
                    total_sales: totalSales,
                    soldTickets,
                    assignedTickets,
                    earning,
                    conversion
                };
            });

            const totalAssigned = committeePerformance.reduce(
                (a, b) => a + (b.assignedTickets || 0),
                0
            );

            const totalSold = committeePerformance.reduce(
                (a, b) => a + (b.soldTickets || 0),
                0
            );

            const totalPaid = committeePerformance.reduce(
                (a, b) => a + (b.earning || 0),
                0
            );

            const avgConversion = committeePerformance.length
                ? Math.round(
                    committeePerformance.reduce((a, b) => a + b.conversion, 0) /
                    committeePerformance.length
                )
                : 0;

            committeeSummary = {
                totalAssigned,
                totalSold,
                totalPaid,
                conversionRate: avgConversion,
                totalCommitteeEarning: totalPaid,
                avgConversion
            };
        }

        /* ================= RESPONSE ================= */

        /* ================= PER EVENT DATA ================= */

        const ticketsPerEvent = await TicketType.findAll({
            attributes: ["eventid", [fn("SUM", col("count")), "totalTickets"]],
            where: { eventid: { [Op.in]: eventIds } },
            group: ["eventid"],
            raw: true
        });

        const soldTicketsPerEvent = await OrderItems.findAll({
            attributes: ["event_id", [fn("SUM", col("count")), "soldTickets"]],
            where: {
                event_id: { [Op.in]: eventIds },
                type: { [Op.in]: ["ticket", "ticket_price", "committesale", "comps"] }
            },
            group: ["event_id"],
            raw: true
        });

        const addonsPerEvent = await AddonTypes.findAll({
            attributes: ["event_id", [fn("SUM", col("count")), "totalAddons"]],
            where: { event_id: { [Op.in]: eventIds } },
            group: ["event_id"],
            raw: true
        });

        const soldAddonsPerEvent = await OrderItems.findAll({
            attributes: ["event_id", [fn("SUM", col("count")), "soldAddons"]],
            where: {
                event_id: { [Op.in]: eventIds },
                type: "addon"
            },
            group: ["event_id"],
            raw: true
        });

        const packagePerEvent = await Package.findAll({
            attributes: ["event_id", [fn("SUM", col("total_package")), "totalPackages"]],
            where: { event_id: { [Op.in]: eventIds } },
            group: ["event_id"],
            raw: true
        });

        const soldPackagesPerEvent = await OrderItems.findAll({
            attributes: ["event_id", [fn("SUM", col("count")), "soldPackages"]],
            where: {
                event_id: { [Op.in]: eventIds },
                type: "package"
            },
            group: ["event_id"],
            raw: true
        });

        /* ================= PACKAGE DETAILS ================= */

        const packagesPerEvent = await Package.findAll({
            where: { event_id: { [Op.in]: eventIds } },
            include: {
                model: PackageDetails,
                as: "details",
                attributes: ["ticket_type_id", "addon_id", "qty"]
            },
            attributes: ["id", "event_id"]
        });

        const packagePerEventMap = {};

        packagesPerEvent.forEach(pkg => {
            let ticket = 0;
            let addon = 0;

            pkg.details.forEach(d => {
                if (d.ticket_type_id) ticket += Number(d.qty || 0);
                if (d.addon_id) addon += Number(d.qty || 0);
            });

            packagePerEventMap[pkg.id] = {
                event_id: pkg.event_id,
                ticket,
                addon
            };
        });

        const packagePerEventSales = await OrderItems.findAll({
            where: { event_id: { [Op.in]: eventIds }, type: "package" },
            attributes: [
                "package_id",
                [Sequelize.fn("SUM", Sequelize.col("count")), "sold"]
            ],
            group: ["package_id"],
            raw: true
        });

        const packageEventWise = {};

        packagePerEventSales.forEach(({ package_id, sold }) => {
            const pkg = packagePerEventMap[package_id];
            if (!pkg) return;

            const eventId = pkg.event_id;

            if (!packageEventWise[eventId]) {
                packageEventWise[eventId] = { tickets: 0, addons: 0 };
            }

            packageEventWise[eventId].tickets += sold * pkg.ticket;
            packageEventWise[eventId].addons += sold * pkg.addon;
        });

        /* ================= APPOINTMENTS ================= */

        const wellnessListPerEvent = await Wellness.findAll({
            where: { event_id: { [Op.in]: eventIds } },
            attributes: ["id", "event_id"],
            raw: true
        });

        const wellnessMap = Object.fromEntries(
            wellnessListPerEvent.map(w => [w.id, w.event_id])
        );

        let appointmentsCreatedPerEvent = [];

        if (Object.keys(wellnessMap).length > 0) {
            appointmentsCreatedPerEvent = await WellnessSlots.findAll({
                attributes: [
                    "wellness_id",
                    [fn("SUM", col("count")), "totalAppointments"]
                ],
                where: {
                    wellness_id: { [Op.in]: Object.keys(wellnessMap) }
                },
                group: ["wellness_id"],
                raw: true
            });
        }

        const appointmentEventWise = {};

        appointmentsCreatedPerEvent.forEach(a => {
            const eventId = wellnessMap[a.wellness_id];
            if (!eventId) return;

            appointmentEventWise[eventId] =
                (appointmentEventWise[eventId] || 0) +
                Number(a.totalAppointments || 0);
        });

        const appointmentsSoldPerEvent = await OrderItems.findAll({
            attributes: [
                "event_id",
                [fn("SUM", col("count")), "soldAppointments"]
            ],
            where: {
                event_id: { [Op.in]: eventIds },
                type: "appointment"
            },
            group: ["event_id"],
            raw: true
        });

        /* ================= REVENUE ================= */

        const revenuePerEvent = await Orders.findAll({
            attributes: [
                "event_id",
                [fn("SUM", col("grand_total")), "revenue"],
                [fn("SUM", col("sub_total")), "organizerEarning"],
                [fn("SUM", col("discount_amount")), "totalDiscount"],
                [fn("SUM", col("platform_fee_tax")), "totalPlatformFee"],
                [fn("SUM", col("payment_gateway_tax")), "totalPaymentGatewayFee"]
            ],
            where: { event_id: { [Op.in]: eventIds } },
            group: ["event_id"],
            raw: true
        });

        /* ================= PAYOUT ================= */

        const payoutPerEvent = await Payouts.findAll({
            attributes: [
                "event_id",
                [fn("SUM", col("paid_amount")), "totalPayout"]
            ],
            where: {
                event_id: { [Op.in]: eventIds },
                committee_id: { [Op.ne]: null }
            },
            group: ["event_id"],
            raw: true
        });

        const payoutMap = Object.fromEntries(
            payoutPerEvent.map(p => [
                p.event_id,
                Number(p.totalPayout || 0)
            ])
        );

        /* ================= MAPS ================= */

        const makeMap = (arr, key) =>
            Object.fromEntries(arr.map(i => [i[key], i]));

        const ticketsMap = makeMap(ticketsPerEvent, "eventid");
        const soldTicketsMap = makeMap(soldTicketsPerEvent, "event_id");
        const addonsMap = makeMap(addonsPerEvent, "event_id");
        const soldAddonsMap = makeMap(soldAddonsPerEvent, "event_id");
        const pkgMap = makeMap(packagePerEvent, "event_id");
        const soldPkgMap = makeMap(soldPackagesPerEvent, "event_id");
        const revenueMap = makeMap(revenuePerEvent, "event_id");
        const soldAppMap = makeMap(appointmentsSoldPerEvent, "event_id");

        /* ================= FINAL MERGE ================= */

        const updatedEvents = events.map(event => {

            const id = event.id;
            const pkgData = packageEventWise[id] || { tickets: 0, addons: 0 };
            const revenue = revenueMap[id] || {};

            return {
                ...event.toJSON(),

                totalTickets: Number(ticketsMap[id]?.totalTickets || 0),

                soldTickets:
                    Number(soldTicketsMap[id]?.soldTickets || 0) +
                    pkgData.tickets,

                totalAddons: Number(addonsMap[id]?.totalAddons || 0),

                soldAddons:
                    Number(soldAddonsMap[id]?.soldAddons || 0) +
                    pkgData.addons,

                totalPackages: Number(pkgMap[id]?.totalPackages || 0),
                soldPackages: Number(soldPkgMap[id]?.soldPackages || 0),

                totalAppointments: Number(appointmentEventWise[id] || 0),
                soldAppointments: Number(soldAppMap[id]?.soldAppointments || 0),

                revenue: Number(revenue?.revenue || 0),

                organizerEarning:
                    Number(revenue?.organizerEarning || 0) -
                    Number(revenue?.totalDiscount || 0),

                PlatformFee: Number(revenue?.totalPlatformFee || 0),
                PaymentGatewayFee: Number(revenue?.totalPaymentGatewayFee || 0),

                totalPayout: payoutMap[id] || 0
            };
        });



        return res.json({
            success: true,
            message: "Event dashboard data fetched successfully",
            data: {
                // events,
                events: updatedEvents,
                summary: {
                    total_events: totalEvents,
                    running_events: runningEvents,
                    completed_events: completedEvents,
                    totalTicketsCreated: totalTicketsCreated || 0,
                    totalTicketsSold: totalTicketsSold || 0,
                    totalRevenue,
                    organizerEarning,
                    totalAddonsCreated: totalAddonsCreated || 0,
                    totalAddonsSold: totalAddonsSold || 0,
                    totalPackagesCreated: totalPackagesCreated || 0,
                    totalPackagesSold: totalPackagesSold || 0,
                    totalAppointmentsCreated: totalAppointmentsCreated || 0,
                    totalAppointmentsSold: totalAppointmentsSold || 0,
                    totalSoldPackageAddons: totalSoldPackageAddons || 0,
                    totalSoldPackageTickets: totalSoldPackageTickets || 0,
                },

                salesTrend: {
                    categories,
                    series: [
                        {
                            name: "Tickets Sold",
                            data: ticketsSeries
                        },
                        {
                            name: "Revenue",
                            data: revenueSeries
                        }
                    ]
                },

                revenueDistribution: {
                    organizerEarning,
                    platformFee,
                    committeeFee,
                    gatewayFee
                },

                liveSalesPerformance,

                salesProgress,

                historicalSalesReport: {
                    summary: historicalSummary,
                    events: historicalEvents
                },
                committeePerformance: {
                    summary: committeeSummary,
                    members: committeePerformance
                }

            }
        });

    } catch (error) {

        console.log("Event Dashboard Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });

    }
};




exports.OrganizersAllEvents = async (req, res) => {
    try {
        const org_id = req?.user?.id;
        if (!org_id) {
            return res.status(400).json({
                success: false,
                message: "Organizer ID not found"
            });
        }
        /* ================= EVENTS ================= */
        const events = await Event.findAll({
            where: { event_org_id: org_id },
            attributes: ["id", "name", "status"],
            order: [["created", "DESC"]]
        });
        return res.json({
            success: true,
            message: "Events dashboard data fetched successfully",
            data: events,
        });

    } catch (error) {

        console.log("Event Dashboard Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });

    }
};