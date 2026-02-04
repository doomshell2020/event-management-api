// const User = require('../../../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Cart, Templates } = require('../../../models');
const config = require('../../../config/app');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const sendEmail = require('../../../common/utils/sendEmail');
const { generateVerificationToken, verifyVerificationToken } = require('../../../common/utils/generateToken');
const passwordChangedTemplate = require('../../../common/utils/emailTemplates/passwordChangedTemplate');
const { replaceTemplateVariables } = require('../../../common/utils/helpers');

module.exports.initiatePasswordReset = async (email) => {
    try {
        // 1️⃣ Find user
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return {
                success: false,
                message: "Invalid email address"
            };
        }

        // 2️⃣ Generate reset token & link
        const resetToken = generateVerificationToken(email);
        const resetLink = `${config.clientUrl}/reset-password?token=${resetToken}`;

        // 3️⃣ Get FORGOT PASSWORD template ID
        const forgotPasswordTemplateId = config.emailTemplates.forgotPassword;

        // 4️⃣ Fetch template from DB
        const templateRecord = await Templates.findOne({
            where: { id: forgotPasswordTemplateId }
        });

        if (!templateRecord) {
            throw new Error('Forgot password email template not found');
        }

        const { subject, description } = templateRecord;

        // 5️⃣ Replace template variables
        const html = replaceTemplateVariables(description, {
            NAME: user.full_name || user.first_name,
            RESET_LINK: resetLink
        });

        // 6️⃣ Send email
        await sendEmail(
            user.email,
            subject,
            html
        );

        return {
            success: true,
            message: 'Password reset link has been sent to your email'
        };

    } catch (error) {
        console.error('initiatePasswordReset error:', error);
        return {
            success: false,
            message: error.message || 'Failed to initiate password reset'
        };
    }
};

module.exports.registerUser = async ({ firstName, lastName, gender, dob, email, password }) => {
    // 1️⃣ Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        throw new Error('Email already registered');
    }

    // 2️⃣ Get email template ID
    const registerEmailTemplateId = config.emailTemplates.register;

    // 3️⃣ Fetch template from DB
    const templateRecord = await Templates.findOne({
        where: { id: registerEmailTemplateId }
    });

    if (!templateRecord) {
        throw new Error('Registration email template not found');
    }

    const { subject, description, fromemail } = templateRecord;

    // 4️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const fullName = `${firstName} ${lastName}`;

    // 5️⃣ Create user
    const user = await User.create({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        gender,
        dob,
        email,
        password: hashedPassword,
        confirm_pass: password,
        is_email_verified: 'N',
    });

    // 6️⃣ Generate verification token & link
    const token = generateVerificationToken(email);
    const verifyLink = `${config.clientUrl}/verify-email?token=${token}`;

    // 7️⃣ Replace template variables
    const html = replaceTemplateVariables(description, {
        NAME: fullName,
        SITE_URL: config.clientUrl,
        VERIFY_LINK: verifyLink,
        CONTACT_EMAIL: fromemail || config.email.user
    });

    // 8️⃣ Send email
    await sendEmail(
        email,
        subject, // ✅ subject from DB
        html // ✅ processed template
    );

    // 9️⃣ Return response
    return {
        name: user.full_name,
        email: user.email,
        role: user.role,
    };
};

module.exports.verifyEmailToken = async (token) => {
    try {
        // 1️⃣ Verify token
        const decoded = verifyVerificationToken(token);
        if (!decoded) {
            return {
                success: false,
                message: 'Invalid or expired verification link'
            };
        }

        // 2️⃣ Find user
        const user = await User.findOne({
            where: { email: decoded.email }
        });

        if (!user) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        if (user.is_email_verified == 'Y') {
            return {
                success: false,
                message: 'Email already verified. You can log in.'
            };
        }

        user.is_email_verified = 'Y';
        await user.save();

        /* ================= EMAIL TEMPLATE ================= */
        const verifyEmailTemplateId = config.emailTemplates.verifyEmail;
        const templateRecord = await Templates.findOne({
            where: { id: verifyEmailTemplateId }
        });
        if (!templateRecord) {
            throw new Error('Verify email template not found');
        }
        const { subject, description } = templateRecord;

        // 7️⃣ Replace ONLY required variables
        const html = replaceTemplateVariables(description, {
            NAME: user.full_name || user.first_name,
            EMAIL: user.email || '',
            PASSWORD: user.confirm_pass || '',
            SITE_URL: config.clientUrl,
        });

        // 8️⃣ Send email
        await sendEmail(
            user.email,
            subject,
            html
        );

        return {
            success: true,
            message: 'Email verified successfully! You can now log in.'
        };

    } catch (error) {
        console.error('Error verifying email token:', error);
        return {
            success: false,
            message: error.message || 'Email verification failed'
        };
    }
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
    // check user is active and inactive 
    if (user.status !== 'Y') {
        throw new Error('Your account is inactive. Please contact support for assistance.');
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
            dob: user.dob
        },
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
            'mobile',
            'createdAt'
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
        profile_image: profileImage
    };
};

