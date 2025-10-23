const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Storage factory function
const storage = (folder = 'uploads') => multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../', folder);
        // Create folder if not exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        const safeFieldName = file.fieldname.replace(/\s+/g, '_'); // avoid spaces
        const filename = `${safeFieldName}-${uniqueSuffix}${ext}`;
        cb(null, filename);
    }
});

// File filter (images only)
const fileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
        cb(new Error('Only image files are allowed!'), false);
    } else {
        cb(null, true);
    }
};

/**
 * Generate Multer upload middleware
 * type: 'single' | 'array' | 'fields'
 * fieldName: for single / array
 * maxCount: max files for array
 */
const uploadFiles = ({ folder = 'uploads', type = 'single', fieldName = 'file', maxCount = 5 }) => {
    const multerInstance = multer({ storage: storage(folder), fileFilter });

    switch (type) {
        case 'single':
            return multerInstance.single(fieldName);
        case 'array':
            return multerInstance.array(fieldName, maxCount);
        case 'fields':
            // Example: [{ name: 'profile_image', maxCount: 1 }, { name: 'attachments', maxCount: 5 }]
            return multerInstance.fields(fieldName);
        default:
            throw new Error('Invalid upload type. Use single, array, or fields.');
    }
};

module.exports = uploadFiles;
