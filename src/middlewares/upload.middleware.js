const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Storage factory
 */
const storage = (folder = 'uploads') => multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../', folder);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        const safeFieldName = file.fieldname.replace(/\s+/g, '_');
        cb(null, `${safeFieldName}-${uniqueSuffix}${ext}`);
    }
});

/**
 * Dynamic file filter
 * - DEFAULT: images only (existing behavior)
 * - uploads/temp: Excel / CSV (for comps import)
 */
const fileFilter = (folder) => (req, file, cb) => {

    // ✅ Allow Excel / CSV ONLY for temp uploads
    if (folder === 'uploads/temp') {
        const allowedExt = ['.xlsx', '.xls', '.csv'];
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];

        const ext = path.extname(file.originalname).toLowerCase();

        if (allowedExt.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
            return cb(null, true);
        }
        return cb(new Error('Only Excel or CSV files are allowed!'), false);
    }

    // ✅ DEFAULT (do not break existing image uploads)
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed!'), false);
    }

    cb(null, true);
};

/**
 * Upload factory (NO breaking changes)
 * type: single | array | fields
 */
const uploadFiles = ({
    folder = 'uploads',
    type = 'single',
    fieldName = 'file',
    maxCount = 5
}) => {

    const multerInstance = multer({
        storage: storage(folder),
        fileFilter: fileFilter(folder)
    });

    switch (type) {
        case 'single':
            return multerInstance.single(fieldName);
        case 'array':
            return multerInstance.array(fieldName, maxCount);
        case 'fields':
            return multerInstance.fields(fieldName);
        default:
            throw new Error('Invalid upload type. Use single, array, or fields.');
    }
};

module.exports = uploadFiles;
