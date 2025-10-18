const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../../models/user.model');
const config = require('../../../config/app');

const sendEmail = require('../../../common/utils/sendEmail');
const verifyEmailTemplate = require('../../../common/utils/emailTemplates/verifyEmailTemplate');
const emailVerifiedTemplate = require('../../../common/utils/emailTemplates/emailVerifiedTemplate');
const { generateVerificationToken, verifyVerificationToken } = require('../../../common/utils/generateToken');

const verifyEmailToken = async (token) => {
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

const registerUser = async ({ firstName, lastName, gender, dob, email, password }) => {
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
    const verifyLink = `${config.clientUrl}/api/v1/auth/verify-email?token=${token}`;
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

const loginUser = async ({ email, password }) => {
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
        { expiresIn: '7d' }
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

const getUserInfo = async (userId) => {
    const user = await User.findByPk(userId, {
        attributes: ['id', 'first_name', 'last_name', 'email', 'gender', 'dob'],
    });
    return user;
};

module.exports = { registerUser, loginUser, getUserInfo, verifyEmailToken };
