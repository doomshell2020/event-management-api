const apiResponse = require('../../../common/utils/apiResponse');
const committeeTicketIgnoredTemplate = require('../../../common/utils/emailTemplates/committeeIgnore');
const committeeTicketApprovedTemplate = require('../../../common/utils/emailTemplates/committeeApprove');
const committeeTicketAssignedTemplate = require('../../../common/utils/emailTemplates/committeeTicketAssignedTemplate ');
const sendEmail = require('../../../common/utils/sendEmail');
const { convertUTCToLocal } = require('../../../common/utils/timezone');
const { sequelize } = require("../../../models");
const config = require('../../../config/app');
const { CommitteeMembers, CartQuestionsDetails, OrderItems, QuestionItems, Questions, CommitteeAssignTickets, CommitteeGroup, CommitteeGroupMember, AddonTypes, Company, Currency, User, Event, Cart, TicketType } = require('../../../models');
const { pushFromCommitteeCompsTicket } = require('../tickets/tickets.service');


exports.importCommitteeMembers = async (req, res) => {
    try {
        const { from_event_id, to_event_id } = req.body;
        const addedBy = req.user.id;

        // ✅ Basic validation
        if (!from_event_id || !to_event_id) {
            return apiResponse.validation(
                res,
                [],
                'from_event_id and to_event_id are required'
            );
        }

        if (from_event_id == to_event_id) {
            return apiResponse.validation(
                res,
                [],
                'Source and destination events cannot be the same'
            );
        }

        // ✅ Check events exist
        const [fromEvent, toEvent] = await Promise.all([
            Event.findByPk(from_event_id),
            Event.findByPk(to_event_id)
        ]);

        if (!fromEvent || !toEvent) {
            return apiResponse.notFound(
                res,
                'One or both events not found'
            );
        }

        // ✅ Fetch source event committee members
        const sourceMembers = await CommitteeMembers.findAll({
            where: { event_id: from_event_id }
        });

        if (!sourceMembers.length) {
            return apiResponse.success(
                res,
                'No committee members found to import',
                { imported: 0 }
            );
        }

        // ✅ Fetch existing committee members of target event
        const existingMembers = await CommitteeMembers.findAll({
            where: { event_id: to_event_id },
            attributes: ['user_id']
        });

        const existingUserIds = new Set(
            existingMembers.map(m => m.user_id)
        );

        // ✅ Prepare members to insert (skip existing)
        const membersToInsert = sourceMembers
            .filter(member => !existingUserIds.has(member.user_id))
            .map(member => ({
                event_id: to_event_id,
                user_id: member.user_id,
                status: member.status || 'Y',
                // added_by: addedBy,
            }));

        if (!membersToInsert.length) {
            return apiResponse.success(
                res,
                'All committee members already exist in this event',
                { imported: 0 }
            );
        }

        // ✅ Bulk insert new members
        await CommitteeMembers.bulkCreate(membersToInsert);

        return apiResponse.success(
            res,
            'Committee members imported successfully',
            {
                imported: membersToInsert.length
            }
        );

    } catch (error) {
        console.error('Error importing committee members:', error);
        return apiResponse.error(
            res,
            'Internal server error',
            500
        );
    }
};

exports.listGroupMembers = async (req, res) => {
    try {
        const { groupId } = req.params;

        const members = await CommitteeGroupMember.findAll({
            where: { group_id: groupId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'email', 'mobile']
                }
            ],
            order: [['createdAt', 'ASC']]
        });

        return apiResponse.success(res, 'Group members fetched successfully', members);
    } catch (err) {
        console.error(err);
        return apiResponse.error(res, 'Failed to fetch group members');
    }
};

exports.addGroupMember = async (req, res) => {
    try {
        const { group_id, user_id, event_id } = req.body;
        const addedBy = req.user.id;

        // check if already added
        const existing = await CommitteeGroupMember.findOne({
            where: { group_id, user_id }
        });

        if (existing) {
            return apiResponse.error(res, 'User already in this group');
        }

        const member = await CommitteeGroupMember.create({
            group_id,
            user_id,
            event_id,
            added_by: addedBy
        });

        return apiResponse.success(res, 'Member added successfully', member);
    } catch (err) {
        console.error(err);
        return apiResponse.error(res, 'Failed to add member');
    }
};

