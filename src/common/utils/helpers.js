

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

// Add more functions here as needed...

// -------------------
// EXPORT ALL FUNCTIONS
// -------------------
module.exports = {
    generateUniqueOrderId,
    randomString,
    formatDate,
};
