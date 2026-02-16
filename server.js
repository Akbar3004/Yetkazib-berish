require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const db = require('./database');
const { bot, initBot } = require('./bot'); // We will export initBot to start bot logic

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

// ===== Database Initialization Middleware =====
app.use(async (req, res, next) => {
    try {
        // Ensure DB tables exist on first request (lazy init)
        if (!global.dbInitialized) {
            await db.initDb();
            global.dbInitialized = true;
        }
        next();
    } catch (e) {
        console.error("DB Init Error:", e);
        next();
    }
});

// ===== Simple Auth Middleware =====
const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const [username, password] = Buffer.from(token, 'base64').toString().split(':');
    const envUser = (process.env.ADMIN_USERNAME || '').trim();
    const envPass = (process.env.ADMIN_PASSWORD || '').trim();

    if (username === envUser && password === envPass) {
        next();
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
};

// ===== Admin Auth =====
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const envUser = (process.env.ADMIN_USERNAME || '').trim();
    const envPass = (process.env.ADMIN_PASSWORD || '').trim();
    if (username === envUser && password === envPass) {
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: "Noto'g'ri login yoki parol" });
    }
});

// ===== PUBLIC API (for Telegram Web App) =====
app.get('/api/categories', async (req, res) => {
    try {
        res.json(await db.getCategories());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const categoryId = req.query.category_id;
        if (categoryId) {
            res.json(await db.getProductsByCategory(parseInt(categoryId)));
        } else {
            res.json(await db.getProducts());
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/popular', async (req, res) => {
    try {
        res.json(await db.getPopularProducts());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await db.getProductById(parseInt(req.params.id));
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/settings/public', async (req, res) => {
    try {
        const settings = await db.getAllSettings();
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
app.post('/api/customers/register', async (req, res) => {
    try {
        const customer = await db.createOrUpdateCustomer(req.body);
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/customers/:telegramId/phone', async (req, res) => {
    try {
        await db.updateCustomerPhone(parseInt(req.params.telegramId), req.body.phone);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/customers/:telegramId/address', async (req, res) => {
    try {
        await db.updateCustomerAddress(parseInt(req.params.telegramId), req.body.address, req.body.latitude || 0, req.body.longitude || 0);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create order
app.post('/api/orders', async (req, res) => {
    try {
        const order = await db.createOrder(req.body);

        // Notify admin via bot
        try {
            const { notifyNewOrder } = require('./bot');
            if (notifyNewOrder) {
                await notifyNewOrder(order);
            }
        } catch (e) {
            console.error("Bot notification error:", e);
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== ADMIN API =====
// Stats
app.get('/api/admin/stats', adminAuth, async (req, res) => {
    try {
        res.json(await db.getStats());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Categories CRUD
app.get('/api/admin/categories', adminAuth, async (req, res) => {
    try {
        res.json(await db.getAllCategories());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/categories', adminAuth, async (req, res) => {
    try {
        const result = await db.createCategory(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/categories/:id', adminAuth, async (req, res) => {
    try {
        await db.updateCategory(parseInt(req.params.id), req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/categories/:id', adminAuth, async (req, res) => {
    try {
        await db.deleteCategory(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Products CRUD
app.get('/api/admin/products', adminAuth, async (req, res) => {
    try {
        res.json(await db.getAllProducts());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/products', adminAuth, upload.single('image'), async (req, res) => {
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
        const result = await db.createProduct(data);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/products/:id', adminAuth, upload.single('image'), async (req, res) => {
    try {
        const data = { ...req.body };
        if (req.file) {
            data.image = `/uploads/${req.file.filename}`;
        } else {
            const existing = await db.getProductById(parseInt(req.params.id));
            data.image = data.image || (existing ? existing.image : '');
        }
        data.price = parseInt(data.price);
        data.old_price = parseInt(data.old_price || 0);
        data.category_id = parseInt(data.category_id);
        data.is_active = data.is_active === 'true' || data.is_active === '1';
        data.is_popular = data.is_popular === 'true' || data.is_popular === '1';
        data.sort_order = parseInt(data.sort_order || 0);
        await db.updateProduct(parseInt(req.params.id), data);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/products/:id', adminAuth, async (req, res) => {
    try {
        await db.deleteProduct(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Orders
app.get('/api/admin/orders', adminAuth, async (req, res) => {
    try {
        const status = req.query.status || null;
        const limit = parseInt(req.query.limit) || 50;
        res.json(await db.getOrders(status, limit));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/orders/:id', adminAuth, async (req, res) => {
    try {
        const order = await db.getOrderById(parseInt(req.params.id));
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/orders/:id/status', adminAuth, async (req, res) => {
    try {
        await db.updateOrderStatus(parseInt(req.params.id), req.body.status);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Customers
app.get('/api/admin/customers', adminAuth, async (req, res) => {
    try {
        res.json(await db.getCustomers());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/customers/:id', adminAuth, async (req, res) => {
    try {
        const customer = await db.getCustomerById(parseInt(req.params.id));
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/customers/:id/block', adminAuth, async (req, res) => {
    try {
        await db.blockCustomer(parseInt(req.params.id), req.body.blocked);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Settings
app.get('/api/admin/settings', adminAuth, async (req, res) => {
    try {
        res.json(await db.getAllSettings());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/settings', adminAuth, async (req, res) => {
    try {
        for (const [key, value] of Object.entries(req.body)) {
            await db.setSetting(key, value);
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

// ===== Telegram Webhook Logic =====
app.post('/api/webhook', async (req, res) => {
    try {
        if (bot) {
            bot.processUpdate(req.body);
        }
        res.sendStatus(200);
    } catch (err) {
        console.error('Webhook error:', err);
        res.sendStatus(500);
    }
});

// ===== Start Server =====
// Only listen if not running in production (Vercel handles listening) OR if explicitly started
if (process.env.NODE_ENV !== 'production' || require.main === module) {
    app.listen(PORT, async () => {
        console.log(`\n🚀 Server ishga tushdi: http://localhost:${PORT}`);
        console.log(`📱 Telegram Web App: http://localhost:${PORT}/webapp`);
        console.log(`🖥️  Admin Panel: http://localhost:${PORT}/admin`);

        // Initialize Bot (Polling logic if needed, or just setting up)
        await initBot();
    });
}

// Check for Vercel environment — set webhook on first cold start
if (process.env.VERCEL && bot) {
    const webhookUrl = process.env.WEBHOOK_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    if (webhookUrl) {
        bot.setWebHook(`${webhookUrl}/api/webhook`)
            .then(() => console.log(`🔗 Webhook sozlandi: ${webhookUrl}/api/webhook`))
            .catch(err => console.error('Webhook xatolik:', err));
    }
}

module.exports = app;