exports.listCommitteeGroups = async (req, res) => {
    try {
        const committee_user_id = req.user.id;
        const { event_id } = req.params;

        const groups = await CommitteeGroup.findAll({
            where: {
                event_id,
                // committee_user_id,
                status: 'Y'
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
            order: [['createdAt', 'DESC']],
            raw: true
        });

        return apiResponse.success(
            res,
            "Committee groups fetched successfully",
            groups
        );

    } catch (error) {
        console.error("listCommitteeGroups error:", error);
        return apiResponse.error(
            res,
            "Failed to fetch committee groups",
            500
        );
    }
};

exports.createCommitteeGroup = async (req, res) => {
    try {
        const committee_user_id = req.user.id;
        const { event_id, group_name } = req.body;

        const normalizedName = group_name.trim();

        /* ================= DUPLICATE CHECK ================= */
        const existingGroup = await CommitteeGroup.findOne({
            where: {
                event_id,
                name: normalizedName,
                status: 'Y'
            }
        });

        if (existingGroup) {
            return apiResponse.error(
                res,
                "Group with this name already exists",
                409
            );
        }

        /* ================= CREATE GROUP ================= */
        const newGroup = await CommitteeGroup.create({
            event_id,
            committee_user_id,
            name: normalizedName,
            status: 'Y'
        });

        return apiResponse.success(
            res,
            "Committee group created successfully",
            newGroup
        );

    } catch (error) {
        console.error("createCommitteeGroup error:", error);
        return apiResponse.error(
            res,
            "Failed to create committee group",
            500
        );
    }
};

exports.handleCommitteePushTicket = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const committee_user_id = req.user.id;
        const { event_id, email, tickets } = req.body;

        /* ================= EVENT CHECK ================= */
        const event = await Event.findByPk(event_id);
        if (!event) {
            return apiResponse.error(res, "Event not found", 404);
        }

        /* ================= USER CHECK ================= */
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return apiResponse.error(res, "User not found with this email", 404);
        }

        /* ================= ASSIGNED TICKETS ================= */
        const assignedTickets = await CommitteeAssignTickets.findAll({
            where: { event_id, user_id: committee_user_id, status: "Y" },
            raw: true
        });

        if (!assignedTickets.length) {
            return apiResponse.error(res, "No tickets assigned to committee member", 403);
        }

        const assignedMap = {};
        assignedTickets.forEach(t => {
            assignedMap[String(t.ticket_id)] = t;
        });

        /* ================= TICKET TYPES ================= */
        const ticketTypeIds = tickets.map(t => t.ticket_id);
        const ticketTypes = await TicketType.findAll({
            where: { id: ticketTypeIds },
            attributes: ["id", "title", "type"],
            raw: true
        });

        const ticketMap = {};
        ticketTypes.forEach(t => {
            ticketMap[String(t.id)] = t;
        });

        /* ================= PROCESS TICKETS ================= */
        for (const item of tickets) {
            const { ticket_id, qty } = item;

            const assigned = assignedMap[String(ticket_id)];
            if (!assigned) {
                throw new Error("Ticket not assigned to committee member");
            }

            const ticketType = ticketMap[String(ticket_id)];
            if (!ticketType) {
                throw new Error("Invalid ticket type");
            }

            const available = assigned.count - assigned.usedticket;
            if (qty > available) {
                throw new Error(`Only ${available} tickets available`);
            }

            /* ================= COMPS TICKETS ================= */
            if (ticketType.type == "comps") {

                /* 🔍 DUPLICATE COMPS CHECK */
                const existingComps = await OrderItems.findOne({
                    where: {
                        event_id,
                        user_id: user.id,
                        ticket_id
                    }
                });

                if (existingComps) {
                    throw new Error(
                        `Complimentary ticket already generated for "${ticketType.title}"`
                    );
                }

                /* 🎟 GENERATE COMPS TICKETS (QTY TIMES) */
                for (let i = 0; i < qty; i++) {
                    const result = await pushFromCommitteeCompsTicket({
                        event_id,
                        user_id: user.id,
                        ticket_id,
                        createdBy: committee_user_id
                    });

                    if (!result || !result.success) {
                        throw new Error("Failed to generate complimentary ticket");
                    }
                }

            } else {
                /* ================= PAID / NORMAL TICKETS ================= */

                const exists = await Cart.findOne({
                    where: {
                        user_id: user.id,
                        event_id,
                        ticket_id,
                        ticket_type: ticketType.type,
                        status: "Y"
                    },
                    transaction
                });

                if (exists) {
                    throw new Error(`Ticket "${ticketType.title}" already assigned`);
                }

                await Cart.create({
                    user_id: user.id,
                    event_id,
                    ticket_id,
                    no_tickets: qty,
                    ticket_type: "committesale",
                    commitee_user_id: committee_user_id,
                    status: "Y"
                }, { transaction });
            }

            /* ================= UPDATE COMMITTEE COUNT ================= */
            await CommitteeAssignTickets.update(
                {
                    usedticket: sequelize.literal(`usedticket + ${qty}`)
                },
                {
                    where: { id: assigned.id },
                    transaction
                }
            );
        }

        await transaction.commit();

        /* ================= SUMMARY EMAIL ================= */
        const emailTickets = tickets.map(t => ({
            title: ticketMap[String(t.ticket_id)].title,
            qty: t.qty
        }));

        await sendEmail(
            user.email,
            "Committee Ticket Assigned",
            committeeTicketAssignedTemplate(
                user,
                event,
                emailTickets,
                `${config.clientUrl}`
            )
        );

        return apiResponse.success(
            res,
            "Tickets successfully pushed and email sent",
            null
        );

    } catch (error) {
        await transaction.rollback();

        console.error("handleCommitteePushTicket error:", error);
        return apiResponse.error(
            res,
            error.message || "Something went wrong while pushing tickets",
            400
        );
    }
};

