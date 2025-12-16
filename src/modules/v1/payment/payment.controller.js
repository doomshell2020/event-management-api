const Stripe = require("stripe");
const { Payment, PaymentSnapshotItems } = require("../../../models");
const apiResponse = require("../../../common/utils/apiResponse");
const config = require("../../../config/app");

const stripe = new Stripe(config.stripeKey, {
  apiVersion: "2024-06-20",
});

// -------------------------------------------------------------
// CREATE PAYMENT INTENT
// -------------------------------------------------------------
exports.createPaymentIntent = async (req, res) => {
  try {
    const {
      user_id,
      event_id,
      discount = 0,
      tax = 0,
      total_amount,
      cartData,
      currency = "usd"
    } = req.body;

    if (!user_id || !event_id || !total_amount || !cartData?.length) {
      return apiResponse.error(res, "Missing required fields");
    }

    // 1️⃣ Create snapshot rows
    const snapshotRows = await PaymentSnapshotItems.bulkCreate(
      cartData.map(item => ({
        user_id,
        event_id,
        ticket_id: item.ticketId,
        item_type: item.ticketType,
        quantity: item.quantity || 1,
        price: item.price || 0,
        payment_status: "pending",
      }))
    );

    const snapshotIds = snapshotRows.map(r => r.id).join(",");

    // 2️⃣ Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total_amount * 100), // cents/paise
      currency,
      metadata: {
        user_id: String(user_id),
        event_id: String(event_id),
        tax: String(tax),
        discount: String(discount),
        snapshot_ids: snapshotIds,
      },
    });

    return apiResponse.success(res, "Payment Intent Created", {
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error("Stripe Error:", error);
    return apiResponse.error(res, error.message);
  }
};

// -------------------------------------------------------------
// STRIPE WEBHOOK
// -------------------------------------------------------------
exports.stripeWebhook = async (req, res) => {
  console.log("🔥 WEBHOOK HIT");
  let event;
  console.log("✅ STRIPE EVENT TYPE:", event.type);
  try {
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.stripeWebhookSecret
    );
  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error`);
  }

  // ----------------------------
  // PAYMENT SUCCESS
  // ----------------------------
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;

    const snapshotIds = pi.metadata.snapshot_ids
      .split(",")
      .map(id => Number(id));

    // Update snapshots
    await PaymentSnapshotItems.update(
      { payment_status: "paid", payment_intent_id: pi.id },
      { where: { id: snapshotIds } }
    );

    const snapshotItems = await PaymentSnapshotItems.findAll({
      where: { id: snapshotIds }
    });

    const totalAmount = snapshotItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    await Payment.create({
      user_id: pi.metadata.user_id,
      event_id: pi.metadata.event_id,
      amount: totalAmount,
      payment_intent: pi.id,
      payment_status: "paid",
      order_items: snapshotItems
    });

    console.log("✅ Payment saved successfully");
  }

  // ----------------------------
  // PAYMENT FAILED
  // ----------------------------
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;

    const snapshotIds = pi.metadata.snapshot_ids
      .split(",")
      .map(id => Number(id));

    await PaymentSnapshotItems.update(
      { payment_status: "failed", payment_intent_id: pi.id },
      { where: { id: snapshotIds } }
    );

    console.log("❌ Payment failed");
  }

  return res.json({ received: true });
};
