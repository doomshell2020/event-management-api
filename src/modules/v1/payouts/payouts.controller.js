const {
  Payment,
  Payouts,
  Orders,
  OrderItems,
  TicketType,
  AddonTypes,
  Package,
  Event,
  User,
  Currency
} = require("../../../models");

const apiResponse = require("../../../common/utils/apiResponse");
const { Op, fn, col } = require("sequelize");
const sequelize = require("../../../models").sequelize;

const getEventsList = async (eventOrgId) => {
  return await Event.findAll({
    attributes: ["id", "name"],
    order: [["name", "ASC"]],
    where: {
      is_free: 'N',
      event_org_id: eventOrgId   // ✅ IMPORTANT
    }
  });
};

const getEventTotalSalesMap = async (eventOrgId) => {
  const rows = await Orders.findAll({
    attributes: [
      "event_id",
      [fn("SUM", col("grand_total")), "total_sale"]
    ],
    include: [
      {
        model: Event,
        as: "event",
        attributes: [],
        where: {
          event_org_id: eventOrgId,
          is_free: "N"
        }
      }
    ],
    group: ["event_id"],
    raw: true
  });

  // Convert to map → { event_id: total_sale }
  const saleMap = {};
  rows.forEach(row => {
    saleMap[row.event_id] = Number(row.total_sale || 0);
  });

  return saleMap;
};

exports.listPayouts = async (req, res) => {
  try {
    const { event_id, from, to } = req.query;
    const authId = req.user.id;

    /* ---------- PAYOUT WHERE ---------- */
    const payoutWhere = {};

    if (event_id) {
      payoutWhere.event_id = event_id;
    }

    if (from && to) {
      payoutWhere.createdAt = {
        [Op.between]: [from, to]
      };
    }

    /* ---------- EVENT WHERE ---------- */
    const eventWhere = {
      event_org_id: authId
    };

    if (event_id) {
      eventWhere.id = event_id;
    }

    /* ---------- FETCH PAYOUTS ---------- */
    const payouts = await Payouts.findAll({
      where: payoutWhere,
      include: [
        {
          model: Event,
          as: "event",
          where: eventWhere,
          attributes: ["id", "name"],
          include: [
            {
              model: User,
              as: "Organizer",
              attributes: ["id", "email", "first_name", "last_name"]
            },
            {
              model: Currency,
              as: "currencyName",
              attributes: ["Currency_symbol"]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    /* ---------- TOTAL SALES ---------- */
    const totalSalesMap = await getEventTotalSalesMap(authId);

    /* ---------- EVENTS DROPDOWN ---------- */
    const events = await getEventsList(authId);

    return apiResponse.success(res, "Payout list fetched", {
      payouts,
      events,
      totalSales: totalSalesMap   // ✅ NEW
    });

  } catch (error) {
    console.error("List payouts error:", error);
    return apiResponse.error(res, "Failed to fetch payouts");
  }
};
