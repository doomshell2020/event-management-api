const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventActivationLog = sequelize.define(
    'EventActivationLog',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        event_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        status: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false
        },

        activation_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },

        activation_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },

        activation_remarks: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        activated_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        }

    }, 
    {
        timestamps: true,
        tableName: "event_activation_logs"
    }
);

module.exports = EventActivationLog;

