// const User = require('../../../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../../../models');
const config = require('../../../../config/app');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Admin Login
module.exports.loginUser = async ({ email, password }) => {
    // Find user by email
    const user = await User.findOne({
        where: { email },
        attributes: ['email', 'is_email_verified', 'password', 'id', 'role', 'first_name', 'last_name','role_id']
    });
    if (!user) {
        throw new Error('Invalid email or password');
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