module.exports.updateUserProfile = async (userId, updates, uploadFolder = null) => {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return { success: false, message: 'User not found', code: 'USER_NOT_FOUND' };
        }

        let isPasswordChanged = false;

        const allowedFields = [
            'first_name',
            'last_name',
            'gender',
            'dob',
            'password',
            'old_password',
            'emailRelatedEvents',
            'emailNewsLetter',
            'profile_image',
            'mobile'
        ];

        const invalidFields = Object.keys(updates).filter(
            field => !allowedFields.includes(field)
        );

        if (invalidFields.length > 0) {
            return {
                success: false,
                message: `Invalid field(s) provided: ${invalidFields.join(', ')}`,
                code: 'INVALID_FIELDS'
            };
        }

        const currentNewPassword = updates.password;
        const currentOldPassword = updates.old_password;

        /* ================= PASSWORD CHANGE ================= */
        if (updates.password) {
            if (!updates.old_password) {
                return {
                    success: false,
                    message: 'Old password is required',
                    code: 'OLD_PASSWORD_REQUIRED'
                };
            }

            const isOldPasswordCorrect = await bcrypt.compare(
                updates.old_password,
                user.password
            );

            if (!isOldPasswordCorrect) {
                return {
                    success: false,
                    message: 'Old password does not match',
                    code: 'OLD_PASSWORD_INCORRECT'
                };
            }

            const isSamePassword = await bcrypt.compare(
                updates.password,
                user.password
            );

            if (isSamePassword) {
                return {
                    success: false,
                    message: 'New password cannot be same as current password',
                    code: 'SAME_PASSWORD'
                };
            }

            updates.password = await bcrypt.hash(updates.password, 10);
            isPasswordChanged = true;
        }

        /* ================= PROFILE IMAGE ================= */
        if (
            updates.profile_image &&
            user.profile_image &&
            user.profile_image != updates.profile_image &&
            uploadFolder
        ) {
            try {
                const oldImagePath = path.join(uploadFolder, user.profile_image);
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            } catch (err) {
                console.warn('Failed to delete old image:', err.message);
            }
        }

        if (updates.profile_image) {
            updates.profile_image = path.basename(updates.profile_image);
        }

        const filteredUpdates = {};
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        });

        delete filteredUpdates.old_password;

        await user.update(filteredUpdates);

        /* ================= EMAIL (PASSWORD CHANGED) ================= */
        if (isPasswordChanged) {
            const templateId = config.emailTemplates.changedPassword;

            const templateRecord = await Templates.findOne({
                where: { id: templateId }
            });

            if (!templateRecord) {
                throw new Error('Password changed email template not found');
            }

            const { subject, description, fromemail } = templateRecord;
            // console.log('updates :', updates);

            const html = replaceTemplateVariables(description, {
                NAME: user.first_name,
                SITE_URL: config.clientUrl,
                NEW_PASSWORD: currentNewPassword || '',
                OLD_PASSWORD: currentOldPassword || '',
                SUPPORT_EMAIL: fromemail || config.email.user
            });

            await sendEmail(
                user.email,
                subject,
                html,
                fromemail
            );
        }

        const { password, ...userData } = user.toJSON();

        return { success: true, data: userData };

    } catch (error) {
        console.error('Update user profile service error:', error);
        return {
            success: false,
            message: 'Failed to update profile',
            code: 'UPDATE_FAILED'
        };
    }
};

module.exports.resetPassword = async (token, password) => {
    try {
        // 1️⃣ Verify reset token
        const decoded = verifyVerificationToken(token);
        if (!decoded) {
            return {
                success: false,
                message: 'Invalid or expired password reset link'
            };
        }

        // 2️⃣ Find user
        const user = await User.findOne({
            where: { email: decoded.email }
        });

        if (!user) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        // 3️⃣ Hash & update password
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();

        /* ================= EMAIL TEMPLATE ================= */

        // 4️⃣ Get PASSWORD CHANGED template ID
        const passwordChangedTemplateId =
            config.emailTemplates.forgotPasswordChanged;

        // 5️⃣ Fetch template from DB
        const templateRecord = await Templates.findOne({
            where: { id: passwordChangedTemplateId }
        });

        if (!templateRecord) {
            throw new Error('Password changed email template not found');
        }

        const { subject, description } = templateRecord;

        // 6️⃣ Login link
        const loginLink = `${config.clientUrl}/login`;

        // 7️⃣ Replace variables (ONLY required ones)
        const html = replaceTemplateVariables(description, {
            NAME: user.full_name || user.first_name,
            LOGIN_LINK: loginLink,
            SITE_URL: config.clientUrl,
        });

        // 8️⃣ Send email
        await sendEmail(
            user.email,
            subject,
            html
        );

        return {
            success: true,
            message: 'Password has been reset successfully'
        };

    } catch (error) {
        console.error('Reset password error:', error);
        return {
            success: false,
            message: error.message || 'Failed to reset password'
        };
    }
};

// User detail fetch api
module.exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;   // get id from URL params
        const userData = await User.findOne({
            where: { id: id },
            attributes: ['id', 'first_name', 'last_name', 'email', 'mobile']
        });
        return {
            success: true,
            message: 'User record fetched successfully!',
            data: userData
        };
    } catch (error) {
        console.error('Error fetching cart:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'INTERNAL_ERROR'
        };
    }
}