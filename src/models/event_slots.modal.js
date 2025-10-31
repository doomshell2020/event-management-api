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
    event_date_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tbl_event_days', // name of the related table
        key: 'id',
      },
      onDelete: 'CASCADE', // if an event day is deleted, its slots also get deleted
    },
    slot_start_utc: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Start time in UTC',
    },
    slot_end_utc: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'End time in UTC',
    },
  },
  {
    tableName: 'tbl_event_slots',
    timestamps: false, // ✅ no createdAt or updatedAt
  }
);

module.exports = EventSlots;
