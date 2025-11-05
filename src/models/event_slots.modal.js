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
        model: 'tbl_events', // Foreign key link to event
        key: 'id',
      },
      onDelete: 'CASCADE',
    },

    // 👇 New slot name field
    slot_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Label for the slot (e.g., Morning Session, Slot 1, etc.)',
    },

    // 👇 Split date and times for easy filtering
    slot_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Slot date (e.g., 2025-11-05)',
    },

    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'Start time (local time, e.g., 10:00)',
    },

    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'End time (local time, e.g., 12:00)',
    },

    description: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Optional slot description or notes',
    },
  },
  {
    tableName: 'tbl_event_slots',
    timestamps: false, // No createdAt or updatedAt
    indexes: [
      {
        fields: ['event_id', 'date'], // For quick date-based lookups per event
      },
    ],
  }
);

module.exports = EventSlots;
