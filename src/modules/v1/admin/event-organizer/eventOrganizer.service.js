const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User,Event } = require('../../../../models');




// Get event organizer List..
module.exports.getEventOrganizerList = async (req, res) => {
    try {
        const adminId = req.user?.id;
        if (!adminId) {
            return {
                success: false,
                message: 'Unauthorized access. Admin authentication required.',
                code: 'UNAUTHORIZED'
            };
        }
        const eventOrganizers = await User.findAll({
            where: { role_id: 2 }, // Event Organiser role
            include:{model:Event,as:"events",attributes:['id','name']},
            attributes: [
                'id',
                'first_name',
                'last_name',
                'email',
                'mobile',
                'profile_image',
                'status',
                'is_email_verified',
                'is_suspend',
            ],
            order: [['id', 'DESC']]
        });
        return {
            success: true,
            message: 'Event organizers fetched successfully.',
            data: eventOrganizers
        };

    } catch (error) {
        console.error('Error fetching event organisers:', error);

        return {
            success: false,
            message: 'An unexpected error occurred while fetching event organisers.',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};

// Create event Organizer 
module.exports.createEventOrganizer = async (req) => {
    try {
        const { first_name, email, mobile } = req.body;
        const adminId = req.user?.id;
        if (!adminId) {
            return {
                success: false,
                message: 'Unauthorized access. Admin authentication required.',
                code: 'UNAUTHORIZED'
            };
        }
        // ✅ Required field validation
        if (!first_name || !email || !mobile) {
            return {
                success: false,
                message: 'First name, email, and mobile number are required.',
                code: 'VALIDATION_FAILED'
            };
        }
        // ✅ Check duplicate email or mobile
        const existingOrganizer = await User.findOne({
            where: { email: email }
        });
        if (existingOrganizer) {
            return {
                success: false,
                message: 'An event organizer with the same email already exists.',
                code: 'DUPLICATE_ERROR'
            };
        }

        // 🔐 Generate password
        // const plainPassword = Math.random().toString(36).slice(-8); // eg: x9k2mPq1
        const plainPassword = '123456'; // eg: x9k2mPq1
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // ✅ Build Event Organiser object
        const organizerData = {
            first_name: first_name.trim(),
            email: email.trim().toLowerCase(),
            mobile: mobile.trim(),
            password: hashedPassword,
            confirm_pass: plainPassword,
            gender: 'Male',
            role_id: 2,
        };
        // ✅ Save to DB
        const newOrganizer = await User.create(organizerData);
        if (!newOrganizer) {
            return {
                success: false,
                message: 'Event organizer creation failed.',
                code: 'CREATION_FAILED'
            };
        }
        return {
            success: true,
            message: 'Event organiser created successfully.',
            data: {
                id: newOrganizer.id,
                first_name: newOrganizer.first_name,
                email: newOrganizer.email,
                mobile: newOrganizer.mobile
            }
        };
    } catch (error) {
        console.error('Error creating event organiser:', error);
        return {
            success: false,
            message: 'Internal server error.',
            code: 'INTERNAL_ERROR'
        };
    }
};

// update event Organizer
module.exports.updateEventOrganizer = async (userId, data) => {
    try {
        const { first_name, email, mobile } = data;
        // ✅ Find Event Organizer
        const existingOrganizer = await User.findOne({
            where: {
                id: userId,
                role_id: 2 // Event Organizer role
            }
        });
        if (!existingOrganizer) {
            return {
                success: false,
                message: 'Event organizer not found.',
                code: 'ORGANIZER_NOT_FOUND'
            };
        }
        // ✅ Duplicate email check
        if (email) {
            const duplicateOrganizer = await User.findOne({
                where: {
                    email: email.trim().toLowerCase(),
                    id: { [Op.ne]: userId } // skip the same user
                }
            });
            if (duplicateOrganizer) {
                return {
                    success: false,
                    message: 'Another event organizer already exists with the same email.',
                    code: 'DUPLICATE_ORGANIZER'
                };
            }
        }
        // ✅ Update only provided fields
        if (first_name !== undefined) existingOrganizer.first_name = first_name.trim();
        if (email !== undefined) existingOrganizer.email = email.trim().toLowerCase();
        if (mobile !== undefined) existingOrganizer.mobile = mobile.trim();
        await existingOrganizer.save();
        return {
            success: true,
            message: 'Event organizer updated successfully.',
            data: {
                id: existingOrganizer.id,
                first_name: existingOrganizer.first_name,
                email: existingOrganizer.email,
                mobile: existingOrganizer.mobile
            }
        };

    } catch (error) {
        console.error('❌ Error updating event organizer:', error);
        return {
            success: false,
            message: 'Internal server error.',
            code: 'DB_ERROR'
        };
    }
};

// Status update Api..
 module.exports.updateStatusEventOrganizer = async (req) => {
    try {
        const userId = req.params.id;
        const { status } = req.body;
        // Find record
        const existingOrganizer = await User.findByPk(userId);
        if (!existingOrganizer) {
            return {
                success: false,
                message: 'Event Organizer not found',
                code: 'EVENT_ORGANIZER_NOT_FOUND'
            };
        }
        // Update ONLY status
        await existingOrganizer.update({ status });
        return {
            success: true,
            message: 'Status updated successfully',
            // data: existingOrganizer
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            code: 'DB_ERROR'
        };
    }
};

// View event Organizer By id 
module.exports.getEventOrganizerById = async (userId) => {
    try {
        if (!userId) {
            return {
                success: false,
                message: 'Event organizer ID is required.',
                code: 'VALIDATION_FAILED'
            };
        }
        const organizer = await User.findOne({
            where: {
                id: userId,
                role_id: 2 // ✅ Event Organizer only
            },
            attributes: [
                'id',
                'first_name',
                'last_name',
                'email',
                'mobile'
            ]
        });

        if (!organizer) {
            return {
                success: false,
                message: 'Event organizer not found.',
                code: 'ORGANIZER_NOT_FOUND'
            };
        }

        return {
            success: true,
            message: 'Event organizer fetched successfully.',
            data: organizer
        };

    } catch (error) {
        console.error('❌ Error fetching event organizer:', error);
        return {
            success: false,
            message: 'Internal server error.',
            code: 'DB_ERROR'
        };
    }
};


// searching api
module.exports.searchEventOrganizer = async (req) => {
    try {
        const { first_name, email,mobile} = req.query;
        const whereCondition = { role_id: 2 };
        // 🔹 First Name filter
        if (first_name) {
            whereCondition.first_name = {
                [Op.like]: `%${first_name}%`
            };
        }
        // 🔹 Email filter
        if (email) {
            whereCondition.email = {
                [Op.like]: `%${email}%`
            };
        }
         // 🔹 mobile filter
        if (mobile) {
            whereCondition.mobile = {
                [Op.like]: `%${mobile}%`
            };
        }
           const users = await User.findAll({
            where: whereCondition,
            include:{model:Event,as:"events",attributes:['id','name']},
            attributes: [
                'id',
                'first_name',
                'last_name',
                'email',
                'mobile',
                'profile_image',
                'status',
                'is_email_verified',
                'is_suspend',
            ],
            order: [['id', 'DESC']]
        });

        return {
            success: true,
            message: "Users fetched successfully.",
            data: users
        };

    } catch (error) {
        console.error("Error searching users:", error);
        return {
            success: false,
            message: "An unexpected error occurred while searching users.",
            code: "INTERNAL_SERVER_ERROR"
        };
    }
};

