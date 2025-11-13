const { Questions, QuestionItems,Event } = require('../../../models');

const { Op } = require('sequelize');

// 📋 List Questions (by event_id or question_id)
module.exports.listQuestions = async ({ event_id, question_id }) => {
    try {
        const whereClause = {};

        // ✅ Add filters dynamically
        if (event_id) whereClause.event_id = event_id;
        if (question_id) whereClause.id = question_id;

        // ✅ Fetch questions with relations
        const questions = await Questions.findAll({
            where: whereClause,
            include: [
                {
                    model: QuestionItems,
                    as: 'questionItems',
                    attributes: ['id', 'items']
                }
            ],
            order: [['id', 'DESC']]
        });

        if (!questions || questions.length == 0) {
            return {
                success: false,
                code: 'QUESTION_NOT_FOUND',
                message: 'No questions found for the given filter'
            };
        }

        return {
            success: true,
            message: 'Questions fetched successfully',
            data: questions
        };
    } catch (error) {
        console.error('❌ Error in listQuestions service:', error);
        return {
            success: false,
            code: 'DB_ERROR',
            message: error.message
        };
    }
};

module.exports.linkQuestionToTickets = async (questionId, ticketIds) => {
    try {
        // ✅ Find existing question
        const question = await Questions.findByPk(questionId);
        if (!question) {
            return {
                success: false,
                code: 'QUESTION_NOT_FOUND',
                message: 'Question not found'
            };
        }

        // ✅ Clean & format the ticket IDs
        const cleanTicketIds = ticketIds
            .split(',')
            .map(id => id.trim())
            .filter(id => id !== '')
            .join(',');

        if (!cleanTicketIds) {
            return {
                success: false,
                code: 'VALIDATION_FAILED',
                message: 'Invalid ticket IDs format'
            };
        }

        // ✅ Update question with linked ticket IDs
        await question.update({
            ticket_type_id: cleanTicketIds,
            updatedAt: new Date()
        });

        return {
            success: true,
            message: 'Tickets linked successfully',
            data: question
        };
    } catch (error) {
        console.error('❌ Error in linkQuestionToTickets service:', error);
        return {
            success: false,
            code: 'DB_ERROR',
            message: error.message
        };
    }
};

module.exports.updateQuestion = async (questionId, data) => {
    try {
        const { name, question, items } = data;

        const existingQuestion = await Questions.findByPk(questionId, {
            include: [{ model: QuestionItems, as: 'questionItems' }] // ✅ correct alias
        });

        if (!existingQuestion) {
            return { success: false, message: 'Question not found', code: 'QUESTION_NOT_FOUND' };
        }

        const updatedData = {};
        if (name) updatedData.name = name.trim();
        if (question) updatedData.question = question.trim();

        if (Object.keys(updatedData).length === 0 && !items) {
            return { success: false, message: 'No valid fields provided for update', code: 'VALIDATION_FAILED' };
        }

        if (data.type || data.event_id) {
            return { success: false, message: 'Type and Event ID cannot be updated', code: 'VALIDATION_FAILED' };
        }

        await existingQuestion.update({
            ...updatedData,
            updatedAt: new Date()
        });

        // ✅ Update items only if question type = 'Select'
        if (existingQuestion.type === 'Select') {
            if (items && Array.isArray(items)) {
                await QuestionItems.destroy({ where: { question_id: questionId } });
                const newItems = items.map((val) => ({
                    question_id: questionId,
                    items: val.trim(),
                }));
                await QuestionItems.bulkCreate(newItems);
            }
        } else if (items) {
            return { success: false, message: 'Items can only be updated for Select type questions', code: 'VALIDATION_FAILED' };
        }

        const updatedQuestion = await Questions.findByPk(questionId, {
            include: [{ model: QuestionItems, as: 'questionItems' }]
        });

        return { success: true, message: 'Question updated successfully', data: updatedQuestion };
    } catch (error) {
        console.error('❌ Error updating question:', error);
        return { success: false, message: 'Internal server error: ' + error.message, code: 'DB_ERROR' };
    }
};

module.exports.createQuestions = async (req) => {
    try {
        const { name, type, question, event_id, items } = req.body;
        const user_id = req.user?.id || null;

        // ✅ Validate required fields
        if (!event_id || !name || !type || !question) {
            return {
                success: false,
                message: 'Please fill all required fields',
                code: 'VALIDATION_FAILED'
            };
        }

        // ✅ Check if associated event exists
        const eventExists = await Event.findByPk(event_id);
        if (!eventExists) {
            return {
                success: false,
                message: 'Associated event not found',
                code: 'EVENT_NOT_FOUND'
            };
        }

        // ✅ Check duplicate question for same event
        const existing = await Questions.findOne({
            where: {
                event_id,
                name: name.trim(),
            },
        });

        if (existing) {
            return {
                success: false,
                message: 'A question with this name already exists for the selected event',
                code: 'DUPLICATE'
            };
        }

        // ✅ Create main Question entry
        const newQuestion = await Questions.create({
            name: name.trim(),
            type,
            question: question.trim(),
            event_id,
            user_id,
        });

        // ✅ If type = Select, create multiple items
        if (type == 'Select' && Array.isArray(items) && items.length > 0) {
            const questionItems = items.map((itemValue) => ({
                question_id: newQuestion.id,
                items: itemValue.trim(),
            }));

            await QuestionItems.bulkCreate(questionItems);
        }

        return {
            success: true,
            message: 'Question created successfully',
            data: newQuestion,
        };
    } catch (error) {
        console.error('❌ Error creating question:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR',
        };
    }
};