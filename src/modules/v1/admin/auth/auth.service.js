// const User = require('../../../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../../../models');
const config = require('../../../../config/app');


// Admin Login
module.exports.loginUser = async ({ email, password }) => {
    // Find user by email
    const user = await User.findOne({
        where: { email },
        attributes: ['email', 'is_email_verified', 'password', 'id', 'role', 'first_name', 'last_name', 'role_id']
    });
    if (!user) {
        throw new Error('Email not registered');
    }

    // Check if email is verified
    if (user.is_email_verified !== 'Y') {
        throw new Error('Email not verified. Please verify your email to login.');
    }
    if (user.role_id !== 1) {
        throw new Error('Access denied. You do not have permission to log in as an administrator.');
    }
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Incorrect password');
    }
    // Generate JWT token
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
    return {
        token,
        user: {
            name: user.full_name,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
            gender: user.gender,
            dob: user.dob,
        }
    };
};


// Admin detail fetch api
module.exports.getAdminInfo = async (userId) => {
    const imagePath = 'uploads/profile';
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000/'; // ✅ fallback base URL
    const user = await User.findByPk(userId, {
        attributes: [
            'id',
            'profile_image',
            'first_name',
            'last_name',
            'email',
            'gender',
            'dob',
            'emailNewsLetter',
            'emailRelatedEvents',
            'mobile',
            'fburl',
            'instaurl',
            'Twitterurl',
            'linkdinurl',
            'googleplusurl',
            'googleplaystore',
            'applestore',
            'payment_gateway_charges',
            'default_platform_charges',
            'admin_approval_required',
            'approval_type'
        ],
    });

    if (!user) return null;

    // ✅ Add full image URL or default placeholder
    const profileImage = user.profile_image
        ? `${baseUrl}${imagePath}/${user.profile_image}`
        : `${baseUrl}${imagePath}/no-image.jpg`;

    // ✅ Return merged data
    return {
        ...user.toJSON(),
        profile_image: profileImage,
    };
};

// update user profile
module.exports.updateUserProfile = async (userId, data) => {
    try {
        const {
            first_name,
            email,
            mobile,
            fburl,
            instaurl,
            Twitterurl,
            linkdinurl,
            googleplusurl,
            googleplaystore,
            applestore,
            payment_gateway_charges,
            default_platform_charges,
            admin_approval_required,
            approval_type
        } = data;

        // 🔍 Find User
        const user = await User.findOne({
            where: { id: userId },
        });

        if (!user) {
            return {
                success: false,
                message: "User not found.",
                code: "USER_NOT_FOUND",
            };
        }

        // ✏️ Update only provided fields
        if (first_name != undefined) user.first_name = first_name.trim();
        if (email != undefined) user.email = email.trim();
        if (mobile != undefined) user.mobile = mobile.trim();

        if (fburl != undefined) user.fburl = fburl.trim();
        if (instaurl != undefined) user.instaurl = instaurl.trim();
        if (Twitterurl != undefined) user.Twitterurl = Twitterurl.trim();
        if (linkdinurl != undefined) user.linkdinurl = linkdinurl.trim();
        if (googleplusurl != undefined) user.googleplusurl = googleplusurl.trim();
        if (googleplaystore != undefined) user.googleplaystore = googleplaystore.trim();
        if (applestore != undefined) user.applestore = applestore.trim();

        // 🔥 NEW FIELDS UPDATE LOGIC

        if (payment_gateway_charges != undefined) {
            user.payment_gateway_charges = parseFloat(payment_gateway_charges) || 0;
        }

        if (default_platform_charges != undefined) {
            user.default_platform_charges = parseFloat(default_platform_charges) || 0;
        }

        if (admin_approval_required != undefined) {
            user.admin_approval_required = admin_approval_required;
        }

        if (approval_type != undefined) {
            user.approval_type = approval_type;
        }

        // 💾 Save updates
        await user.save();
        const { password, ...userData } = user.toJSON();

        // ✅ Success response
        return {
            success: true,
            message: "Admin profile updated successfully.",
            data: userData,
        };

    } catch (error) {
        console.error("❌ Error updating user profile:", error);
        return {
            success: false,
            message: "Internal server error.",
            code: "DB_ERROR",
        };
    }
};

// change password..
module.exports.changeAdminPassword = async (userId, data) => {
    try {
        const {
            password
        } = data;
        const user = await User.findByPk(userId);
        if (!user) {
            return {
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            };
        }

        if (!password) {
            return {
                success: false,
                message: 'Password is required',
                code: 'PASSWORD_REQUIRED'
            };
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password
        await user.update({ password: hashedPassword, confirm_pass: password });

        return {
            success: true,
            message: 'Password updated successfully'
        };

    } catch (error) {
        console.error('Change password service error:', error);
        return {
            success: false,
            message: 'Failed to change password',
            code: 'CHANGE_PASSWORD_FAILED'
        };
    }
};

