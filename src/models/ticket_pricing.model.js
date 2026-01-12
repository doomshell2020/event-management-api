const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TicketPricing = sequelize.define(
  'TicketPricing',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    total_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 100,
    },
    ticket_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tbl_ticket_types',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tbl_events',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    event_slot_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // NULL → general event pricing
      references: {
        model: 'tbl_event_slots',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    // 👇 Split date and times for easy filtering
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date (e.g., 2025-11-05)',
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'INR',
    },
  },
  {
    tableName: 'tbl_ticket_pricing',
    timestamps: false,
  }
);

module.exports = TicketPricing;
