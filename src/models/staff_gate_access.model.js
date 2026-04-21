const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StaffGateAccess = sequelize.define(
    'StaffGateAccess',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        event_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        gate_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
      
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'Y'
        }
    },
    {
        tableName: 'staff_gate_access',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = StaffGateAccess;

