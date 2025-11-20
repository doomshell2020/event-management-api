// const User = require('../../../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../../models');
const config = require('../../../config/app');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const sendEmail = require('../../../common/utils/sendEmail');
const { generateVerificationToken, verifyVerificationToken } = require('../../../common/utils/generateToken');
const verifyEmailTemplate = require('../../../common/utils/emailTemplates/verifyEmailTemplate');
const emailVerifiedTemplate = require('../../../common/utils/emailTemplates/emailVerifiedTemplate');
const resetPasswordTemplate = require('../../../common/utils/emailTemplates/resetPasswordTemplate');
const passwordChangedTemplate = require('../../../common/utils/emailTemplates/passwordChangedTemplate');


module.exports.verifyEmailToken = async (token) => {
    try {
        const decoded = verifyVerificationToken(token);
        if (!decoded) {
            return { success: false, message: 'Invalid or expired verification link' };
        }

        // Find user by email
        const user = await User.findOne({ where: { email: decoded.email } });
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        if (user.is_email_verified == 'Y') {
            return { success: false, message: 'Email already verified. You can log in.' };
        }

        // Update user's email verification status
        user.is_email_verified = 'Y';
        await user.save();

        // Send email notification for successful verification
        const html = emailVerifiedTemplate(user.first_name);
        await sendEmail(user.email, 'Your email has been verified!', html);

        return {
            success: true,
            message: 'Email verified successfully! You can now log in.'
        };

    } catch (error) {
        console.error('Error verifying email token:', error);
        return { success: false, message: error.message || 'Email verification failed' };
    }
};

module.exports.registerUser = async ({ firstName, lastName, gender, dob, email, password }) => {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const fullName = `${firstName} ${lastName}`;

    // Create user with email not verified
    const user = await User.create({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        gender,
        dob,
        email,
        password: hashedPassword,
        confirm_pass: password,
        is_email_verified: 'N', // email verification field
    });

    // Generate email verification token (JWT)
    const token = generateVerificationToken(email);
    const verifyLink = `${config.clientUrl}/verify-email?token=${token}`;
    // Send verification email
    const html = verifyEmailTemplate(fullName, verifyLink);
    await sendEmail(email, 'Verify your email address', html);
    return fullName;
    return {
        name: user.full_name,
        email: user.email,
        role: user.role,
    };
};

module.exports.loginUser = async ({ email, password }) => {
    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
        throw new Error('Invalid email or password');
    }

    // Check if email is verified
    if (user.is_email_verified !== 'Y') {
        throw new Error('Email not verified. Please verify your email to login.');
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid email or password');
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

module.exports.getUserInfo = async (userId) => {
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
            'mobile'
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

module.exports.updateUserProfile = async (userId, updates, uploadFolder = null) => {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return { success: false, message: 'User not found', code: 'USER_NOT_FOUND' };
        }

        // Allowed DB column fields
        const allowedFields = [
            'first_name',
            'last_name',
            'gender',
            'dob',
            'password',
            'emailRelatedEvents',
            'emailNewsLetter',
            'profile_image',
            'mobile'
        ];

        // Check for invalid fields
        const invalidFields = Object.keys(updates).filter(field => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            return { success: false, message: `Invalid field(s) provided: ${invalidFields.join(', ')}`, code: 'INVALID_FIELDS' };
        }

        // Handle password separately
        if (updates.password) {
            const isSamePassword = await bcrypt.compare(updates.password, user.password);
            if (isSamePassword) {
                return { success: false, message: 'New password cannot be the same as current password', code: 'SAME_PASSWORD' };
            }
            updates.password = await bcrypt.hash(updates.password, 10);
        }

        // 🧹 Handle old profile image deletion if a new image is uploaded
        if (updates.profile_image && user.profile_image && user.profile_image !== updates.profile_image && uploadFolder) {
            try {
                const oldImagePath = path.join(uploadFolder, user.profile_image);
                // Only delete if file exists in the provided upload folder
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                    console.log('🧹 Old profile image deleted:', oldImagePath);
                }
            } catch (err) {
                console.warn('⚠️ Failed to delete old image:', err.message);
            }
        }

        // Only store the filename in DB
        if (updates.profile_image) {
            updates.profile_image = path.basename(updates.profile_image);
        }

        // Filter only allowed fields
        const filteredUpdates = {};
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) filteredUpdates[field] = updates[field];
        });

        await user.update(filteredUpdates);

        // Return user without password
        const { password, ...userData } = user.toJSON();
        return { success: true, data: userData };

    } catch (error) {
        console.error('Update user profile service error:', error);
        return { success: false, message: 'Failed to update profile', code: 'UPDATE_FAILED' };
    }
};

module.exports.initiatePasswordReset = async (email) => {
    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return {
                success: false,
                message: "Invalid email address"
            };
        }

        const resetToken = generateVerificationToken(email);
        const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;

        // Send email
        const html = resetPasswordTemplate(user.first_name, resetUrl);
        await sendEmail(user.email, 'Password Reset Request', html);

        return {
            success: true,
            message: 'Password reset link has been sent to your email'
        };

    } catch (error) {
        console.error('initiatePasswordReset error:', error);
        return {
            success: false,
            message: 'Failed to initiate password reset'
        };
    }
};

module.exports.resetPassword = async (token, password) => {
    try {
        // Verify JWT token
        const decoded = verifyVerificationToken(token);
        if (!decoded) {
            return { success: false, message: 'Invalid or expired password reset link' };
        }

        // Find user by email
        const user = await User.findOne({ where: { email: decoded.email } });
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();

        // Send confirmation email including new password
        const html = passwordChangedTemplate(user.first_name, password);
        await sendEmail(user.email, 'Your Password Has Been Changed', html);

        return { success: true, message: 'Password has been reset successfully' };

    } catch (error) {
        console.error('Reset password error:', error);
        return { success: false, message: 'Failed to reset password' };
    }
};