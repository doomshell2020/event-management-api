const authService = require('./auth.service');
const apiResponse = require('../../../common/utils/apiResponse');

const register = async (req, res) => {
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

const login = async (req, res) => {
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

const getUserInfo = async (req, res) => {
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

const verifyEmail = async (req, res) => {
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

module.exports = { register, login, getUserInfo, verifyEmail };
