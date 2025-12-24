// src/models/index.js

const sequelize = require('../config/database');

// Import models
const Questions = require('./questions.modal');
const QuestionItems = require('./question_items.modal');
const QuestionsBook = require('./questions_book.model');
const AddonTypes = require('./addon.model');
const TicketType = require('./ticket.model');
const Company = require('./company.model');
const Countries = require('./country.model');
const Event = require('./event.model');
const User = require('./user.model');
const Package = require('./package.model');
const PackageDetails = require('./package_details.model');
// const EventDays = require('./event_days.model');
const EventSlots = require('./event_slots.modal');
const TicketPricing = require('./ticket_pricing.model');
const Wellness = require('./wellness.model')
const WellnessSlots = require('./wellness_slots.model')
const Cart = require('./cart.model');
const Orders = require('./orders.modal');
const OrderItems = require('./order_items.model');
const Currency = require('./currency.model');
const Payment = require('./payment.model');
const PaymentSnapshotItems = require('./payment_snapshot_items');
const CommitteeMembers = require('./committee_members.model');
const CommitteeAssignTickets = require('./committee_assigntickets');
const CartQuestionsDetails = require('./cart_questions_details');
const CommitteeGroup = require('./committee_group.model');
const CommitteeGroupMember = require('./committee_group_member.model');

CommitteeMembers.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
CommitteeAssignTickets.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Event.hasMany(CommitteeAssignTickets, { foreignKey: 'event_id', as: 'assignedTickets' });
CommitteeMembers.hasMany(CommitteeAssignTickets, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'assignedTickets' });
CommitteeAssignTickets.belongsTo(CommitteeMembers, { foreignKey: 'user_id', targetKey: 'user_id', as: 'committeeMember' });
User.hasMany(CommitteeMembers, { foreignKey: 'user_id', as: 'committeeMembers' });



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
PackageDetails.belongsTo(AddonTypes, { foreignKey: 'addon_id', as: 'addonType' });
PackageDetails.belongsTo(TicketType, { foreignKey: 'ticket_type_id', as: 'ticketType' });
TicketType.hasMany(PackageDetails, { foreignKey: 'ticket_type_id', as: 'packageDetails' });

TicketType.hasMany(CommitteeAssignTickets, {
  foreignKey: 'ticket_id',
  as: 'committeeAssignedTickets'
});

CommitteeAssignTickets.belongsTo(TicketType, {
  foreignKey: 'ticket_id',
  as: 'ticket'
});


// ✅ PackageDetails ↔ AddonTypes
AddonTypes.hasMany(PackageDetails, { foreignKey: 'addon_id', as: 'packageDetails' });

// ✅ Package ↔ Event
Package.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
Event.hasMany(Package, { foreignKey: 'event_id', as: 'packages' });

Cart.belongsTo(TicketType, { foreignKey: 'ticket_id' });
Cart.belongsTo(AddonTypes, { foreignKey: 'addons_id' });
Cart.belongsTo(Package, { foreignKey: 'package_id' });
Cart.belongsTo(TicketPricing, { foreignKey: 'ticket_price_id' });
Cart.belongsTo(WellnessSlots, {  foreignKey: 'appointment_id',  as: 'appointments'})
Cart.belongsTo(Event, {  foreignKey: 'event_id',  as: 'events',})
Cart.belongsTo(User, {  foreignKey: 'user_id',  as: 'user',})
CommitteeGroupMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Orders.hasMany(OrderItems, {
  foreignKey: "order_id",
  as: "orderItems",
  onDelete: "CASCADE"
});

Orders.belongsTo(Event, {
  foreignKey: "event_id",
  as: "event"
});

Orders.belongsTo(User, {
  foreignKey: "user_id",
  as: "user"
});

// OrderItems ↔ Event
OrderItems.belongsTo(Event, {
  foreignKey: "event_id",
  as: "event"
});

Event.hasMany(OrderItems, {
  foreignKey: "event_id",
  as: "orderItems"
});

Event.belongsTo(Company, {
  foreignKey: "company_id",
  as: "companyInfo"
});


OrderItems.belongsTo(Orders, {
  foreignKey: "order_id",
  as: "order"
});

OrderItems.belongsTo(TicketType, {
  foreignKey: "ticket_id",
  as: "ticketType"
});

OrderItems.belongsTo(AddonTypes, {
  foreignKey: "addon_id",
  as: "addonType"
});

OrderItems.belongsTo(Package, {
  foreignKey: "package_id",
  as: "package"
});

OrderItems.belongsTo(TicketPricing, {
  foreignKey: "ticket_pricing_id",
  as: "ticketPricing"
});

OrderItems.belongsTo(EventSlots, {
  foreignKey: "slot_id",
  as: "slot"
});

OrderItems.belongsTo(WellnessSlots, {
  foreignKey: "appointment_id",
  as: "appointment"
});

// Event ↔ TicketType
Event.hasMany(TicketType, {
  foreignKey: 'eventid',
  as: 'tickets',   // fetch tickets via event.tickets
  onDelete: 'CASCADE'
});

TicketType.belongsTo(Event, {
  foreignKey: 'eventid',
  as: 'event'
});

Event.hasMany(AddonTypes, {
  foreignKey: 'event_id',
  as: 'addons',    // fetch addons via event.addons
  onDelete: 'CASCADE'
});

Event.hasMany(Package, {
  foreignKey: 'event_id',
  as: 'package',    // fetch addons via event.addons
  onDelete: 'CASCADE'
});

TicketType.hasMany(TicketPricing, {
  foreignKey: 'ticket_type_id',
  as: 'pricings',  // fetch pricing via ticket.pricings
  onDelete: 'CASCADE'
});

//Event ↔ EventSlots
Event.hasMany(EventSlots, {
  foreignKey: 'event_id',
  as: 'slots',     // fetch slots via event.slots
  onDelete: 'CASCADE'
});

Event.belongsTo(Currency, {
  foreignKey: 'payment_currency',
  as: 'currencyName',
});

Event.hasMany(Wellness, {
  foreignKey: 'event_id',
  as: 'wellness',
})

EventSlots.belongsTo(Event, {
  foreignKey: 'event_id',
  as: 'event'
});

EventSlots.hasMany(TicketPricing, {
  foreignKey: 'event_slot_id',
  as: 'pricings',
  onDelete: 'CASCADE'
});

TicketPricing.belongsTo(TicketType, {
  foreignKey: 'ticket_type_id',
  as: 'ticket'
});

TicketPricing.belongsTo(EventSlots, {
  foreignKey: 'event_slot_id',
  as: 'slot'
});


// new relationships..
WellnessSlots.belongsTo(Wellness, {
  foreignKey: 'wellness_id',
  as: 'wellnessList',
});

Wellness.hasMany(WellnessSlots, {
  foreignKey: 'wellness_id',
  as: 'wellnessSlots',
});
Wellness.belongsTo(Event, {
  foreignKey: 'event_id',
  as: 'eventList',
});

Wellness.belongsTo(Currency, {
  foreignKey: 'currency',
  as: 'currencyName',
});


// =============================
// ✅ Export all
// =============================
module.exports = {
  sequelize, Questions, QuestionItems,QuestionsBook, CartQuestionsDetails, AddonTypes, Company, Countries, Event, TicketType, OrderItems,
  User, Package, PackageDetails, TicketPricing, EventSlots, Cart, Orders, Wellness, WellnessSlots,
  Currency, Payment, PaymentSnapshotItems, CommitteeMembers, CommitteeAssignTickets,CommitteeGroup,CommitteeGroupMember
};