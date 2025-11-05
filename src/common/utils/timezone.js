const moment = require('moment-timezone');

/**
 * ✅ Convert a local date/time (based on event timezone) to UTC before saving in DB
 * @param {string|Date} dateStr - Local date/time (e.g. "2025-11-10T18:00:00")
 * @param {string} timezone - IANA timezone (e.g. "America/Los_Angeles")
 * @returns {Date|null} UTC Date object
 */
const convertToUTC = (dateStr, timezone) => {
    if (!dateStr || !timezone) return null;
    return moment.tz(dateStr, timezone).utc().toDate();
};

/**
 * ✅ Convert UTC date/time (from DB) to the event's local timezone for display
 * @param {string|Date} utcDate - UTC date/time stored in DB
 * @param {string} timezone - IANA timezone (e.g. "America/Los_Angeles")
 * @param {string} format - (optional) Output format, default "YYYY-MM-DD HH:mm:ss"
 * @returns {string|null} Formatted date/time string in local timezone
 */

// const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// console.log(userTimezone); // e.g., "Asia/Kolkata" or "America/New_York"


const convertUTCToLocal = (utcDate, timezone, format = 'YYYY-MM-DD HH:mm:ss') => {
    if (!utcDate || !timezone) return null;
    return moment.utc(utcDate).tz(timezone).format(format);
};

/**
 * ✅ Get list of all available IANA timezones (for dropdowns etc.)
 * @returns {string[]} Array of timezone names
 */
const getAllTimezones = () => {
    return moment.tz.names();
};

module.exports = {
    convertToUTC,
    convertUTCToLocal,
    getAllTimezones
};
