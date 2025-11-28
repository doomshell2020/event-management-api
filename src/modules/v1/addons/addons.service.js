const { AddonTypes, Event } = require('../../../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

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

        // ✅ Fetch all tickets for this event
        const tickets = await AddonTypes.findAll({
            where: { event_id },
            order: [['createdAt', 'DESC']]
        });

        return {
            success: true,
            message: 'Addons fetched successfully',
            data: tickets
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
