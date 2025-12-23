const apiResponse = require('../../../common/utils/apiResponse');
const committeeTicketIgnoredTemplate = require('../../../common/utils/emailTemplates/committeeIgnore');
const committeeTicketApprovedTemplate = require('../../../common/utils/emailTemplates/committeeApprove');
const sendEmail = require('../../../common/utils/sendEmail');
const { convertUTCToLocal } = require('../../../common/utils/timezone');
const { CommitteeMembers, CommitteeAssignTickets, User, Event, Cart, TicketType } = require('../../../models');
const config = require('../../../config/app');

exports.handleAction = async (req, res) => {
    try {
        const committee_user_id = req.user.id;
        const { cart_id, action } = req.body; // approve | ignore

        /* ================= VALIDATION ================= */
        if (!cart_id || !['approve', 'ignore'].includes(action)) {
            return apiResponse.error(
                res,
                "Invalid request. cart_id and a valid action (approve or ignore) are required.",
                400
            );
        }

        /* ================= FIND CART ================= */
        const cartItem = await Cart.findOne({
            where: {
                id: cart_id,
                ticket_type: 'committesale',
                commitee_user_id: committee_user_id
            },
            include: [
                { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] },
                { model: Event, as: 'events', attributes: ['id', 'name'] },
                { model: TicketType, attributes: ['id', 'title'] }
            ]
        });

        if (!cartItem) {
            return apiResponse.error(
                res,
                "Committee ticket request not found or already processed.",
                404
            );
        }

        const user = cartItem.user;
        const event = cartItem.events;
        const ticket = cartItem.TicketType;

        /* ================= IGNORE REQUEST ================= */
        if (action == 'ignore') {
            await cartItem.update({ status: 'I' });

            if (user?.email) {
                sendEmail(
                    user.email,
                    'Committee Ticket Request Update',
                    committeeTicketIgnoredTemplate(user, event, ticket)
                );
            }

            return apiResponse.success(
                res,
                "The committee ticket request has been successfully ignored."
            );
        }

        /* ================= APPROVE REQUEST ================= */
        const assign = await CommitteeAssignTickets.findOne({
            where: {
                event_id: cartItem.event_id,
                ticket_id: cartItem.ticket_id,
                user_id: committee_user_id,
                status: 'Y'
            }
        });

        if (!assign) {
            return apiResponse.error(
                res,
                "Committee ticket allocation not found for this event.",
                404
            );
        }

        const used = assign.usedticket || 0;
        const available = assign.count - used;

        if (available < 1) {
            return apiResponse.error(
                res,
                "All committee tickets for this category have already been allocated.",
                400
            );
        }

        // 🔒 Update allocation and cart status
        await assign.update({ usedticket: used + 1 });
        await cartItem.update({ status: 'Y' });

        /* ================= APPROVAL EMAIL ================= */
        if (user?.email) {
            sendEmail(
                user.email,
                'Committee Ticket Approved',
                committeeTicketApprovedTemplate(
                    user,
                    event,
                    ticket,
                    `${config.clientUrl}/events/book/${event.id}`
                )
            );
        }

        return apiResponse.success(
            res,
            "Committee ticket approved successfully. The user has been notified via email."
        );

    } catch (error) {
        console.error("handleAction error:", error);
        return apiResponse.error(
            res,
            "Something went wrong while processing the committee ticket request.",
            500
        );
    }
};

exports.requestList = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { status } = req.params;

        const whereCondition = {
            commitee_user_id: user_id,
            ticket_type: 'committesale',
        };

        const baseUrl = (process.env.BASE_URL || "http://localhost:5000").replace(/\/$/, '');

        // ✅ FULL PATHS READY (no frontend concat needed)
        const assets = {
            event_image_path: `${baseUrl}/uploads/events`,
            profile_image_path: `${baseUrl}/uploads/profile`,
        };

        const cartList = await Cart.findAll({
            where: whereCondition,
            order: [['id', 'DESC']],
            include: [
                {
                    model: Event,
                    as: 'events',
                    attributes: ['id', 'name', 'date_from', 'date_to', 'feat_image', 'location']
                },
                {
                    model: TicketType,
                    attributes: ['id', 'title', 'price']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'email', 'mobile', 'profile_image']
                },
            ],
            attributes: [
                'id',
                'event_id',
                'commitee_user_id',
                'user_id',
                'no_tickets',
                'ticket_type',
                'status',
                'createdAt'
            ]
        });

        let events = [];

        // 🔥 Only when status = T
        if (status == 'T') {
            const eventIds = [...new Set(cartList.map(item => item.event_id))];

            events = await Event.findAll({
                where: { id: eventIds },
                attributes: ['id', 'name', 'location', 'date_from', 'date_to', 'feat_image']
            });
        }

        return apiResponse.success(res, 'Committee requests fetched', {
            count: cartList.length,
            list: cartList,
            events,
            assets, // ✅ FULL URLs INCLUDED
        });

    } catch (error) {
        console.error(error);
        return apiResponse.error(res, 'Error fetching committee requests', 500);
    }
};

