const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuestionItems = sequelize.define(
    'QuestionItems',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        question_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        items: {
            type: DataTypes.STRING(100),
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
        tableName: 'tblquestionitems',
        timestamps: true,
    }
);

module.exports = QuestionItems;
