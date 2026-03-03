const apiResponse = require('../../../common/utils/apiResponse');
const { Orders, TicketType, CommitteeMembers, AddonTypes, TicketPricing, Package, EventSlots, OrderItems, Event, WellnessSlots, Wellness, User, Currency, } = require('../../../models');
const { Op, fn, col, literal } = require("sequelize");

// 📌 Get Single Order Details

exports.getEventDetails = async (req, res) => {
    try {
        const { event_id } = req.params;

        // 1️⃣ Event basic info
        const eventInfo = await Event.findOne({
            where: { id: event_id },
            attributes: ['id', 'event_org_id', 'name'],
            include: { model: Currency, as: "currencyName", attributes: ['Currency_symbol', 'Currency'] }
        });

        if (!eventInfo) {
            return apiResponse.error(res, "Event not found", 404);
        }

        // Total tickets created
        const totalTicketsCreated = await TicketType.count({
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

        //  Revenue & earnings
        const revenueData = await Orders.findOne({
            where: { event_id },
            attributes: [
                [fn("SUM", col("grand_total")), "total_revenue"],
                [fn("SUM", col("sub_total")), "gross_amount"],
                [fn("SUM", col("platform_fee_tax")), "platform_fee_tax"],
                [fn("SUM", col("payment_gateway_tax")), "payment_gateway_tax"]
            ],
            raw: true
        });
        const totalRevenue = Number(revenueData.total_revenue || 0);
        const netEarning = Number(revenueData.gross_amount || 0);

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
                    required: true
                }
            ],
            raw: true
        });

        const committeeEarning = Number(committeeData.committee_earning || 0);
        const platformData = await Orders.findOne({
            where: { event_id },
            attributes: [
                [fn("SUM", col("platform_fee_tax")), "platform_earning"]
            ],
            raw: true
        });

        const platformEarning = Number(platformData.platform_earning || 0);

        const totalDistributed = totalRevenue
        const commissionSplit = {
            organizer: totalDistributed
                ? ((netEarning / totalDistributed) * 100).toFixed(2)
                : 0,
            platform: totalDistributed
                ? ((platformEarning / totalDistributed) * 100).toFixed(2)
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
        // Total tickets created
        const totalTickets = await TicketType.count({
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
        const totalAddons = await AddonTypes.count({
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

        // ✅ Total earning directly members se nikaalo
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
                    netEarning
                },
                revenueDistribution: {
                    organizer: netEarning,
                    platform: platformEarning,
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

