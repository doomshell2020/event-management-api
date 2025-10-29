const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Questions = sequelize.define(
    'Questions',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        event_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        question: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        ticket_type_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        Status: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'Y',
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
        tableName: 'tblquestions',
        timestamps: true, // you're managing manually
    }
);

module.exports = Questions;
