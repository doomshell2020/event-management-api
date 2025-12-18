const express = require('express');
const router = express.Router();
const committeeController = require('./committee.controller');
const { body, param } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');
const { Committee } = require('../../../models');

// ✅ Create Event Route
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
/* ✅ LIST MEMBERS */
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
            .withMessage('Tickets must be an object')
    ],
    validate,
    committeeController.updateAssignedTickets
);

module.exports = router;