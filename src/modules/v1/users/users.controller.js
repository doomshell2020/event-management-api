const apiResponse = require('../../../common/utils/apiResponse');
const { User, Event } = require('../../../models');
const { Op, Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = "Staff@123";


exports.searchUsers = async (req, res) => {
    try {
        let { q } = req.query;

        // Prevent unnecessary DB hits
        if (!q || q.trim().length < 2) {
            return apiResponse.success(res, "Type at least 2 characters", []);
        }

        q = q.trim();

        /* 🔥 SINGLE QUERY – MULTI FIELD SEARCH */
        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { first_name: { [Op.like]: `%${q}%` } },
                    { last_name: { [Op.like]: `%${q}%` } },
                    {
                        // full name search: first_name + last_name
                        [Op.and]: Sequelize.where(
                            Sequelize.fn(
                                'concat',
                                Sequelize.col('first_name'),
                                ' ',
                                Sequelize.col('last_name')
                            ),
                            { [Op.like]: `%${q}%` }
                        )
                    },
                    { email: { [Op.like]: `%${q}%` } },
                    { mobile: { [Op.like]: `%${q}%` } }
                ]
            },
            attributes: [
                'id',
                'first_name',
                'last_name',
                'email',
                'mobile'
            ],
            limit: 10,
            order: [['id', 'DESC']]
        });

        return apiResponse.success(res, "Users fetched successfully", users);

    } catch (error) {
        console.error(error);
        return apiResponse.error(res, "Failed to search users", 500);
    }
};

exports.addStaff = async (req, res) => {
    try {
        const { first_name, last_name, email, mobile, eventId } = req.body;
        const parent_id = req.user.id;

        const DEFAULT_PASSWORD = "Staff@123";
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

        if (
            !first_name ||
            !last_name ||
            !email ||
            !mobile ||
            !Array.isArray(eventId) ||
            eventId.length == 0
        ) {
            return apiResponse.error(
                res,
                "All fields are required and eventId must be an array",
                422
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return apiResponse.error(res, "Invalid email format", 422);
        }

        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { email: email.toLowerCase() },
                    { mobile }
                ]
            }
        });

        if (existingUser) {
            return apiResponse.error(
                res,
                "User with same email or mobile already exists",
                422
            );
        }

        /* ✅ VALIDATE EVENTS BELONG TO PARENT */
        const events = await Event.findAll({
            where: {
                id: { [Op.in]: eventId },
                event_org_id: parent_id
            }
        });

        if (events.length != eventId.length) {
            return apiResponse.error(res, "One or more events not found", 404);
        }

        const staff = await User.create({
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            email: email.trim().toLowerCase(),
            mobile: mobile.trim(),
            role_id: 4,
            parent_id,
            password: hashedPassword,
            status: 1
        });

        const staffEvents = eventId.map(event_id => ({
            user_id: staff.id,
            event_id
        }));

        // await sequelize.models.EventStaff.bulkCreate(staffEvents);

        return apiResponse.success(res, "Staff added successfully", {
            id: staff.id,
            full_name: `${staff.first_name} ${staff.last_name}`,
            email: staff.email,
            mobile: staff.mobile,
            eventId,
            default_password: DEFAULT_PASSWORD // send once
        });

    } catch (error) {
        console.error("Add Staff Error:", error);
        return apiResponse.error(res, "Failed to add staff", 500);
    }
};

exports.listStaff = async (req, res) => {
    try {
        const parent_id = req.user.id;

        /* 🔹 STAFF LIST */
        const staff_list = await User.findAll({
            where: {
                role_id: 4,        // Ticket Scanner
                parent_id
            },
            attributes: [
                'id',
                'first_name',
                'last_name',
                'email',
                'mobile',
                'eventId',
                'status',
                'createdAt'
            ],
            order: [['id', 'DESC']]
        });

        /* 🔹 EVENT LIST (Parent Events) */
        const event_list = await Event.findAll({
            where: {
                event_org_id: parent_id,
                status: 1
            },
            attributes: ['id', 'name'],
            order: [['id', 'DESC']]
        });

        return apiResponse.success(res, "Data fetched successfully", {
            staff_list,
            event_list
        });

    } catch (error) {
        console.error("List Staff Error:", error);
        return apiResponse.error(res, "Failed to fetch data", 500);
    }
};

exports.editStaff = async (req, res) => {
    try {
        const parent_id = req.user.id;
        const { id: staff_id } = req.params;
        const { first_name, last_name, password, status, eventId } = req.body;

        /* 🔴 FIND STAFF (PARENT SAFE) */
        const staff = await User.findOne({
            where: {
                id: staff_id,
                parent_id,
                role_id: 4
            }
        });

        if (!staff) {
            return apiResponse.error(res, "Staff not found", 404);
        }

        const updateData = {};

        /* ✅ NAME UPDATE */
        if (first_name) updateData.first_name = first_name.trim();
        if (last_name) updateData.last_name = last_name.trim();

        /* 🔐 PASSWORD UPDATE */
        if (password) {
            if (password.length < 6) {
                return apiResponse.error(res, "Password must be at least 6 characters", 422);
            }
            updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
        }

        /* 🔄 STATUS UPDATE */
        if (status !== undefined) {
            if (!['Y', 'N'].includes(status)) {
                return apiResponse.error(res, "Invalid status value", 422);
            }
            updateData.status = status;
        }
        
        console.log('updateData :', updateData);
        // 🔁 EVENT IDS UPDATE (store in user table directly)
        if (eventId && Array.isArray(eventId)) {
            updateData.eventId = eventId.join(','); // or JSON.stringify(eventId) if column is JSON
        }

        /* 🚫 EMAIL & MOBILE NOT EDITABLE */
        delete updateData.email;
        delete updateData.mobile;

        /* 🔁 UPDATE STAFF BASIC DATA */
        await staff.update(updateData);
        return apiResponse.success(res, "Staff updated successfully", null);

    } catch (error) {
        console.error("Edit Staff Error:", error);
        return apiResponse.error(res, "Failed to update staff", 500);
    }
};
