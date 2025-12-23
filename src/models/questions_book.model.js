const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuestionsBook = sequelize.define(
    'QuestionsBook',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        ticketdetail_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        question_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        event_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        user_reply: {
            type: DataTypes.TEXT,
            allowNull: false,
        },

        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: 'tblquestion_book',
        timestamps: true,
    }
);

module.exports = QuestionsBook;