exports.updateAssignedTickets = async (req, res) => {
    try {
        const { event_id, user_id, tickets } = req.body;

        /* ================= VALIDATE MEMBER ================= */
        const member = await CommitteeMembers.findOne({
            where: {
                event_id,
                user_id,
                status: 'Y'
            }
        });

        if (!member) {
            return apiResponse.error(
                res,
                "Committee member not found for this event",
                404
            );
        }

        /* ================= PROCESS TICKETS ================= */
        for (const ticket_id of Object.keys(tickets)) {
            const count = parseInt(tickets[ticket_id]) || 0;

            const existing = await CommitteeAssignTickets.findOne({
                where: {
                    event_id,
                    user_id,
                    ticket_id
                }
            });

            // 👉 If count is 0 → delete row
            if (count == 0) {
                if (existing) {
                    await existing.destroy();
                }
                continue;
            }

            // 👉 Update existing
            if (existing) {
                // 🔒 Prevent lowering below used tickets
                if (existing.usedticket > count) {
                    return apiResponse.error(
                        res,
                        `Cannot reduce tickets below used count for ticket ${ticket_id}`,
                        400
                    );
                }

                await existing.update({
                    count
                });
            }
            // 👉 Create new
            else {
                await CommitteeAssignTickets.create({
                    event_id,
                    user_id,
                    ticket_id,
                    count,
                    usedticket: 0,
                    status: 'Y'
                });
            }
        }

        return apiResponse.success(
            res,
            "Committee tickets updated successfully"
        );

    } catch (error) {
        console.error("updateAssignedTickets error:", error);
        return apiResponse.error(
            res,
            "Failed to update committee tickets",
            500
        );
    }
};
/* 🔁 COMMON FUNCTION */
const fetchMemberList = async (event_id) => {
    return await CommitteeMembers.findAll({
        where: { event_id },
        include: [{
            model: User,
            as: 'user', // 🔥 MUST MATCH ASSOCIATION
            attributes: ['id', 'first_name', 'last_name', 'email', 'mobile']
        }],
        attributes: ['id', 'status', 'createdAt'],
        order: [['id', 'DESC']]
    });
};

/* ================= ASSIGNED TICKET LIST ================= */
exports.assignTicketList = async (req, res) => {
    try {
        const { event_id } = req.params;

        if (!event_id) {
            return apiResponse.error(res, "Event ID is required", 400);
        }

        const assignedTickets = await CommitteeMembers.findAll({
            where: {
                event_id
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: [
                        'id',
                        'first_name',
                        'last_name',
                        'email',
                        'mobile'
                    ]
                },
                {
                    model: CommitteeAssignTickets,
                    as: 'assignedTickets',
                    required: false, // 🔥 LEFT JOIN (ticket ho ya na ho)
                    where: {
                        event_id
                    },
                    attributes: [
                        'id',
                        'ticket_id',
                        'count',
                        'usedticket',
                        'status'
                    ]
                }
            ],
            attributes: [
                'id',
                'user_id',
                'status'
            ],
            order: [['id', 'DESC']]
        });

        return apiResponse.success(
            res,
            "Assigned committee tickets fetched successfully",
            assignedTickets
        );

    } catch (error) {
        console.error("assignTicketList error:", error);
        return apiResponse.error(res, "Failed to fetch assigned tickets", 500);
    }
};

/* ================= ADD MEMBER ================= */
exports.addMember = async (req, res) => {
    try {
        const login_user_id = req.user.id;
        const { event_id, user_id } = req.body;

        const alreadyAdded = await CommitteeMembers.findOne({
            where: { event_id, user_id }
        });

        if (alreadyAdded) {
            return apiResponse.error(res, "Member already added", 409);
        }

        await CommitteeMembers.create({
            event_id,
            user_id,
            added_by: login_user_id,
            status: 'Y'
        });

        /* 🍫 RETURN LIST AFTER CREATE */
        const members = await fetchMemberList(event_id);

        return apiResponse.success(res, "Member added successfully", members);

    } catch (error) {
        console.error(error);
        return apiResponse.error(res, "Something went wrong", 500);
    }
};

/* ================= LIST MEMBERS ================= */
exports.listMembers = async (req, res) => {
    try {
        const { event_id } = req.params;

        const members = await fetchMemberList(event_id);

        return apiResponse.success(res, "Committee members fetched", members);

    } catch (error) {
        console.error(error);
        return apiResponse.error(res, "Failed to fetch members", 500);
    }
};

exports.changeMemberStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const member = await CommitteeMembers.findByPk(id);

        if (!member) {
            return apiResponse.error(res, "Committee member not found", 404);
        }

        await member.update({
            status,
            updatedAt: new Date()
        });

        return apiResponse.success(res, "Member status updated successfully", {
            member_id: member.id,
            status
        });

    } catch (error) {
        console.error(error);
        return apiResponse.error(res, "Failed to update member status", 500);
    }
};

exports.deleteMember = async (req, res) => {
    try {
        const { id } = req.params;

        const member = await CommitteeMembers.findByPk(id);

        if (!member) {
            return apiResponse.error(res, "Committee member not found", 404);
        }

        await member.destroy();

        return apiResponse.success(res, "Member removed successfully", {
            member_id: id
        });

    } catch (error) {
        console.error(error);
        return apiResponse.error(res, "Failed to delete member", 500);
    }
};