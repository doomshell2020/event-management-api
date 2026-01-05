const { User, Orders } = require('../../../../models');
const { Sequelize } = require('sequelize');
const config = require('../../../../config/app');
const sendEmail = require('../../../../common/utils/sendEmail');
const { generateVerificationToken } = require('../../../../common/utils/generateToken');
const verifyEmailTemplate = require('../../../../common/utils/emailTemplates/verifyEmailTemplate');
// Get event organizer List..
module.exports.getCustomersList = async (req, res) => {
    try {
        const adminId = req.user?.id;
        if (!adminId) {
            return {
                success: false,
                message: 'Unauthorized access. Admin authentication required.',
                code: 'UNAUTHORIZED'
            };
        }
        const customers = await User.findAll({
            where: { role_id: 3 }, // Customer role
            attributes: [
                'id',
                'first_name',
                'last_name',
                'email',
                'mobile',
                'status',
                'createdAt',
                'is_email_verified',
                [
                    Sequelize.fn('COALESCE',
                        Sequelize.fn('SUM', Sequelize.col('orders.grand_total')),
                        0
                    ),
                    'total_spent'
                ]
            ],
            include: [
                {
                    model: Orders,
                    as: 'orders',
                    attributes: [], // important: keep empty 
                }
            ],
            group: ['User.id'],
            order: [['id', 'DESC']]
        });
        return {
            success: true,
            message: 'Customers fetched successfully.',
            data: customers
        };

    } catch (error) {
        console.error('Error fetching event customers:', error);

        return {
            success: false,
            message: 'An unexpected error occurred while fetching customers.',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};

// Status update Api..
module.exports.updateStatusCustomer = async (req) => {
    try {
        const userId = req.params.id;
        const { status } = req.body;
        // Find record
        const existingCustomer = await User.findByPk(userId);
        if (!existingCustomer) {
            return {
                success: false,
                message: 'Customer not found',
                code: 'CUSTOMER_NOT_FOUND'
            };
        }
        // Update ONLY status
        await existingCustomer.update({ status });
        return {
            success: true,
            message: 'Status updated successfully',
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            code: 'DB_ERROR'
        };
    }
};


// Resend Verification Email 
module.exports.resendVerificationEmail = async ({ userId }) => {
    // 1️⃣ Validate input
    if (!userId) {
        throw new Error("User ID is required");
    }

    // 2️⃣ Find user
    const user = await User.findOne({
        where: { id: userId },
        attributes: [
            "id",
            "email",
            "first_name",
            "full_name",
            "is_email_verified"
        ]
    });

    if (!user) {
        throw new Error("User not found");
    }

    // 3️⃣ Check already verified
    if (user.is_email_verified === "Y") {
        throw new Error("Email already verified");
    }

    // 4️⃣ Generate verification token
    const token = generateVerificationToken(user.email);
    const verifyLink = `${config.clientUrl}/verify-email?token=${token}`;

    // 5️⃣ Send email
    const html = verifyEmailTemplate(user.first_name, verifyLink);
    await sendEmail(
        user.email,
        "Verify your email address",
        html
    );

    return {
        success: true,
        message: "Verification email sent successfully"
    };
};

