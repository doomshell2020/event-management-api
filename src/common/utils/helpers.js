// 1️⃣ Generate Unique Order ID
function generateUniqueOrderId() {
    const prefix = "EXT";
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${year}${month}-${rand}`;
}

// 2️⃣ (Example) Generate Random String
function randomString(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
}

// 3️⃣ (Example) Format Date YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
}

const replaceTemplateVariables = (template, variables = {}) => {
    let output = template;
    // console.log('variables :', variables);

    Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        output = output.replace(regex, variables[key]);
    });

    return output;
};

const getItemTitle = (item) => {
    switch (item.item_type) {

        case 'ticket_price':
            if (item.ticketPricing?.ticket?.title) {
                const slotName = item.ticketPricing?.slot?.slot_name;
                return slotName
                    ? `${item.ticketPricing.ticket.title} (${slotName})`
                    : item.ticketPricing.ticket.title;
            }
            return 'Ticket';

        case 'addon':
            return item.addonType?.name || 'Addon';

        case 'package':
            return item.packageType?.name || 'Package';

        case 'ticket':
            return item.ticketType?.title || 'Ticket';

        default:
            return 'Item';
    }
};


/**
 * Format price with commas and fixed decimals
 * @param {number|string} amount
 * @param {number} decimals
 * @returns {string}
 */
const formatPrice = (amount, decimals = 2) => {
    const num = Number(amount || 0);

    return num.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};


// -------------------// EXPORT ALL FUNCTIONS //-------------------
module.exports = {
    generateUniqueOrderId,
    randomString,
    formatDate,
    replaceTemplateVariables,
    getItemTitle,
    formatPrice
};
