const apiResponse = require('../../../common/utils/apiResponse');
const { CommitteeMembers, CommitteeAssignTickets, User, Event, Cart, TicketType } = require('../../../models');

exports.requestList = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { status } = req.params;
        
        const whereCondition = { commitee_user_id: user_id, ticket_type: 'committesale' };
        // if (status) whereCondition.status = status;
        
        const cartList = await Cart.findAll({
            where: whereCondition,
            order: [['id', 'DESC']],
            include: [
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
            attributes: ['id', 'event_id','commitee_user_id', 'user_id', 'no_tickets', 'ticket_type', 'status', 'createdAt']
        });

        // ✅ Send raw Sequelize data directly
        return apiResponse.success(res, 'Committee requests fetched', {
            count: cartList.length,
            list: cartList,
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

