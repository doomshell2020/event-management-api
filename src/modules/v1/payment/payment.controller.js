const Stripe = require("stripe");
const { Payment, PaymentSnapshotItems } = require("../../../models");
const apiResponse = require("../../../common/utils/apiResponse");
const config = require("../../../config/app");

// Initialize Stripe
const stripe = new Stripe(config.stripeKey, {
  apiVersion: "2024-06-20",
});

// -------------------------------------------------------------
//                     CREATE PAYMENT INTENT
// -------------------------------------------------------------
exports.createPaymentIntent = async (req, res) => {
  try {
    const { user_id, event_id, discount, tax, total_amount, cartData, currency = "inr" } = req.body;

    if (!user_id || !event_id || !total_amount || !cartData || cartData.length == 0) {
      return apiResponse.error(res, "Missing required fields");
    }

    // ----------------------------
    // 1️⃣ Create snapshot rows for all cart items
    // ----------------------------
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
    
    console.log('snapshotRows :', snapshotRows);
    // Collect snapshot IDs for Stripe metadata
    const snapshotIds = snapshotRows.map(r => r.id).join(',');
    // return snapshotIds;

    // ----------------------------
    // 2️⃣ Create Stripe PaymentIntent
    // ----------------------------
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total_amount * 100, // convert to paise
      currency,
      metadata: {
        user_id: String(user_id),
        event_id: String(event_id),
        total_amount: String(total_amount),
        tax: String(tax || 0),
        discount: String(discount || 0),
        snapshot_ids: snapshotIds, // link all snapshot rows
      },
    });

    return apiResponse.success(res, "Payment Intent Created Successfully", {
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    return apiResponse.error(res, "Stripe Error", error.message);
  }
};

// -------------------------------------------------------------
//                         STRIPE WEBHOOK
// -------------------------------------------------------------
exports.stripeWebhook = async (req, res) => {
  let event;

  try {
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.stripeWebhookSecret
    );
  } catch (err) {
    console.error("❌ Webhook Signature Verification Failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const pi = event.data.object;
  const snapshotIds = pi.metadata.snapshot_ids.split(',');

  // Fetch snapshot items for summary
  const snapshotItems = await PaymentSnapshotItems.findAll({
    where: { id: snapshotIds }
  });

  // Calculate total amount
  const totalAmount = snapshotItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const orderItems = snapshotItems.map(item => ({
    ticket_id: item.ticket_id,
    item_type: item.item_type,
    quantity: item.quantity,
    price: item.price
  }));

  // ----------------------------
  // PAYMENT SUCCESS
  // ----------------------------
  if (event.type === "payment_intent.succeeded") {
    await PaymentSnapshotItems.update(
      { payment_status: "paid", payment_intent_id: pi.id },
      { where: { id: snapshotIds } }
    );

    await Payment.create({
      user_id: pi.metadata.user_id,
      event_id: pi.metadata.event_id,
      amount: totalAmount,
      payment_intent: pi.id,
      payment_status: "paid",
      order_items: orderItems
    });

    console.log("✔ Payment saved successfully for snapshot items and Payment table");
  }

  // ----------------------------
  // PAYMENT FAILED
  // ----------------------------
  if (event.type === "payment_intent.payment_failed") {
    await PaymentSnapshotItems.update(
      { payment_status: "failed", payment_intent_id: pi.id },
      { where: { id: snapshotIds } }
    );

    await Payment.create({
      user_id: pi.metadata.user_id,
      event_id: pi.metadata.event_id,
      amount: totalAmount,
      payment_intent: pi.id,
      payment_status: "failed",
      order_items: orderItems
    });

    console.log("❌ Payment failed for snapshot items and Payment table");
  }

  return res.json({ received: true });
};
