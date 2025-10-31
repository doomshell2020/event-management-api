// src/models/index.js

const sequelize = require('../config/database');

// Import models
const Questions = require('./questions.modal');
const QuestionItems = require('./question_items.modal');
const AddonTypes = require('./addon.model');
const TicketType = require('./ticket.model');
const Company = require('./company.model');
const Countries = require('./country.model');
const Event = require('./event.model');
const User = require('./user.model');
const Package = require('./package.model');
const PackageDetails = require('./package_details.model');
const EventDays = require('./event_days.model');
const EventSlots = require('./event_slots.modal');
const TicketPricing = require('./ticket_pricing.model');


// =============================
// ✅ Define Relationships
// =============================

// 🔹 One Question → Many QuestionItems
Questions.hasMany(QuestionItems, {
  foreignKey: 'question_id',
  as: 'questionItems', // ✅ use lowercase alias consistently everywhere
  onDelete: 'CASCADE'
});

// 🔹 Each QuestionItem → belongs to a Question
QuestionItems.belongsTo(Questions, {
  foreignKey: 'question_id',
  as: 'question'
});

// ✅ Package ↔ PackageDetails (already defined)
Package.hasMany(PackageDetails, { foreignKey: 'package_id', as: 'details' });
PackageDetails.belongsTo(Package, { foreignKey: 'package_id', as: 'package' });

// ✅ PackageDetails ↔ TicketType
PackageDetails.belongsTo(TicketType, { foreignKey: 'ticket_type_id', as: 'ticketType' });
TicketType.hasMany(PackageDetails, { foreignKey: 'ticket_type_id', as: 'packageDetails' });

// ✅ PackageDetails ↔ AddonTypes
PackageDetails.belongsTo(AddonTypes, { foreignKey: 'addon_id', as: 'addonType' });
AddonTypes.hasMany(PackageDetails, { foreignKey: 'addon_id', as: 'packageDetails' });

// ✅ Package ↔ Event
Package.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
Event.hasMany(Package, { foreignKey: 'event_id', as: 'packages' });

// =============================
// ✅ Export all
// =============================
module.exports = {
  sequelize,
  Questions,  QuestionItems,  AddonTypes,  Company,  Countries,  Event,  TicketType,
  User,  Package,  PackageDetails, TicketPricing, EventDays, EventSlots
};
