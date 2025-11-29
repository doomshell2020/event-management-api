const crypto = require("crypto");
const config = require("../../config/app");
const { OrderItems } = require("../../models");

exports.verifyQRCode = async (req, res) => {
    try {
        const { qrData } = req.body;  // entire JSON parsed after scan

        if (!qrData || !qrData.order_item_id || !qrData.hash) {
            return res.status(400).json({ success: false, message: "Invalid QR data" });
        }

        // Recompute hash
        const recomputedHash = crypto
            .createHash("sha256")
            .update(qrData.order_item_id + config.security.qrSecretV1)
            .digest("hex");

        // Check if QR is tampered
        if (recomputedHash !== qrData.hash) {
            return res.status(400).json({
                success: false,
                message: "QR Code is NOT valid (Tampered / Fake)"
            });
        }

        // Proceed: Fetch ticket, validate status etc.
        const ticket = await OrderItems.findByPk(qrData.order_item_id);

        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        return res.json({
            success: true,
            message: "QR Code Verified Successfully",
            data: ticket
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server Error" });
    }
};
