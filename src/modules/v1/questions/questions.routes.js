const express = require('express');
const router = express.Router();
const questionsController = require('./questions.controller');
const { body, param } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');

// 🎟️ Create Ticket Route
router.post(
    '/create',
    authenticate,
    [
        // ✅ Required fields
        body('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be a number'),

        body('type')
            .notEmpty().withMessage('Questions type is required')
            .isIn(['Select', 'Text', 'Agree'])
            .withMessage('Invalid question type. Must be Select, Text, or Agree'),

        body('name')
            .notEmpty().withMessage('Questions title is required')
            .isLength({ min: 3 }).withMessage('question title must be at least 3 characters long'),

        body('question')
            .notEmpty().withMessage('Questions title is required')
            .isLength({ min: 3 }).withMessage('question title must be at least 3 characters long'),
        // ✅ Optional array field
        body('items')
            .optional()
            .isArray().withMessage('Items must be an array')
    ],
    validate,
    questionsController.createQuestions
);

// 📝 Update Question Route
router.put(
    '/update/:id',
    authenticate,
    [
        // ✅ Validate Question ID from params
        param('id')
            .notEmpty().withMessage('Question ID is required')
            .isInt().withMessage('Question ID must be a number'),

        // ✅ Only allow these optional fields for update
        body('name')
            .optional()
            .isLength({ min: 3 }).withMessage('Question title must be at least 3 characters long'),

        body('question')
            .optional()
            .isLength({ min: 3 }).withMessage('Question text must be at least 3 characters long'),

        body('items')
            .optional()
            .isArray().withMessage('Items must be an array'),

        // ❌ Disallow updating `type` and `event_id`
        body('type').not().exists().withMessage('Type cannot be updated'),
        body('event_id').not().exists().withMessage('Event ID cannot be updated'),
    ],
    validate,
    questionsController.updateQuestion
);

// 🔗 Link Question to multiple tickets
router.put(
    '/link-tickets/:question_id',
    authenticate,
    [
        param('question_id')
            .notEmpty().withMessage('Question ID is required')
            .isInt().withMessage('Question ID must be a number'),

        body('ticket_ids')
            .notEmpty().withMessage('Ticket IDs are required')
            .matches(/^\d+(,\d+)*$/).withMessage('Ticket IDs must be comma-separated numbers'),
    ],
    validate,
    questionsController.linkQuestionToTickets
);


module.exports = router;