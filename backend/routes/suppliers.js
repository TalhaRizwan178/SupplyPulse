const express = require('express');
const multer = require('multer');
const { uploadSuppliers, getSuppliers, deleteSupplier, addSupplier } = require('../controllers/supplierController');
const protect = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Apply tenant scope to all routes
router.use(protect, tenantMiddleware);

router.post('/upload', upload.single('file'), uploadSuppliers);
router.post('/add', addSupplier);
router.get('/', getSuppliers);
router.delete('/:id', deleteSupplier);

module.exports = router;
