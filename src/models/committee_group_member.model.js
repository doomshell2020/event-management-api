const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommitteeGroupMember = sequelize.define(
    'CommitteeGroupMember',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        group_id: {
            type: DataTypes.STRING(255),
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
        added_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'N'
        },
    },
    {
        tableName: 'tblgroup_member',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = CommitteeGroupMember;

