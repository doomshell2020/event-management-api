const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommitteeMembers = sequelize.define(
    'CommitteeMembers',
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
        commission:{
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'N'
        },
    },
    {
        tableName: 'tblcommitte',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = CommitteeMembers;

