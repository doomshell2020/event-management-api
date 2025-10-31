const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventDays = sequelize.define(
  'EventDays',
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
    event_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'tbl_event_days',
    timestamps: false, // ✅ no createdAt or updatedAt
  }
);

module.exports = EventDays;
