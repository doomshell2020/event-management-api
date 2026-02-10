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
} = require("../../../../models");

const apiResponse = require("../../../../common/utils/apiResponse");
const { Op, fn, col } = require("sequelize");
const sequelize = require("../../../../models").sequelize;

const getEventsList = async () => {
  return await Event.findAll({
    attributes: ["id", "name"],
    order: [["name", "ASC"]],
    // where: {
    //   is_free: 'N'
    // }
  });
};


/* ==========   CREATE PAYOUT (ADMIN → ORGANIZER)   ========== */

exports.createPayout = async (req, res) => {
  const transaction = await sequelize.transaction();
  const authId = req.user.id;

  try {
    const { event_id, paid_amount, txn_ref, remarks } = req.body;

    if (Number(paid_amount) <= 0) {
      return apiResponse.validation(res, "Paid amount must be greater than 0");
    }

    const eventExists = await Event.findByPk(event_id);
    if (!eventExists) {
      return apiResponse.notFound(res, "Event not found");
    }

    /* -------- TOTAL ORDER SALES -------- */
    const orderSummary = await Orders.findOne({
      attributes: [[fn('SUM', col('grand_total')), 'total_sales']],
      where: { event_id },
      raw: true
    });

    const totalSales = Number(orderSummary?.total_sales || 0);

    /* -------- TOTAL PAID PAYOUTS -------- */
    const payoutSummary = await Payouts.findOne({
      attributes: [[fn('SUM', col('paid_amount')), 'total_paid']],
      where: { event_id },
      raw: true
    });

    const totalPaid = Number(payoutSummary?.total_paid || 0);

    const remainingAmount = totalSales - totalPaid;

    if (Number(paid_amount) > remainingAmount) {
      return apiResponse.validation(
        res,
        `Payout amount exceeds remaining balance. Remaining amount is ${remainingAmount}`
      );
    }

    /* -------- CREATE PAYOUT -------- */
    await Payouts.create(
      {
        event_id,
        paid_amount,
        txn_ref,
        remarks,
        created_by: authId
      },
      { transaction }
    );

    await transaction.commit();

    const payouts = await Payouts.findAll({
      include: [{ model: Event, as: "event", attributes: ["id", "name"] }],
      order: [["createdAt", "DESC"]]
    });

    const events = await getEventsList();

    return apiResponse.success(res, "Payout created successfully", {
      payouts,
      events
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Create payout error:", error);
    return apiResponse.error(res, "Failed to create payout");
  }
};



// exports.createPayout = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   const authId = req.user.id;

//   try {
//     const {
//       event_id,
//       paid_amount,
//       txn_ref,
//       remarks
//     } = req.body;

//     if (Number(paid_amount) <= 0) {
//       return apiResponse.validationError(res, "Paid amount must be greater than 0");
//     }

//     const eventExists = await Event.findByPk(event_id);
//     if (!eventExists) {
//       return apiResponse.notFound(res, "Event not found");
//     }

//     await Payouts.create(
//       {
//         event_id,
//         paid_amount,
//         txn_ref,
//         remarks,
//         created_by: authId
//       },
//       { transaction }
//     );

//     await transaction.commit();

//     /* ---------- FETCH UPDATED DATA ---------- */
//     const payouts = await Payouts.findAll({
//       include: [
//         {
//           model: Event,
//           as: "event",
//           attributes: ["id", "name"]
//         }
//       ],
//       order: [["createdAt", "DESC"]]
//     });

//     const events = await getEventsList();

//     return apiResponse.success(res, "Payout created successfully", {
//       payouts,
//       events
//     });

//   } catch (error) {
//     await transaction.rollback();
//     console.error("Create payout error:", error);
//     return apiResponse.error(res, "Failed to create payout");
//   }
// };


/* ==========   LIST PAYOUTS (ADMIN)   ============ */
exports.listPayouts = async (req, res) => {
  try {
    const { event_id, from, to } = req.query;

    const where = {};

    if (event_id) where.event_id = event_id;

    if (from && to) {
      where.createdAt = {
        [Op.between]: [from, to]
      };
    }

    // console.log('where :', where);
    const payouts = await Payouts.findAll({
      where,
      include: [
        {
          model: Event,
          as: "event",
          attributes: ["id", "name"],
          include: [{ model: User, attributes: ['id', 'email', 'first_name', 'last_name'], as: "Organizer" },
          {
            model: Currency,
            as: "currencyName",
            attributes: ['Currency_symbol']
          }]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const events = await getEventsList();

    return apiResponse.success(res, "Payout list fetched", {
      payouts,
      events
    });

  } catch (error) {
    console.error("List payouts error:", error);
    return apiResponse.error(res, "Failed to fetch payouts");
  }
};


/* ===========   EVENT PAYOUT SUMMARY (DERIVED – NOT STORED)   ============= */
exports.eventPayoutSummary = async (req, res) => {
  try {
    const { event_id } = req.params;

    const totalSales = await Payment.sum("amount", {
      include: [
        {
          model: OrderItems,
          required: true,
          where: { event_id }
        }
      ]
    });

    const totalPaid = await Payouts.sum("paid_amount", {
      where: { event_id }
    });

    const sales = Number(totalSales || 0);
    const paid = Number(totalPaid || 0);

    return apiResponse.success(res, "Event payout summary", {
      event_id,
      total_sales: sales,
      total_paid: paid,
      balance: sales - paid
    });

  } catch (error) {
    console.error("Payout summary error:", error);
    return apiResponse.error(res, "Failed to fetch payout summary");
  }
};

/* ==========   EVENT SALES + ORDERS (DERIVED)   ========== */
exports.eventSalesWithOrders = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { from, to } = req.query;

    /* ---------- EVENT CHECK ---------- */
    const event = await Event.findByPk(event_id, {
      attributes: ['id', 'name']
    });

    if (!event) {
      return apiResponse.notFound(res, "Event not found");
    }

    /* ---------- DATE FILTER ---------- */
    const orderWhere = { event_id };

    if (from && to) {
      orderWhere.createdAt = {
        [Op.between]: [from, to]
      };
    }

    /* ---------- ORDER LIST ---------- */
    const orders = await Payment.findAll({
      include: [
        {
          model: OrderItems,
          required: true,
          where: orderWhere,
          attributes: ['id', 'event_id']
        },
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: [
        'id',
        'amount',
        'payment_status',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    /* ---------- TOTAL SALES ---------- */
    const totalSales = orders.reduce(
      (sum, o) => sum + Number(o.amount || 0),
      0
    );

    /* ---------- TOTAL TICKETS ---------- */
    const totalTickets = await OrderItems.sum('count', {
      where: orderWhere
    });

    return apiResponse.success(res, "Event sales & orders fetched", {
      event,
      summary: {
        total_sales: totalSales,
        total_orders: orders.length,
        total_tickets: Number(totalTickets || 0)
      },
      orders: orders.map(o => ({
        order_id: o.id,
        buyer: o.User,
        amount: o.amount,
        status: o.payment_status,
        date: o.createdAt
      }))
    });

  } catch (error) {
    console.error("Event sales error:", error);
    return apiResponse.error(res, "Failed to fetch event sales");
  }
};

/* ==========   ALL EVENTS SALES SUMMARY   ========== */
exports.allEventsSalesSummary = async (req, res) => {
  try {
    /* ---------- GET ALL EVENTS ---------- */
    const events = await Event.findAll({
      attributes: ['id', 'name'],
      include: [{ model: User, attributes: ['id', 'email', 'first_name', 'last_name'], as: "Organizer" },
      {
        model: Currency,
        as: "currencyName",
        attributes: ['Currency_symbol']
      }
      ],
      order: [["id", "DESC"]]
    });

    /* ---------- SALES FROM ORDERS ---------- */
    const ordersSummary = await Orders.findAll({
      attributes: [
        'event_id',
        [fn('SUM', col('grand_total')), 'total_sales'],
        [fn('COUNT', col('Orders.id')), 'total_orders']
      ],
      group: ['event_id']
    });

    /* ---------- TICKETS FROM ORDER ITEMS ---------- */
    const ticketsSummary = await OrderItems.findAll({
      attributes: [
        [col('order.event_id'), 'event_id'],
        [fn('SUM', col('count')), 'total_tickets']
      ],
      include: [
        {
          model: Orders,
          as: "order",
          attributes: []
        }
      ],
      group: ['order.event_id']
    });

    /* ---------- PAID FROM PAYOUTS ---------- */
    const payoutsSummary = await Payouts.findAll({
      attributes: [
        'event_id',
        [fn('SUM', col('paid_amount')), 'total_paid']
      ],
      group: ['event_id']
    });

    /* ---------- MAP SALES ---------- */
    const salesMap = {};
    ordersSummary.forEach(o => {
      salesMap[o.event_id] = {
        total_sales: Number(o.get('total_sales') || 0),
        total_orders: Number(o.get('total_orders') || 0)
      };
    });

    /* ---------- MAP TICKETS ---------- */
    const ticketMap = {};
    ticketsSummary.forEach(t => {
      ticketMap[t.get('event_id')] = Number(t.get('total_tickets') || 0);
    });

    /* ---------- MAP PAYOUTS ---------- */
    const payoutMap = {};
    payoutsSummary.forEach(p => {
      payoutMap[p.event_id] = Number(p.get('total_paid') || 0);
    });

    /* ---------- FINAL RESPONSE ---------- */
    const result = events
      .map(event => {
        const sales = salesMap[event.id] || { total_sales: 0, total_orders: 0 };
        const tickets = ticketMap[event.id] || 0;
        const paid = payoutMap[event.id] || 0;

        const organizer = event.Organizer;
        const currency = event.currencyName;

        return {
          event_id: event.id,
          event_name: event.name,

          organizer_id: organizer?.id || null,
          organizer_name: organizer
            ? `${organizer.first_name} ${organizer.last_name}`
            : "-",
          organizer_email: organizer?.email || "-",

          currency_symbol: currency?.Currency_symbol || "₹",

          total_orders: sales.total_orders,
          total_tickets: tickets,
          total_sales: sales.total_sales,
          total_paid: paid,
          balance: sales.total_sales - paid
        };
      })
      // ✅ FILTER ONLY EVENTS WITH SALES > 0
      .filter(event => event.total_sales > 0);



    return apiResponse.success(
      res,
      "All events sales summary",
      result
    );

  } catch (error) {
    console.error("All events sales error:", error);
    return apiResponse.error(res, "Failed to fetch events sales");
  }
};