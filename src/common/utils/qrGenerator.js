const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const config = require("../../config/app");

exports.generateQRCode = async (orderItem) => {
    try {
        // Generate secure hash
        const secureHash = crypto
            .createHash("sha256")
            .update(orderItem.id + config.security.qrSecretV1)
            .digest("hex");

        // Data included inside QR
        const qrData = {
            order_item_id: orderItem.id,
            order_id: orderItem.order_id,
            user_id: orderItem.user_id,
            event_id: orderItem.event_id,
            type: orderItem.type,
            ticket_id: orderItem.ticket_id,
            ticket_pricing_id: orderItem.ticket_pricing_id,
            slot_id: orderItem.slot_id,
            scannable_code: `EVT${orderItem.event_id}-ITEM${orderItem.id}`,
            hash: secureHash
        };

        const qrText = JSON.stringify(qrData);
        // Create uploads folder if not exists
        const qrFolder = path.join(__dirname, "../../../uploads/qr_codes");
        if (!fs.existsSync(qrFolder)) {
            fs.mkdirSync(qrFolder, { recursive: true });
        }
        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = crypto.randomBytes(3).toString("hex"); // 6 chars
        const fileName = `qr_${orderItem.id}_${timestamp}_${randomStr}.png`;
        const filePath = path.join(qrFolder, fileName);
        // Generate QR file
        await QRCode.toFile(filePath, qrText || "{}");

        return {
            qrImageName: fileName,     // ✔ store ONLY this in DB (qr_image)
            qrData,
            secureHash
        };

    } catch (err) {
        console.log("QR ERROR:", err);
        return null;
    }
};