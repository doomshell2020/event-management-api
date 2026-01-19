const express = require('express');
const router = express.Router();
const committeeController = require('./committee.controller');
const { body, param } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');

router.post('/import-committee-members',
    authenticate,
    [
        body('from_event_id')
            .notEmpty().withMessage('Source event ID is required')
            .isInt().withMessage('Source event ID must be a number'),

        body('to_event_id')
            .notEmpty().withMessage('Target event ID is required')
            .isInt().withMessage('Target event ID must be a number'),
    ],
    validate,
    committeeController.importCommitteeMembers
);

// List all members of a group
router.get('/groups/:groupId/members',
    authenticate,
    [
        param('groupId').notEmpty().withMessage('Group ID is required').isInt().withMessage('Group ID must be an integer')
    ],
    validate,
    committeeController.listGroupMembers
);

router.post('/group/add-member',
    authenticate,
    [
        body('group_id').notEmpty().withMessage('Group ID is required').isInt().withMessage('Group ID must be an integer'),
        body('user_id').notEmpty().withMessage('User ID is required').isInt().withMessage('User ID must be an integer'),
        body('event_id').notEmpty().withMessage('Event ID is required').isInt().withMessage('Event ID must be an integer')
    ],
    validate,
    committeeController.addGroupMember
);

router.get('/groups/:event_id',
    authenticate,
    [
        param('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be a number'),
    ],
    validate,
    committeeController.listCommitteeGroups
);

// CREATE COMMITTEE GROUP
router.post('/groups/create',
    authenticate,
    [
        body('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be a number'),

        body('group_name')
            .notEmpty().withMessage('Group name is required')
            .isLength({ min: 2 })
            .withMessage('Group name must be at least 2 characters'),
    ],
    validate,
    committeeController.createCommitteeGroup
);

router.post("/push-ticket",
    authenticate,
    [
        body("event_id")
            .notEmpty().withMessage("event_id is required")
            .isInt().withMessage("event_id must be a number"),

        body("email")
            .notEmpty().withMessage("Email is required")
            .isEmail().withMessage("Invalid email address"),

        body("tickets")
            .isArray({ min: 1 })
            .withMessage("At least one ticket must be selected"),

        body("tickets.*.ticket_id")
            .notEmpty().withMessage("ticket_id is required")
            .isInt().withMessage("ticket_id must be a number"),

        body("tickets.*.qty")
            .notEmpty().withMessage("qty is required")
            .isInt({ min: 1 })
            .withMessage("qty must be at least 1"),
    ],
    validate,
    committeeController.handleCommitteePushTicket
);

router.post(`/committee-ticket-details`,
    authenticate,
    [
        body('event_id')
            .notEmpty()
            .withMessage('Request event_id is required')
            .isInt()
            .withMessage('Request event_id must be a number')
    ],
    validate,
    committeeController.handleCommitteeTicketDetails
)

// Committee Requests List (by status)
router.get('/requests/:status',
    authenticate,
    [
        param('status')
            .isIn(['T', 'Y', 'N', 'I', 'C'])
            .withMessage('Invalid status Y|N|I|C is required Y=Approved, N=Rejected, I=Ignored, C=Completed'),
    ],
    validate,
    committeeController.requestList
);

// Committee Request Action (Approve / Ignore)
router.post('/action',
    authenticate,
    [
        body('cart_id')
            .notEmpty()
            .withMessage('Request cart_id is required')
            .isInt()
            .withMessage('Request cart_id must be a number'),
        body('action')
            .notEmpty()
            .withMessage('Action is required')
            .isIn(['approve', 'ignore'])
            .withMessage('Action must be either "approve" or "ignore"'),
    ],
    validate,
    committeeController.handleAction
);

// Create Event Route
router.post('/member/add-member',
    authenticate,
    [
        body("event_id")
            .notEmpty().withMessage("Event ID is required")
            .isInt().withMessage("Event ID must be an integer"),
        // TICKET
        body("user_id")
            .if(body("item_type").equals("ticket"))
            .notEmpty().withMessage("user_id is required for ticket type")
            .isInt().withMessage("user_id must be an integer"),

    ],
    validate,
    committeeController.addMember
);

// Change member status
router.put('/member/status/:id',
    authenticate,
    [
        param('id')
            .notEmpty().withMessage('Member ID is required')
            .isInt().withMessage('Member ID must be integer'),
        body('status')
            .notEmpty().withMessage('Status is required')
            .isIn(['Y', 'N']).withMessage('Status must be Y or N')
    ],
    validate,
    committeeController.changeMemberStatus
);

// Delete committee member
router.delete('/member/:id',
    authenticate,
    [
        param('id')
            .notEmpty().withMessage('Member ID is required')
            .isInt().withMessage('Member ID must be integer')
    ],
    validate,
    committeeController.deleteMember
);
/* LIST MEMBERS */
router.get('/members/list/:event_id',
    authenticate,
    [
        param('event_id').isInt().withMessage('Event ID required')
    ],
    validate,
    committeeController.listMembers
);

router.get('/ticket/assign-list/:event_id',
    authenticate,
    [
        param('event_id').isInt().withMessage('Event ID required')
    ],
    validate,
    committeeController.assignTicketList
);

router.post('/ticket/update',
    authenticate,
    [
        body('event_id')
            .isInt()
            .withMessage('Event ID is required'),

        body('user_id')
            .isInt()
            .withMessage('User ID is required'),

        body('tickets')
            .isObject()
            .withMessage('Tickets must be an object'),
            
        body('commission')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Commission must be a positive number')
    ],
    validate,
    committeeController.updateAssignedTickets
);

module.exports = router;