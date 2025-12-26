const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommitteeGroup = sequelize.define(
    'CommitteeGroup',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        event_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            //   references: {
            //     model: 'tbl_events', // Foreign key link to event
            //     key: 'id',
            //   },
            //   onDelete: 'CASCADE',
        },
        committee_user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            //   references: {
            //     model: 'tbl_events', // Foreign key link to event
            //     key: 'id',
            //   },
            //   onDelete: 'CASCADE',
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'N'
        },
    },
    {
        tableName: 'tblgroup',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = CommitteeGroup;

