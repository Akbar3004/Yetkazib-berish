require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/webapp', express.static(path.join(__dirname, 'public', 'webapp')));
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

// Create uploads directory
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `product_${Date.now()}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ===== Simple Auth Middleware =====
const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const [username, password] = Buffer.from(token, 'base64').toString().split(':');

    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
};

// ===== Admin Auth =====
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: "Noto'g'ri login yoki parol" });
    }
});

// ===== PUBLIC API (for Telegram Web App) =====
app.get('/api/categories', (req, res) => {
    try {
        res.json(db.getCategories());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products', (req, res) => {
    try {
        const categoryId = req.query.category_id;
        if (categoryId) {
            res.json(db.getProductsByCategory(parseInt(categoryId)));
        } else {
            res.json(db.getProducts());
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/popular', (req, res) => {
    try {
        res.json(db.getPopularProducts());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/:id', (req, res) => {
    try {
        const product = db.getProductById(parseInt(req.params.id));
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/settings/public', (req, res) => {
    try {
        const settings = db.getAllSettings();
        res.json({
            shop_name: settings.shop_name,
            shop_phone: settings.shop_phone,
            delivery_price: parseInt(settings.delivery_price || '0'),
            min_order: parseInt(settings.min_order || '0'),
            working_hours: settings.working_hours,
            is_open: settings.is_open === '1',
            currency: settings.currency,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Customer registration / update
app.post('/api/customers/register', (req, res) => {
    try {
        const customer = db.createOrUpdateCustomer(req.body);
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/customers/:telegramId/phone', (req, res) => {
    try {
        db.updateCustomerPhone(parseInt(req.params.telegramId), req.body.phone);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/customers/:telegramId/address', (req, res) => {
    try {
        db.updateCustomerAddress(parseInt(req.params.telegramId), req.body.address, req.body.latitude || 0, req.body.longitude || 0);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create order
app.post('/api/orders', (req, res) => {
    try {
        const order = db.createOrder(req.body);

        // Notify admin via bot (if bot is running)
        try {
            const bot = require('./bot');
            if (bot.notifyNewOrder) {
                bot.notifyNewOrder(order);
            }
        } catch (e) {
            // Bot might not be initialized
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== ADMIN API =====
// Stats
app.get('/api/admin/stats', adminAuth, (req, res) => {
    try {
        res.json(db.getStats());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Categories CRUD
app.get('/api/admin/categories', adminAuth, (req, res) => {
    try {
        res.json(db.getAllCategories());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/categories', adminAuth, (req, res) => {
    try {
        const result = db.createCategory(req.body);
        res.json({ id: result.lastInsertRowid, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/categories/:id', adminAuth, (req, res) => {
    try {
        db.updateCategory(parseInt(req.params.id), req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/categories/:id', adminAuth, (req, res) => {
    try {
        db.deleteCategory(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Products CRUD
app.get('/api/admin/products', adminAuth, (req, res) => {
    try {
        res.json(db.getAllProducts());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/products', adminAuth, upload.single('image'), (req, res) => {
    try {
        const data = { ...req.body };
        if (req.file) {
            data.image = `/uploads/${req.file.filename}`;
        }
        data.price = parseInt(data.price);
        data.old_price = parseInt(data.old_price || 0);
        data.category_id = parseInt(data.category_id);
        data.is_popular = data.is_popular === 'true' || data.is_popular === '1';
        data.sort_order = parseInt(data.sort_order || 0);
        const result = db.createProduct(data);
        res.json({ id: result.lastInsertRowid, ...data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/products/:id', adminAuth, upload.single('image'), (req, res) => {
    try {
        const data = { ...req.body };
        if (req.file) {
            data.image = `/uploads/${req.file.filename}`;
        } else {
            const existing = db.getProductById(parseInt(req.params.id));
            data.image = data.image || (existing ? existing.image : '');
        }
        data.price = parseInt(data.price);
        data.old_price = parseInt(data.old_price || 0);
        data.category_id = parseInt(data.category_id);
        data.is_active = data.is_active === 'true' || data.is_active === '1';
        data.is_popular = data.is_popular === 'true' || data.is_popular === '1';
        data.sort_order = parseInt(data.sort_order || 0);
        db.updateProduct(parseInt(req.params.id), data);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/products/:id', adminAuth, (req, res) => {
    try {
        db.deleteProduct(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Orders
app.get('/api/admin/orders', adminAuth, (req, res) => {
    try {
        const status = req.query.status || null;
        const limit = parseInt(req.query.limit) || 50;
        res.json(db.getOrders(status, limit));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/orders/:id', adminAuth, (req, res) => {
    try {
        const order = db.getOrderById(parseInt(req.params.id));
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/orders/:id/status', adminAuth, (req, res) => {
    try {
        db.updateOrderStatus(parseInt(req.params.id), req.body.status);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Customers
app.get('/api/admin/customers', adminAuth, (req, res) => {
    try {
        res.json(db.getCustomers());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/customers/:id', adminAuth, (req, res) => {
    try {
        const customer = db.getCustomerById(parseInt(req.params.id));
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/customers/:id/block', adminAuth, (req, res) => {
    try {
        db.blockCustomer(parseInt(req.params.id), req.body.blocked);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Settings
app.get('/api/admin/settings', adminAuth, (req, res) => {
    try {
        res.json(db.getAllSettings());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/settings', adminAuth, (req, res) => {
    try {
        for (const [key, value] of Object.entries(req.body)) {
            db.setSetting(key, value);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload image
app.post('/api/admin/upload', adminAuth, upload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        res.json({ url: `/uploads/${req.file.filename}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List available icons
app.get('/api/admin/icons', adminAuth, (req, res) => {
    try {
        const iconsDir = path.join(__dirname, 'uploads', 'categories');
        if (!fs.existsSync(iconsDir)) {
            return res.json([]);
        }
        const files = fs.readdirSync(iconsDir);
        // Filter for images
        const icons = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file))
            .map(file => `/uploads/categories/${file}`);
        res.json(icons);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== Start Server =====
app.listen(PORT, () => {
    console.log(`\n🚀 Server ishga tushdi: http://localhost:${PORT}`);
    console.log(`📱 Telegram Web App: http://localhost:${PORT}/webapp`);
    console.log(`🖥️  Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`\n📌 Telegram bot uchun: node bot.js\n`);
});

module.exports = app;
