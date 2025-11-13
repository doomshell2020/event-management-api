const questionsService = require('./questions.service');
const apiResponse = require('../../../common/utils/apiResponse');
const { body } = require('express-validator');

module.exports.listQuestions = async (req, res) => {
    try {
        const { event_id, question_id } = req.query;

        // ✅ If no filter provided
        if (!event_id && !question_id) {
            return apiResponse.validation(res, [], 'Please provide either event_id or question_id');
        }

        // ✅ Call service layer
        const result = await questionsService.listQuestions({ event_id, question_id });

        // ✅ Handle service errors
        if (!result.success) {
            switch (result.code) {
                case 'QUESTION_NOT_FOUND':
                    return apiResponse.notFound(res, [], 'No questions found');
                case 'DB_ERROR':
                    return apiResponse.error(res, [], 'Database error occurred while fetching questions');
                default:
                    return apiResponse.error(res, [], result.message || 'Unknown error occurred');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, 'Questions fetched successfully', result.data);

    } catch (error) {
        console.error('❌ Error in listQuestions:', error);
        return apiResponse.error(res, [], 'Internal Server Error: ' + error.message);
    }
};


module.exports.createQuestions = async (req, res) => {
    try {

        const { name, type, question, event_id, items } = req.body;

        if (!event_id || !name || !type || !question) {
            return apiResponse.validation(res, [], 'Required fields are missing');
        }

        if (type == 'Select' && !items || Array.isArray(items) && items.length == 0) {
            return apiResponse.validation(res, [], 'Items is required for select options');
        }


        // ✅ Call service to create ticket
        const result = await questionsService.createQuestions(req);

        // ✅ Handle service errors
        if (!result.success) {

            switch (result.code) {
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Associated event not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while creating ticket');
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'DUPLICATE':
                    return apiResponse.conflict(res, result.message || '');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, 'Question created successfully', result.data);

    } catch (error) {
        console.error('Error in createQuestions:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
}

module.exports.updateQuestion = async (req, res) => {
    try {
        const questionId = req.params.id;
        const { type, items } = req.body;

        // ✅ Basic validation
        if (!questionId) {
            return apiResponse.validation(res, [], 'Question ID is required');
        }

        // ✅ For "Select" type, ensure items array is provided
        if (type == 'Select' && (!items || (Array.isArray(items) && items.length == 0))) {
            return apiResponse.validation(res, [], 'Items are required for Select type questions');
        }

        // ✅ Call service to update the question
        const result = await questionsService.updateQuestion(questionId, req.body);

        // ✅ Handle service errors
        if (!result.success) {
            switch (result.code) {
                case 'QUESTION_NOT_FOUND':
                    return apiResponse.notFound(res, 'Question not found');
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Associated event not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while updating question');
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, 'Question updated successfully', result.data);

    } catch (error) {
        console.error('Error in updateQuestion:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};

module.exports.linkQuestionToTickets = async (req, res) => {
    try {
        const { question_id } = req.params;
        const { ticket_ids } = req.body;

        // ✅ Basic validation
        if (!ticket_ids) {
            return apiResponse.validation(res, [], 'Ticket IDs are required');
        }

        // ✅ Call service
        const result = await questionsService.linkQuestionToTickets(question_id, ticket_ids);

        // ✅ Handle service result
        if (!result.success) {
            switch (result.code) {
                case 'QUESTION_NOT_FOUND':
                    return apiResponse.notFound(res, [], 'Question not found');
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'DB_ERROR':
                    return apiResponse.error(res, [], 'Database error while linking tickets');
                default:
                    return apiResponse.error(res, [], result.message || 'Unknown error');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, 'Tickets linked successfully to question', result.data);
    } catch (error) {
        console.error('❌ Error linking tickets to question:', error.message);
        return apiResponse.error(res, [], 'Internal Server Error: ' + error.message);
    }
};