const apiResponse = require('../../../common/utils/apiResponse');
const { User, Event, Templates, EventGates, StaffGateAccess } = require('../../../models');
const { Op, Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const config = require('../../../config/app');
const sendEmail = require('../../../common/utils/sendEmail');
const { replaceTemplateVariables } = require('../../../common/utils/helpers');
const SALT_ROUNDS = 10;

exports.searchUsers = async (req, res) => {
    try {
        let { q } = req.query;
        const authId = req.user.id;

        // Prevent unnecessary DB hits
        if (!q || q.trim().length < 2) {
            return apiResponse.success(res, "Type at least 2 characters", []);
        }

        q = q.trim();

        const users = await User.findAll({
            where: {
                id: { [Op.ne]: authId }, // ✅ EXCLUDE logged-in user
                [Op.or]: [
                    { first_name: { [Op.like]: `%${q}%` } },
                    { last_name: { [Op.like]: `%${q}%` } },
                    Sequelize.where(
                        Sequelize.fn(
                            'concat',
                            Sequelize.col('first_name'),
                            ' ',
                            Sequelize.col('last_name')
                        ),
                        { [Op.like]: `%${q}%` }
                    ),
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
        const { first_name, last_name, email, mobile, eventId, password } = req.body;
        const parent_id = req.user.id;

        if (
            !first_name ||
            !last_name ||
            !email ||
            !mobile ||
            !password ||
            !Array.isArray(eventId) ||
            eventId.length == 0
        ) {
            return apiResponse.error(
                res,
                "All fields including password are required and eventId must be an array",
                422
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return apiResponse.error(res, "Invalid email format", 422);
        }

        /* VALIDATE EVENTS BELONG TO PARENT */
        const events = await Event.findAll({
            where: {
                id: { [Op.in]: eventId },
                event_org_id: parent_id
            }
        });

        if (events.length != eventId.length) {
            return apiResponse.error(res, "One or more events not found", 404);
        }

        const eventNames = events.map(e => e.name).join(", ");

        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { email: email.toLowerCase() },
                    { mobile }
                ]
            }
        });

        // ===== EMAIL TEMPLATE FETCH =====
        const templateId = config.emailTemplates.addStaffForEvent;

        const templateRecord = await Templates.findOne({
            where: { id: templateId }
        });

        if (!templateRecord) {
            throw new Error('Add staff email template not found');
        }

        const { subject, description } = templateRecord;

        // ===== IF USER ALREADY EXISTS =====
        if (existingUser) {

            let existingEvents = [];

            if (existingUser.eventId) {
                existingEvents = existingUser.eventId.split(',');
            }
            const newEvents = eventId.map(String);
            const mergedEvents = [...new Set([...existingEvents, ...newEvents])];
            await existingUser.update({
                eventId: mergedEvents.join(',')
            });

            // Send email to existing user
            const html = replaceTemplateVariables(description, {
                Name: `${existingUser.first_name} ${existingUser.last_name}`,
                Email: existingUser.email,
                Password: "Your existing password remains unchanged",
                EventName: eventNames,
                AddedBy: `${req.user.firstName} ${req.user.lastName}`,
                SITE_URL: config.clientUrl
            });

            const finalSubject = `${subject} ${eventNames}`;

            await sendEmail(existingUser.email, finalSubject, html);

            return apiResponse.success(res, "Existing staff updated successfully", {
                id: existingUser.id,
                full_name: `${existingUser.first_name} ${existingUser.last_name}`,
                email: existingUser.email,
                mobile: existingUser.mobile,
                eventId: mergedEvents
            });
        }

        // ===== IF NEW USER =====

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const staff = await User.create({
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            email: email.trim().toLowerCase(),
            mobile: mobile.trim(),
            role_id: 4,
            parent_id,
            password: hashedPassword,
            status: 1,
            eventId: eventId.join(',')
        });

        // Send email to new staff
        const html = replaceTemplateVariables(description, {
            Name: `${staff.first_name} ${staff.last_name}`,
            Email: staff.email,
            Password: password,
            EventName: eventNames,
            AddedBy: `${req.user.firstName} ${req.user.lastName}`,
            SITE_URL: config.clientUrl
        });

        const finalSubject = `${subject} ${eventNames}`;

        await sendEmail(staff.email, finalSubject, html);

        return apiResponse.success(res, "Staff added successfully", {
            id: staff.id,
            full_name: `${staff.first_name} ${staff.last_name}`,
            email: staff.email,
            mobile: staff.mobile,
            eventId
        });

    } catch (error) {
        console.error("Add Staff Error:", error);
        return apiResponse.error(res, "Failed to add staff", 500);
    }
};

exports.listStaff = async (req, res) => {
    try {
        const parent_id = req.user.id;

        // 🔹 Get all events of this organizer
        const events = await Event.findAll({
            where: {
                event_org_id: parent_id,
                status: 1
            },
            attributes: ['id', 'name']
        });

        const eventIds = events.map(e => e.id.toString());

        if (eventIds.length == 0) {
            return apiResponse.success(res, "No events found", {
                staff_list: [],
                event_list: []
            });
        }

        // 🔹 Find users whose eventId contains any of these events
        const staff_list = await User.findAll({
            where: {
                [Op.or]: eventIds.map(id => ({
                    eventId: {
                        [Op.like]: `%${id}%`
                    }
                }))
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

        return apiResponse.success(res, "Data fetched successfully", {
            staff_list,
            event_list: events
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
                id: staff_id
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


            // ===== EMAIL TEMPLATE FETCH =====
            const templateId = config.emailTemplates.changeStaffPassword;

            const templateRecord = await Templates.findOne({
                where: { id: templateId }
            });

            if (!templateRecord) {
                throw new Error('Add staff email template not found');
            }

            const { subject, description } = templateRecord;

            // Send email about password change
            const html = replaceTemplateVariables(description, {
                Name: `${staff.first_name} ${staff.last_name}`,
                Email: staff.email,
                NewPassword: password,
                SITE_URL: config.clientUrl
            });
            await sendEmail(staff.email, subject, html);
        }

        /* 🔄 STATUS UPDATE */
        if (status !== undefined) {
            if (!['Y', 'N'].includes(status)) {
                return apiResponse.error(res, "Invalid status value", 422);
            }
            updateData.status = status;
        }

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


// get staff gate access
exports.getStaffGateAccess = async (req, res) => {
    try {
        const userId = req.params.id;

        // 🔹 1. Get staff
        const staff = await User.findOne({
            where: { id: userId },
            attributes: ["eventId"]
        });

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff not found"
            });
        }

        // 🔹 2. Convert eventId → array
        const eventIds = staff.eventId
            ? staff.eventId.split(",").map(id => Number(id))
            : [];

        if (!eventIds.length) {
            return res.json({
                success: true,
                data: {
                    events: [],
                    eventNames: {},
                    gates: {},
                    assigned: {}
                }
            });
        }

        // 🔹 3. Get event names
        const events = await Event.findAll({
            where: { id: eventIds },
            attributes: ["id", "name"]
        });

        const eventNameMap = {};
        events.forEach(e => {
            eventNameMap[e.id] = e.name;
        });

        // 🔹 4. Get gates
        const gates = await EventGates.findAll({
            where: { event_id: eventIds },
            attributes: ["id", "title", "event_id"]
        });

        const gatesMap = {};
        gates.forEach(g => {
            if (!gatesMap[g.event_id]) {
                gatesMap[g.event_id] = [];
            }

            gatesMap[g.event_id].push({
                id: g.id,
                name: g.title
            });
        });

        // 🔹 5. Assigned
        const assigned = await StaffGateAccess.findAll({
            where: { user_id: userId },
            attributes: ["event_id", "gate_id"]
        });

        const assignedMap = {};
        assigned.forEach(a => {
            assignedMap[a.event_id] = a.gate_id;
        });

        // 🔹 Final Response
        return res.json({
            success: true,
            data: {
                events: eventIds,
                eventNames: eventNameMap, // ✅ NEW
                gates: gatesMap,
                assigned: assignedMap
            }
        });

    } catch (error) {
        console.error("GET Gate Access Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// save gateAccess functionality.. New
exports.saveStaffGateAccess = async (req, res) => {
    try {
        const { user_id, eventGateMap } = req.body;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "User ID required"
            });
        }

        // 🔹 1. Delete old
        await StaffGateAccess.destroy({ where: { user_id } });

        // 🔹 2. Prepare data
        const insertData = [];
        const eventIds = [];
        const gateIds = [];

        for (const eventId in eventGateMap) {
            const gateId = eventGateMap[eventId];

            if (gateId) {
                insertData.push({
                    user_id,
                    event_id: Number(eventId),
                    gate_id: gateId
                });

                eventIds.push(Number(eventId));
                gateIds.push(gateId);
            }
        }

        // 🔹 3. Insert
        if (insertData.length) {
            await StaffGateAccess.bulkCreate(insertData);
        }

        // ================= EMAIL PART =================

        // 🔹 4. Get user
        const user = await User.findOne({
            where: { id: user_id },
            attributes: ["first_name", "last_name", "email"]
        });

        if (user && user.email && insertData.length) {

            // 🔹 5. Get event names
            const events = await Event.findAll({
                where: { id: eventIds },
                attributes: ["id", "name"]
            });

            const eventMap = {};
            events.forEach(e => {
                eventMap[e.id] = e.name;
            });

            // 🔹 6. Get gate names
            const gates = await EventGates.findAll({
                where: { id: gateIds },
                attributes: ["id", "title"]
            });

            const gateMap = {};
            gates.forEach(g => {
                gateMap[g.id] = g.title;
            });

            // 🔹 7. Build HTML list
            let accessList = "";

            insertData.forEach(item => {
                accessList += `
                    <li>
                        <b>${eventMap[item.event_id] || "Event"}</b> → 
                        ${gateMap[item.gate_id] || "Gate"}
                    </li>
                `;
            });

            // 🔹 8. Email HTML
            const html = `
                <div style="font-family: Arial; padding: 10px;">
                    <h2>Gate Access Assigned</h2>

                    <p>Hi ${user.first_name} ${user.last_name},</p>

                    <p>You have been assigned the following gate access:</p>

                    <ul>
                        ${accessList}
                    </ul>

                    <p>Please use your login to access the system.</p>

                    <br/>
                    <p>Regards,<br/>Admin Team</p>
                </div>
            `;

            const subject = "Gate Access Assigned";

            // 🔹 9. Send email
            await sendEmail(user.email, subject, html);
        }

        // ================= END EMAIL =================

        return res.json({
            success: true,
            message: "Gate access saved successfully"
        });

    } catch (error) {
        console.error("SAVE Gate Access Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};