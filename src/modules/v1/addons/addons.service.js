const { AddonTypes, Event, OrderItems, PackageDetails, Package } = require('../../../models');
const { Op, Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { fn, col, literal } = require("sequelize");

module.exports.createAddons = async (req) => {
    try {
        const { event_id, name, price, hidden, count, description } = req.body;
        const user_id = req.user?.id || null;
        const addonImage = req.file?.filename || null;

        // ✅ Validate required fields
        if (!event_id || !name || !price || !count) {
            return {
                success: false,
                message: 'Please fill all required fields',
                code: 'VALIDATION_FAILED'
            };
        }

        // ✅ Check if associated event exists
        const eventExists = await Event.findByPk(event_id);
        if (!eventExists) {
            return {
                success: false,
                message: 'Associated event not found',
                code: 'EVENT_NOT_FOUND'
            };
        }

        // ✅ Check for duplicate addon name for same event
        const existingAddon = await AddonTypes.findOne({
            where: { event_id: event_id, name: name.trim() }
        });

        if (existingAddon) {
            return {
                success: false,
                message: 'An addon with this name already exists for this event',
                code: 'DUPLICATE_TICKET'
            };
        }

        // ✅ Validate image extension only if uploaded
        if (addonImage) {
            const allowedExt = ['png', 'jpg', 'jpeg'];
            const ext = addonImage.split('.').pop().toLowerCase();
            if (!allowedExt.includes(ext)) {
                return {
                    success: false,
                    message: 'Invalid image type. Only JPG, PNG, and JPEG allowed.',
                    code: 'VALIDATION_FAILED'
                };
            }
        }

        // ✅ Create addon
        const newAddon = await AddonTypes.create({
            event_id: event_id,
            name: name.trim(),
            addon_image: addonImage,
            description: description?.trim() || '',
            price: parseFloat(price) || 0,
            count: parseInt(count) || 0,
            hidden: hidden == 'Y' ? 'Y' : 'N',
            created_by: user_id,
            status: 'N',
        });

        return {
            success: true,
            message: 'Addon created successfully',
            data: newAddon
        };

    } catch (error) {
        console.error('Error creating Addon:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};

module.exports.updateAddons = async (req) => {
    try {
        const addonId = req.params.id;
        const { name, price, hidden, count, description } = req.body;
        const addonImage = req.file?.filename || null;
        const user_id = req.user?.id || null;

        // ✅ Check if addon exists
        const existingAddon = await AddonTypes.findByPk(addonId);
        if (!existingAddon) {
            return {
                success: false,
                message: 'Addon not found',
                code: 'NOT_FOUND'
            };
        }

        // ✅ If event_id provided, verify event exists
        if (existingAddon.event_id) {
            const eventExists = await Event.findByPk(existingAddon.event_id);
            if (!eventExists) {
                return {
                    success: false,
                    message: 'Associated event not found',
                    code: 'VALIDATION_FAILED'
                };
            }
        }

        // ✅ Check duplicate addon name (only if name changed)

        if (name && name.trim() !== existingAddon.name) {
            const duplicate = await AddonTypes.findOne({
                where: {
                    event_id: existingAddon.event_id,
                    name: name.trim(),
                    id: { [Op.ne]: parseInt(addonId) } // 🟢 Force integer comparison
                }
            });


            if (duplicate) {
                return {
                    success: false,
                    message: 'An addon with this name already exists for this event',
                    code: 'VALIDATION_FAILED'
                };
            }
        }


        const event_id = existingAddon.event_id;

        // =========================================================
        // ✅ Step 1: Direct sold count
        // =========================================================
        const soldData = await OrderItems.findOne({
            where: {
                addon_id: addonId,
                event_id: event_id,
                type: 'addon'
            },
            attributes: [
                [
                    Sequelize.fn(
                        "COALESCE",
                        Sequelize.fn("SUM", Sequelize.col("count")),
                        0
                    ),
                    "sold_count"
                ]
            ],
            raw: true
        });

        let totalSold = Number(soldData?.sold_count || 0);

        // =========================================================
        // ✅ Step 2: Only relevant packages fetch karo (OPTIMIZED)
        // =========================================================
        const packages = await Package.findAll({
            where: { event_id },
            include: {
                model: PackageDetails,
                as: "details",
                required: true, // 🔥 only matching records
                where: { addon_id: addonId },
                attributes: ["addon_id", "qty"]
            },
            attributes: ["id", "total_package"]
        });

        // =========================================================
        // ✅ Step 3: Calculate package reserved qty
        // =========================================================
        let packageRequiredQty = 0;

        packages.forEach(pkg => {
            const totalPkg = Number(pkg.total_package || 0);
            if (!totalPkg) return;

            pkg.details.forEach(d => {
                const qty = Number(d.qty || 0);
                packageRequiredQty += qty * totalPkg;
            });
        });

        // =========================================================
        // ✅ Final minimum required
        // =========================================================
        const minimumRequired = totalSold + packageRequiredQty;
        if (count && parseInt(count) < minimumRequired) {
            return {
                success: false,
                message: `Cannot reduce below ${minimumRequired} (Sold: ${totalSold} + Package Reserved: ${packageRequiredQty})`,
                code: "INVALID_COUNT"
            };
        }

        // ✅ Validate image type
        if (addonImage) {
            const allowedExt = ['png', 'jpg', 'jpeg'];
            const ext = addonImage.split('.').pop().toLowerCase();
            if (!allowedExt.includes(ext)) {
                return {
                    success: false,
                    message: 'Invalid image type. Only JPG, PNG, and JPEG allowed.',
                    code: 'VALIDATION_FAILED'
                };
            }

            // 🧹 Remove old image if exists
            if (existingAddon.addon_image) {
                const oldPath = path.join(process.cwd(), 'uploads/addons', existingAddon.addon_image);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                    console.log('🧹 Old addon image deleted:', oldPath);
                }
            }
        }

        // ✅ Update record
        existingAddon.event_id = existingAddon.event_id;
        existingAddon.name = name?.trim() || existingAddon.name;
        existingAddon.price = price !== undefined ? parseFloat(price) : existingAddon.price;
        existingAddon.count = count !== undefined ? parseInt(count) : existingAddon.count;
        existingAddon.description = description?.trim() || existingAddon.description;
        existingAddon.hidden = hidden || existingAddon.hidden;
        existingAddon.addon_image = addonImage || existingAddon.addon_image;
        await existingAddon.save();

        return {
            success: true,
            message: 'Addon updated successfully',
            data: existingAddon
        };

    } catch (error) {
        console.error('Error updating Addon:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};

// module.exports.listAddonsByEvent = async (event_id) => {
//     try {
//         // ✅ Check if event exists
//         const eventExists = await Event.findByPk(event_id);
//         if (!eventExists) {
//             return {
//                 success: false,
//                 message: 'Event not found',
//                 code: 'EVENT_NOT_FOUND'
//             };
//         }

//         // ✅ Fetch all tickets for this event
//         // const tickets = await AddonTypes.findAll({
//         //     where: { event_id },
//         //     order: [['createdAt', 'DESC']]
//         // });

//         // ✅ Fetch addons with sold count
//         const addons = await AddonTypes.findAll({
//             where: { event_id },
//             attributes: {
//                 include: [
//                     [
//                         literal(`(
//                         SELECT COALESCE(SUM(oi.count), 0)
//                         FROM tbl_order_items AS oi
//                         WHERE oi.addon_id = AddonTypes.id
//                         AND oi.event_id = ${event_id}
//                         AND oi.type = 'addon'
//                         )`),
//                         "sold_count",
//                     ],
//                 ],
//             },
//             order: [["createdAt", "DESC"]],
//         });

//         return {
//             success: true,
//             message: 'Addons fetched successfully',
//             data: addons
//         };

//     } catch (error) {
//         console.error('Error fetching Addons by event:', error);
//         return {
//             success: false,
//             message: 'Internal server error: ' + error.message,
//             code: 'DB_ERROR'
//         };
//     }
// };


module.exports.listAddonsByEvent = async (event_id) => {
    try {
        // ✅ Check if event exists
        const eventExists = await Event.findByPk(event_id);
        if (!eventExists) {
            return {
                success: false,
                message: 'Event not found',
                code: 'EVENT_NOT_FOUND'
            };
        }

        // =========================================================
        // ✅ Step 1: Direct addon sold count
        // =========================================================
        const addons = await AddonTypes.findAll({
            where: { event_id },
            attributes: {
                include: [
                    [
                        literal(`(
                            SELECT COALESCE(SUM(oi.count), 0)
                            FROM tbl_order_items AS oi
                            WHERE oi.addon_id = AddonTypes.id
                            AND oi.event_id = ${event_id}
                            AND oi.type = 'addon'
                        )`),
                        "sold_count",
                    ],
                ],
            },
            order: [["createdAt", "DESC"]],
        });

        // =========================================================
        // ✅ Step 2: Packages fetch (addon mapping)
        // =========================================================
        const packages = await Package.findAll({
            where: { event_id },
            include: {
                model: PackageDetails,
                as: "details",
                attributes: ["addon_id", "qty"]
            },
            attributes: ["id"]
        });

        // 👉 addon_id -> { package_id: qty }
        const packageAddonMap = {};

        packages.forEach(pkg => {
            pkg.details.forEach(d => {
                if (d.addon_id) {
                    if (!packageAddonMap[d.addon_id]) {
                        packageAddonMap[d.addon_id] = {};
                    }

                    packageAddonMap[d.addon_id][pkg.id] = Number(d.qty || 0);
                }
            });
        });

        // =========================================================
        // ✅ Step 3: Package sales
        // =========================================================
        const packageSales = await OrderItems.findAll({
            where: { event_id, type: "package" },
            attributes: [
                "package_id",
                [Sequelize.fn("SUM", Sequelize.col("count")), "sold"]
            ],
            group: ["package_id"],
            raw: true
        });

        // 👉 addon_id -> total sold via package
        const packageAddonSold = {};

        packageSales.forEach(({ package_id, sold }) => {
            for (let addonId in packageAddonMap) {
                const qty = packageAddonMap[addonId][package_id];

                if (qty) {
                    if (!packageAddonSold[addonId]) {
                        packageAddonSold[addonId] = 0;
                    }

                    packageAddonSold[addonId] += sold * qty;
                }
            }
        });

        // =========================================================
        // ✅ Step 4: Merge counts
        // =========================================================
        const finalAddons = addons.map(addon => {
            const plain = addon.toJSON();

            const packageCount = packageAddonSold[plain.id] || 0;

            return {
                ...plain,
                sold_count: Number(plain.sold_count) + packageCount
            };
        });

        // =========================================================
        // ✅ Final Response
        // =========================================================
        return {
            success: true,
            message: 'Addons fetched successfully',
            data: finalAddons
        };

    } catch (error) {
        console.error('Error fetching Addons by event:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};











module.exports.deleteAddon = async (req) => {
    try {
        const addonId = req.params.id;

        // ✅ Check addon exists
        const addon = await AddonTypes.findByPk(addonId);
        if (!addon) {
            return {
                success: false,
                code: 'ADDON_NOT_FOUND',
                message: 'Addon not found'
            };
        }

        // ✅ Check if addon already booked
        const bookedCount = await OrderItems.count({
            where: {
                addon_id: addonId
            }
        });

        if (bookedCount > 0) {
            return {
                success: false,
                code: 'ADDON_ALREADY_BOOKED',
                message: 'This addon has already been booked and cannot be deleted'
            };
        }


        /* ---------- CHECK IF TICKET USED IN PACKAGE ---------- */
        const isUsedInPackage = await PackageDetails.findOne({
            where: { addon_id: addonId }
        });

        if (isUsedInPackage) {
            return {
                success: false,
                message: "This addons is used in a package and cannot be deleted.",
                code: "ADDONS_USED_IN_PACKAGE"
            };
        }


        // ✅ Remove addon image
        if (addon.image) {
            const uploadFolder = path.join(process.cwd(), 'uploads/addons');
            const imagePath = path.join(uploadFolder, addon.image);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log('🧹 Addon image deleted:', imagePath);
            }
        }

        // ✅ Delete addon
        await addon.destroy();

        return {
            success: true,
            message: 'Addon deleted successfully'
        };

    } catch (error) {
        console.error('Delete addon error:', error);
        return {
            success: false,
            code: 'DB_ERROR',
            message: 'Database error while deleting addon'
        };
    }
};