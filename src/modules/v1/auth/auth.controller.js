const authService = require('./auth.service');
const apiResponse = require('../../../common/utils/apiResponse');
const path = require('path');
const fs = require('fs');


module.exports.register = async (req, res) => {
    try {
        // ✅ Get POST data from request body
        const { firstName, lastName, gender, dob, email, password } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !password) {
            return apiResponse.validation(res, [], 'First Name, Last Name, Email and Password are required');
        }

        // Call service to create user
        const user = await authService.registerUser({ firstName, lastName, email, password, gender, dob });

        // Return standardized response
        return apiResponse.success(res, 'Registration successful! Please check your email to verify your account.', { user });

    } catch (error) {
        return apiResponse.error(res, error.message, 400);
    }
};

module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return apiResponse.validation(res, [], 'Email and Password are required');
        }

        const data = await authService.loginUser({ email, password });

        return apiResponse.success(res, 'Login successful', { token: data.token, user: data.user });

    } catch (error) {
        return apiResponse.unauthorized(res, error.message);
    }
};

module.exports.getUserInfo = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await authService.getUserInfo(userId);

        if (!user) {
            return apiResponse.notFound(res, 'User not found');
        }

        return apiResponse.success(res, 'User info fetched successfully', user);
    } catch (error) {
        console.error('Get user info error:', error);
        return apiResponse.error(res, 'Server error while fetching user info', 500);
    }
};

module.exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        // 1️⃣ Check if body is empty
        if (!updates || Object.keys(updates).length === 0) {
            return apiResponse.validation(res, [], 'No data provided to update');
        }

        const result = await authService.updateUserProfile(userId, updates);

        if (!result.success) {
            // Map service code to proper apiResponse
            switch (result.code) {
                case 'USER_NOT_FOUND':
                    return apiResponse.notFound(res, result.message);
                case 'INVALID_FIELDS':
                case 'SAME_PASSWORD':
                    return apiResponse.validation(res, [], result.message);
                case 'UPDATE_FAILED':
                default:
                    return apiResponse.error(res, result.message);
            }
        }

        return apiResponse.success(res, 'Profile updated successfully', result.data);

    } catch (error) {
        console.error('Update profile error:', error);
        return apiResponse.error(res, 'Server error while updating profile', 500);
    }
};

module.exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return apiResponse.validation(res, [], 'Verification token is required');
        }
        const result = await authService.verifyEmailToken(token);

        if (result.success) {
            return apiResponse.success(res, result.message || 'Email verified successfully');
        } else {
            return apiResponse.error(res, result.message || 'Email verification failed');
        }

    } catch (error) {
        console.error('Email verification error:', error);
        return apiResponse.error(res, 'Server error during email verification');
    }
};

module.exports.updateProfileImage = async (req, res) => {
    const userId = req.user.id;

    if (!req.file) {
        return apiResponse.validation(res, [], 'No profile image uploaded');
    }

    const { filename } = req.file;
    const uploadFolder = path.join(process.cwd(), 'uploads/profile');
    const fullFilePath = path.join(uploadFolder, filename);

    try {
        // Update DB with the file name or relative path if you want to store URL
        const relativePathForDB = `/uploads/profile/${filename}`;
        const result = await authService.updateUserProfile(userId, { profile_image: filename }, uploadFolder);

        if (!result.success) {
            // If DB update failed, delete the uploaded file
            if (fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
                console.log('🧹 Uploaded image removed due to DB failure:', fullFilePath);
            } else {
                console.log('file not exist')
            }

            switch (result.code) {
                case 'USER_NOT_FOUND':
                    return apiResponse.notFound(res, result.message);
                case 'UPDATE_FAILED':
                default:
                    return apiResponse.error(res, result.message);
            }
        }

        return apiResponse.success(res, 'Profile image updated successfully', result.data);

    } catch (error) {
        // Delete uploaded file if any error occurs
        if (fs.existsSync(fullFilePath)) {
            fs.unlinkSync(fullFilePath);
            console.log('🧹 Uploaded image removed due to server error:', fullFilePath);
        }

        console.error('Update profile image error:', error);
        return apiResponse.error(res, 'Server error while updating profile image', 500);
    }
};

module.exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return apiResponse.validation(res, [], 'Email is required');
        }
        const result = await authService.initiatePasswordReset(email);

        if (result.success) {
            return apiResponse.success(res, result.message || 'Password reset email sent successfully');
        } else {
            return apiResponse.error(res, result.message || 'Failed to initiate password reset');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        return apiResponse.error(res, 'Server error during password reset initiation');
    }
};

// Reset password (JWT token, no DB token storage)
module.exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return apiResponse.validation(res, [], 'Token and new password are required');
        }
        const result = await authService.resetPassword(token, password);
        if (result.success) {
            return apiResponse.success(res, result.message || 'Password reset successfully');
        } else {
            return apiResponse.error(res, result.message || 'Failed to reset password');
        }
    } catch (error) {
        console.error('Reset password error:', error);
        return apiResponse.error(res, 'Server error during password reset');
    }
};
