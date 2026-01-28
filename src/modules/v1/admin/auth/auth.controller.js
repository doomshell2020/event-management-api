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


// user fetch profile
module.exports.getAdminInfo = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await authService.getAdminInfo(userId);
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
    const userId = req.params.id;

    // 🔍 Basic validation
    if (!userId) {
      return apiResponse.validation(
        res,
        [],
        "User ID is required"
      );
    }

    // 🔁 Call service
    const result = await authService.updateUserProfile(
      userId,
      req.body
    );

    // ❌ Handle service-level errors
    if (!result.success) {
      switch (result.code) {
        case "USER_NOT_FOUND":
          return apiResponse.notFound(res, result.message);

        case "INVALID_FIELDS":
          return apiResponse.validation(res, [], result.message);

        case "DB_ERROR":
          return apiResponse.error(
            res,
            result.message || "Database error occurred"
          );

        default:
          return apiResponse.error(
            res,
            result.message || "An unknown error occurred",
            400
          );
      }
    }

    // ✅ Success response
    return apiResponse.success(
      res,
      "User profile updated successfully",
      result.data
    );
  } catch (error) {
    console.error("❌ Error in updateProfile:", error);
    return apiResponse.error(res, "Internal Server Error", 500);
  }
};


// change password.. functionality..
module.exports.changeAdminPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    // 🔍 Basic validation
    if (!userId) {
      return apiResponse.validation(
        res,
        [],
        "User ID is required"
      );
    }
    // 🔁 Call service
    const result = await authService.changeAdminPassword(
      userId,
      req.body
    );
    // ❌ Handle service-level errors
    if (!result.success) {
      switch (result.code) {
        case "USER_NOT_FOUND":
          return apiResponse.notFound(res, result.message);

        case "INVALID_FIELDS":
          return apiResponse.validation(res, [], result.message);

        case "DB_ERROR":
          return apiResponse.error(
            res,
            result.message || "Database error occurred"
          );

        default:
          return apiResponse.error(
            res,
            result.message || "An unknown error occurred",
            400
          );
      }
    }

    // ✅ Success response
    return apiResponse.success(
      res,
      "User profile updated successfully",
      result.data
    );
  } catch (error) {
    console.error("❌ Error in updateProfile:", error);
    return apiResponse.error(res, "Internal Server Error", 500);
  }
};