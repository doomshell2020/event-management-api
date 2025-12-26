const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommitteeAssignTickets = sequelize.define(
    'CommitteeAssignTickets',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        event_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        ticket_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        group_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        count: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        usedticket: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'N'
        },
    },
    {
        tableName: 'tblcommittee_assigntickets',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = CommitteeAssignTickets;