exports.handleCommitteeTicketDetails = async (req, res) => {
    try {
        const committee_user_id = req.user.id;
        const { event_id } = req.body;

        /* ================= VALIDATION ================= */
        if (!event_id) {
            return apiResponse.error(
                res,
                "Event ID is required",
                400
            );
        }

        /* ================= EVENT CHECK ================= */
        const eventExists = await Event.findByPk(event_id);
        if (!eventExists) {
            return apiResponse.error(
                res,
                "Associated event not found",
                404
            );
        }

        /* ================= EVENT DETAILS ================= */
        const eventDetails = await Event.findOne({
            where: { id: event_id },
            attributes: ["id", "name", "location", "slug"],
            include: [
                {
                    model: Company,
                    as: "companyInfo",
                    attributes: ["name"]
                },
                {
                    model: Currency,
                    as: "currencyName",
                    attributes: ["Currency_symbol", "Currency"]
                }
            ]
        });

        /* ================= ASSIGNED TICKET DETAILS ================= */
        const assignedTickets = await CommitteeAssignTickets.findAll({
            where: {
                event_id,
                user_id: committee_user_id,
                status: 'Y'
            },
            include: [
                {
                    model: TicketType,
                    as: 'ticket',
                    attributes: ['id', 'title', 'price', 'type']
                }
            ],
            attributes: [
                'id',
                'ticket_id',
                'count',
                'usedticket',
                'status'
            ]
        });

        /* ================= RESPONSE ================= */
        return apiResponse.success(
            res,
            "Committee ticket details fetched successfully",
            {
                event: eventDetails,
                tickets: assignedTickets
            }
        );

    } catch (error) {
        console.error("handleCommitteeTicketDetails error:", error);
        return apiResponse.error(
            res,
            "Something went wrong while fetching committee ticket details",
            500
        );
    }
};

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
                    `${config.clientUrl}`
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
            attributes: [
                'id',
                'event_id',
                'commitee_user_id',
                'user_id',
                'no_tickets',
                'ticket_type',
                'status',
                'createdAt'
            ],
            include: [
                {
                    model: Event,
                    as: 'events',
                    attributes: ['id', 'name', 'date_from', 'date_to', 'feat_image', 'location'],
                    include: [
                        {
                            model: Company,
                            as: 'companyInfo',
                            attributes: ['name']
                        },
                        {
                            model: Currency,
                            as: 'currencyName',
                            attributes: ['Currency_symbol', 'Currency']
                        }
                    ]
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
                {
                    model: CartQuestionsDetails,
                    as: 'questionsList',
                    attributes: ['id', 'user_reply'],
                    include: [
                        {
                            model: Questions,
                            as: 'question',
                            attributes: ['question', 'type', 'name'],
                            include: [
                                {
                                    model: QuestionItems,
                                    as: 'questionItems',
                                    attributes: ['items']
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        let events = [];
        let completedData;

        if (status == 'T') {

            const committeeEvents = await CommitteeMembers.findAll({
                where: {
                    user_id: user_id,
                    status: 'Y'
                },
                attributes: ['event_id'],
                group: ['event_id'], // 🔑 UNIQUE event_id
                raw: true
            });

            const eventIds = committeeEvents.map(item => item.event_id);
            // console.log('eventIds :', eventIds);

            events = await Event.findAll({
                where: {
                    id: eventIds
                },
                attributes: [
                    'id',
                    'name',
                    'location',
                    'date_from',
                    'date_to',
                    'feat_image'
                ],
                include: [
                    { model: Company, as: "companyInfo", attributes: ["name"] },
                    { model: Currency, as: "currencyName", attributes: ["Currency_symbol", "Currency"] }
                ]
            });
        }

        completedData = await OrderItems.findAll({
            where: { committee_user_id: user_id },
            attributes: ["order_id"],
            include: [
                {
                    model: Event, as: "event",
                    attributes: [
                        'id',
                        'name',
                        'location',
                        'date_from',
                        'date_to',
                        'feat_image'
                    ],
                    include: [
                        { model: Company, as: "companyInfo", attributes: ["name"] },
                        { model: Currency, as: "currencyName", attributes: ["Currency_symbol", "Currency"] }
                    ]
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['first_name', 'last_name', 'email', 'mobile', 'profile_image']
                },
                {
                    model: TicketType,
                    as: "ticketType",
                    attributes: ["id", "title", "price"]
                }
            ],
            raw: true
        });
        // console.log('completedData :', completedData);

        return apiResponse.success(res, 'Committee requests fetched', {
            count: cartList.length,
            list: cartList,
            completedData,
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