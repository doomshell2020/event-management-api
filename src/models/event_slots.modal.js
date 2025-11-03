const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventSlots = sequelize.define(
  'EventSlots',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tbl_events', // directly link to event
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    slot_start_utc: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Full start datetime in UTC (e.g., 2025-11-17T10:00:00Z)',
    },

    slot_end_utc: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Full end datetime in UTC (e.g., 2025-11-17T12:00:00Z)',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
  },
  {
    tableName: 'tbl_event_slots',
    timestamps: false, // no createdAt or updatedAt
  }
);

module.exports = EventSlots;
