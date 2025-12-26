const authService = require('./auth.service');
const apiResponse = require('../../../../common/utils/apiResponse');
const path = require('path');
const fs = require('fs');


// Admin Login
module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return apiResponse.validation(res, [], 'Email and Password are required');
        }
        const data = await authService.loginUser({ email, password });
        return apiResponse.success(res, 'Login successful', { token: data.token, admin: data.user });
    } catch (error) {
        return apiResponse.unauthorized(res, error.message);
    }
};
