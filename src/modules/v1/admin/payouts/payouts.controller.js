const {
  Payment,
  Payouts,
  OrderItems,
  TicketType,
  AddonTypes,
  Package,
  Event,
  User
} = require("../../../../models");

const apiResponse = require("../../../../common/utils/apiResponse");
const { Op, fn, col } = require("sequelize");
const sequelize = require("../../../../models").sequelize;

/* ==========   CREATE PAYOUT (ADMIN → ORGANIZER)   ========== */
exports.createPayout = async (req, res) => {
  const transaction = await sequelize.transaction();
  const authId = req.user.id;

  try {
    const {
      user_id,
      event_id,
      paid_amount,
      txn_ref,
      remarks
    } = req.body;

    /* ---------- BASIC VALIDATION ---------- */
    if (Number(paid_amount) <= 0) {
      return apiResponse.validationError(res, "Paid amount must be greater than 0");
    }

    /* ---------- OPTIONAL: CHECK EVENT & USER ---------- */
    const eventExists = await Event.findByPk(event_id);
    if (!eventExists) {
      return apiResponse.notFound(res, "Event not found");
    }

    const userExists = await User.findByPk(user_id);
    if (!userExists) {
      return apiResponse.notFound(res, "User not found");
    }

    /* ---------- CREATE PAYOUT ENTRY ---------- */
    const payout = await Payouts.create(
      {
        user_id,
        event_id,
        paid_amount,
        txn_ref,
        remarks,
        created_by: authId
      },
      { transaction }
    );

    await transaction.commit();

    return apiResponse.success(res, "Payout created successfully", payout);

  } catch (error) {
    await transaction.rollback();
    console.error("Create payout error:", error);

    return apiResponse.error(res, "Failed to create payout");
  }
};

/* ==========   LIST PAYOUTS (ADMIN)   ============ */
exports.listPayouts = async (req, res) => {
  try {
    const { event_id, user_id, from, to } = req.query;

    const where = {};

    if (event_id) where.event_id = event_id;
    if (user_id) where.user_id = user_id;

    if (from && to) {
      where.createdAt = {
        [Op.between]: [from, to]
      };
    }

    const payouts = await Payouts.findAll({
      where,
      include: [
        {
          model: Event,
          as: "event",
          attributes: ["id", "name"]
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "first_name", "last_name", "email"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    return apiResponse.success(res, "Payout list fetched", payouts);

  } catch (error) {
    console.error("List payouts error:", error);
    return apiResponse.error(res, "Failed to fetch payouts");
  }
};

/* ===========   EVENT PAYOUT SUMMARY (DERIVED – NOT STORED)   ============= */
exports.eventPayoutSummary = async (req, res) => {
  try {
    const { event_id } = req.params;

    /* ---------- TOTAL SALES FROM PAYMENTS ---------- */
    const totalSales = await Payment.sum("amount", {
      include: [
        {
          model: OrderItems,
          required: true,
          where: { event_id }
        }
      ]
    });

    /* ---------- TOTAL PAID FROM PAYOUTS ---------- */
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
