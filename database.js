const { createClient } = require('@libsql/client');
require('dotenv').config();

const url = process.env.TURSO_DATABASE_URL || (process.env.VERCEL ? 'file:/tmp/local.db' : 'file:local.db');
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
    url,
    authToken,
});

// Helper for running queries
const db = {
    execute: async (sql, args = []) => {
        return await client.execute({ sql, args });
    },
    batch: async (stmts) => {
        return await client.batch(stmts);
    }
};

// Initialize Database Tables
const initDb = async () => {
    try {
        await client.batch([
            `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_uz TEXT NOT NULL,
        name_ru TEXT DEFAULT '',
        name_en TEXT DEFAULT '',
        icon TEXT DEFAULT '🍽️',
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        name_uz TEXT NOT NULL,
        name_ru TEXT DEFAULT '',
        name_en TEXT DEFAULT '',
        description_uz TEXT DEFAULT '',
        description_ru TEXT DEFAULT '',
        description_en TEXT DEFAULT '',
        price INTEGER NOT NULL,
        old_price INTEGER DEFAULT 0,
        image TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        is_popular INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )`,
            `CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE,
        first_name TEXT DEFAULT '',
        last_name TEXT DEFAULT '',
        username TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        language TEXT DEFAULT 'uz',
        address TEXT DEFAULT '',
        latitude REAL DEFAULT 0,
        longitude REAL DEFAULT 0,
        is_blocked INTEGER DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        total_spent INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_order_at DATETIME
      )`,
            `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        type TEXT DEFAULT 'delivery',
        status TEXT DEFAULT 'new',
        address TEXT DEFAULT '',
        latitude REAL DEFAULT 0,
        longitude REAL DEFAULT 0,
        phone TEXT DEFAULT '',
        comment TEXT DEFAULT '',
        subtotal INTEGER DEFAULT 0,
        delivery_fee INTEGER DEFAULT 0,
        total INTEGER DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )`,
            `CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        price INTEGER NOT NULL,
        total INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`,
            `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`
        ]);

        // Default Settings
        const defaultSettings = [
            ['shop_name', 'Express Delivery'],
            ['shop_name_uz', 'Express Yetkazib Berish'],
            ['shop_phone', '+998 90 123 45 67'],
            ['delivery_price', '15000'],
            ['min_order', '30000'],
            ['working_hours', '09:00 - 23:00'],
            ['is_open', '1'],
            ['currency', "so'm"],
            ['welcome_uz', "Assalomu alaykum! 👋\n\nMazali taomlarimizga buyurtma berish uchun \"Ochish\" tugmasini bosing.\n\nAgar sizda biron bir savol bo'lsa, iltimos, qo'llab-quvvatlashimizga yozing."],
            ['welcome_ru', "Здравствуйте! 👋\n\nЧтобы заказать наши блюда, нажмите кнопку \"Открыть\".\n\nЕсли у вас возникнут вопросы, напишите в нашу поддержку."],
            ['welcome_en', "Hello! 👋\n\nClick the button below \"Open\" to start ordering our delicious dishes.\n\nIf you have any questions, write to our support."]
        ];

        for (const [key, value] of defaultSettings) {
            await client.execute({
                sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
                args: [key, value]
            });
        }

        // Seed Demo Data if empty
        const categoryCount = await client.execute('SELECT COUNT(*) as count FROM categories');
        if (categoryCount.rows[0].count === 0) {
            const categories = [
                ['Kombo', 'Комбо', 'Combo', '🍱', 1],
                ['Lavash', 'Лаваш', 'Lavash', '🌯', 2],
                ['Burger', 'Бургер', 'Burger', '🍔', 3],
                ['Sendvich', 'Сэндвич', 'Sandwich', '🥪', 4],
                ['Hot-dog', 'Хот-дог', 'Hot-dog', '🌭', 5],
                ['Pizza', 'Пицца', 'Pizza', '🍕', 6],
                ['Ichimliklar', 'Напитки', 'Drinks', '🥤', 7],
                ['Desertlar', 'Десерты', 'Desserts', '🍰', 8],
            ];
            for (const cat of categories) {
                await client.execute({
                    sql: 'INSERT INTO categories (name_uz, name_ru, name_en, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
                    args: cat
                });
            }


            const products = [
                [1, "Ta'bi Nozik Combo", "Комбо Та'би Нозик", "Ta'bi Nozik Combo", "Klab-sendvich + Limonad", "Клаб-сэндвич + Лимонад", "Club sandwich + Lemonade", 56000, 65000, 1, 1],
                [1, "Kamtar Combo", "Комбо Камтар", "Kamtar Combo", "Hot-dog + Kartoshka fri + Cola", "Хот-дог + Картошка фри + Кола", "Hot-dog + French fries + Cola", 42000, 0, 1, 2],
                [1, "Oilaviy Combo", "Семейное Комбо", "Family Combo", "2 ta Burger + 2 Kartoshka fri + 2 Cola", "2 Бургера + 2 Картошки фри + 2 Колы", "2 Burgers + 2 French fries + 2 Colas", 89000, 105000, 1, 3],
                [2, "Katta Lavash", "Большой Лаваш", "Large Lavash", "Go'sht, sabzavotlar, sous", "Мясо, овощи, соус", "Meat, vegetables, sauce", 35000, 0, 0, 1],
                [2, "Mini Lavash", "Мини Лаваш", "Mini Lavash", "Go'sht, sabzavotlar, sous", "Мясо, овощи, соус", "Meat, vegetables, sauce", 25000, 0, 0, 2],
                [2, "Juji Lavash", "Куриный Лаваш", "Chicken Lavash", "Tovuq go'shti, sabzavotlar, sous", "Куриное мясо, овощи, соус", "Chicken meat, vegetables, sauce", 32000, 0, 1, 3],
                [3, "Classic Burger", "Классик Бургер", "Classic Burger", "Mol go'shti, salat, pomidor, sous", "Говядина, салат, помидор, соус", "Beef, lettuce, tomato, sauce", 38000, 0, 1, 1],
                [3, "Cheese Burger", "Чизбургер", "Cheese Burger", "Mol go'shti, cheddar pishloq, sous", "Говядина, сыр чеддер, соус", "Beef, cheddar cheese, sauce", 42000, 0, 0, 2],
                [3, "Double Burger", "Двойной Бургер", "Double Burger", "2x mol go'shti, pishloq, sous", "2x говядина, сыр, соус", "2x beef, cheese, sauce", 55000, 0, 0, 3],
                [4, "Club Sendvich", "Клаб Сэндвич", "Club Sandwich", "Tovuq, bekon, salat, pomidor", "Курица, бекон, салат, помидор", "Chicken, bacon, lettuce, tomato", 35000, 0, 0, 1],
                [5, "Classic Hot-dog", "Классик Хот-дог", "Classic Hot-dog", "Sosiska, gorchitsa, ketchup", "Сосиска, горчица, кетчуп", "Sausage, mustard, ketchup", 22000, 0, 0, 1],
                [5, "Mega Hot-dog", "Мега Хот-дог", "Mega Hot-dog", "Katta sosiska, pishloq, sous", "Большая сосиска, сыр, соус", "Large sausage, cheese, sauce", 30000, 0, 1, 2],
                [6, "Margarita Pizza", "Пицца Маргарита", "Margherita Pizza", "Mozzarella, pomidor sousi, rayhon", "Моцарелла, томатный соус, базилик", "Mozzarella, tomato sauce, basil", 55000, 0, 0, 1],
                [6, "Pepperoni Pizza", "Пицца Пепперони", "Pepperoni Pizza", "Pepperoni, mozzarella, sous", "Пепперони, моцарелла, соус", "Pepperoni, mozzarella, sauce", 62000, 0, 1, 2],
                [7, "Coca-Cola 0.5L", "Кока-Кола 0.5Л", "Coca-Cola 0.5L", "", "", "", 8000, 0, 0, 1],
                [7, "Fanta 0.5L", "Фанта 0.5Л", "Fanta 0.5L", "", "", "", 8000, 0, 0, 2],
                [7, "Limonad", "Лимонад", "Lemonade", "Tabiiy limon bilan", "С натуральным лимоном", "With natural lemon", 12000, 0, 0, 3],
                [8, "Tiramisu", "Тирамису", "Tiramisu", "Italyan deserti", "Итальянский десерт", "Italian dessert", 28000, 0, 0, 1],
            ];

            for (const prod of products) {
                await client.execute({
                    sql: 'INSERT INTO products (category_id, name_uz, name_ru, name_en, description_uz, description_ru, description_en, price, old_price, is_popular, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    args: prod
                });
            }
        }
    } catch (err) {
        console.error("Database initialization error:", err);
    }
}

// ===== Helper Functions (Refactored to Async) =====
const dbHelpers = {
    // Categories
    getCategories: async () => (await client.execute('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order')).rows,
    getAllCategories: async () => (await client.execute('SELECT * FROM categories ORDER BY sort_order')).rows,
    getCategoryById: async (id) => (await client.execute({ sql: 'SELECT * FROM categories WHERE id = ?', args: [id] })).rows[0],
    createCategory: async (data) => {
        const res = await client.execute({
            sql: `INSERT INTO categories (name_uz, name_ru, name_en, icon, sort_order) VALUES (?, ?, ?, ?, ?)`,
            args: [data.name_uz, data.name_ru || '', data.name_en || '', data.icon || '🍽️', data.sort_order || 0]
        });
        return { id: res.lastInsertRowid ? Number(res.lastInsertRowid) : 0, ...data };
    },
    updateCategory: async (id, data) => {
        return await client.execute({
            sql: `UPDATE categories SET name_uz = ?, name_ru = ?, name_en = ?, icon = ?, sort_order = ?, is_active = ? WHERE id = ?`,
            args: [data.name_uz, data.name_ru || '', data.name_en || '', data.icon || '🍽️', data.sort_order || 0, data.is_active ? 1 : 0, id]
        });
    },
    deleteCategory: async (id) => await client.execute({ sql: 'DELETE FROM categories WHERE id = ?', args: [id] }),

    // Products
    getProducts: async () => (await client.execute('SELECT p.*, c.name_uz as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1 ORDER BY p.sort_order')).rows,
    getAllProducts: async () => (await client.execute('SELECT p.*, c.name_uz as category_name FROM products p JOIN categories c ON p.category_id = c.id ORDER BY p.sort_order')).rows,
    getProductsByCategory: async (categoryId) => (await client.execute({ sql: 'SELECT * FROM products WHERE category_id = ? AND is_active = 1 ORDER BY sort_order', args: [categoryId] })).rows,
    getProductById: async (id) => (await client.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [id] })).rows[0],
    getPopularProducts: async () => (await client.execute('SELECT * FROM products WHERE is_popular = 1 AND is_active = 1 ORDER BY sort_order')).rows,
    createProduct: async (data) => {
        const res = await client.execute({
            sql: `INSERT INTO products (category_id, name_uz, name_ru, name_en, description_uz, description_ru, description_en, price, old_price, image, is_popular, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                data.category_id, data.name_uz, data.name_ru || '', data.name_en || '',
                data.description_uz || '', data.description_ru || '', data.description_en || '',
                data.price, data.old_price || 0, data.image || '', data.is_popular ? 1 : 0, data.sort_order || 0
            ]
        });
        return { id: res.lastInsertRowid ? Number(res.lastInsertRowid) : 0, ...data };
    },
    updateProduct: async (id, data) => {
        return await client.execute({
            sql: `UPDATE products SET category_id = ?, name_uz = ?, name_ru = ?, name_en = ?, description_uz = ?, description_ru = ?, description_en = ?,
            price = ?, old_price = ?, image = ?, is_active = ?, is_popular = ?, sort_order = ? WHERE id = ?`,
            args: [
                data.category_id, data.name_uz, data.name_ru || '', data.name_en || '',
                data.description_uz || '', data.description_ru || '', data.description_en || '',
                data.price, data.old_price || 0, data.image || '', data.is_active ? 1 : 0, data.is_popular ? 1 : 0, data.sort_order || 0, id
            ]
        });
    },
    deleteProduct: async (id) => await client.execute({ sql: 'DELETE FROM products WHERE id = ?', args: [id] }),

    // Customers
    getCustomers: async () => (await client.execute('SELECT * FROM customers ORDER BY created_at DESC')).rows,
    getCustomerByTelegramId: async (telegramId) => (await client.execute({ sql: 'SELECT * FROM customers WHERE telegram_id = ?', args: [telegramId] })).rows[0],
    getCustomerById: async (id) => (await client.execute({ sql: 'SELECT * FROM customers WHERE id = ?', args: [id] })).rows[0],
    createOrUpdateCustomer: async (data) => {
        const existing = (await client.execute({ sql: 'SELECT * FROM customers WHERE telegram_id = ?', args: [data.telegram_id] })).rows[0];
        if (existing) {
            await client.execute({
                sql: `UPDATE customers SET first_name = ?, last_name = ?, username = ?, language = ? WHERE telegram_id = ?`,
                args: [data.first_name || '', data.last_name || '', data.username || '', data.language || 'uz', data.telegram_id]
            });
            return (await client.execute({ sql: 'SELECT * FROM customers WHERE telegram_id = ?', args: [data.telegram_id] })).rows[0];
        } else {
            await client.execute({
                sql: `INSERT INTO customers (telegram_id, first_name, last_name, username, language) VALUES (?, ?, ?, ?, ?)`,
                args: [data.telegram_id, data.first_name || '', data.last_name || '', data.username || '', data.language || 'uz']
            });
            return (await client.execute({ sql: 'SELECT * FROM customers WHERE telegram_id = ?', args: [data.telegram_id] })).rows[0];
        }
    },
    updateCustomerPhone: async (telegramId, phone) => await client.execute({ sql: 'UPDATE customers SET phone = ? WHERE telegram_id = ?', args: [phone, telegramId] }),
    updateCustomerAddress: async (telegramId, address, lat, lng) => await client.execute({ sql: 'UPDATE customers SET address = ?, latitude = ?, longitude = ? WHERE telegram_id = ?', args: [address, lat, lng, telegramId] }),
    blockCustomer: async (id, blocked) => await client.execute({ sql: 'UPDATE customers SET is_blocked = ? WHERE id = ?', args: [blocked ? 1 : 0, id] }),

    // Orders
    getOrders: async (status = null, limit = 50) => {
        if (status) {
            return (await client.execute({
                sql: `SELECT o.*, c.first_name, c.last_name, c.phone as customer_phone, c.telegram_id 
                FROM orders o JOIN customers c ON o.customer_id = c.id 
                WHERE o.status = ? ORDER BY o.created_at DESC LIMIT ?`,
                args: [status, limit]
            })).rows;
        }
        return (await client.execute({
            sql: `SELECT o.*, c.first_name, c.last_name, c.phone as customer_phone, c.telegram_id 
            FROM orders o JOIN customers c ON o.customer_id = c.id 
            ORDER BY o.created_at DESC LIMIT ?`,
            args: [limit]
        })).rows;
    },
    getOrderById: async (id) => {
        const order = (await client.execute({
            sql: `SELECT o.*, c.first_name, c.last_name, c.phone as customer_phone, c.telegram_id 
            FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.id = ?`,
            args: [id]
        })).rows[0];
        if (order) {
            order.items = (await client.execute({ sql: 'SELECT * FROM order_items WHERE order_id = ?', args: [id] })).rows;
        }
        return order;
    },
    createOrder: async (data) => {
        const orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase();
        const res = await client.execute({
            sql: `INSERT INTO orders (order_number, customer_id, type, status, address, latitude, longitude, phone, comment, subtotal, delivery_fee, total, payment_method)
            VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                orderNumber, data.customer_id, data.type || 'delivery', data.address || '', data.latitude || 0, data.longitude || 0,
                data.phone || '', data.comment || '', data.subtotal, data.delivery_fee || 0, data.total, data.payment_method || 'cash'
            ]
        });

        const orderId = res.lastInsertRowid;

        if (data.items && data.items.length > 0) {
            for (const item of data.items) {
                await client.execute({
                    sql: `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)`,
                    args: [orderId, item.product_id, item.product_name, item.quantity, item.price, item.quantity * item.price]
                });
            }
        }

        // Update customer stats
        await client.execute({
            sql: 'UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ?, last_order_at = CURRENT_TIMESTAMP WHERE id = ?',
            args: [data.total, data.customer_id]
        });

        return (await client.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [orderId] })).rows[0];
    },
    updateOrderStatus: async (id, status) => {
        const completedAt = (status === 'completed' || status === 'cancelled') ? new Date().toISOString() : null;
        return await client.execute({
            sql: `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP, completed_at = COALESCE(?, completed_at) WHERE id = ?`,
            args: [status, completedAt, id]
        });
    },

    // Settings
    getSetting: async (key) => {
        const row = (await client.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: [key] })).rows[0];
        return row ? row.value : null;
    },
    getAllSettings: async () => {
        const rows = (await client.execute('SELECT * FROM settings')).rows;
        const settings = {};
        rows.forEach(row => { settings[row.key] = row.value; });
        return settings;
    },
    setSetting: async (key, value) => await client.execute({ sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', args: [key, value] }),

    // Stats
    getStats: async () => {
        const today = new Date().toISOString().split('T')[0];
        const rows0 = (await client.execute('SELECT COUNT(*) as count FROM orders')).rows[0];
        const rows1 = (await client.execute({ sql: "SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ?", args: [today] })).rows[0];
        const rows2 = (await client.execute("SELECT COUNT(*) as count FROM orders WHERE status = 'new'")).rows[0];
        const rows3 = (await client.execute("SELECT COUNT(*) as count FROM orders WHERE status IN ('new', 'confirmed', 'preparing', 'delivering')")).rows[0];
        const rows4 = (await client.execute('SELECT COUNT(*) as count FROM customers')).rows[0];
        const rows5 = (await client.execute("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status = 'completed'")).rows[0];
        const rows6 = (await client.execute({ sql: "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status = 'completed' AND DATE(created_at) = ?", args: [today] })).rows[0];
        const rows7 = (await client.execute('SELECT COUNT(*) as count FROM products WHERE is_active = 1')).rows[0];

        return {
            totalOrders: rows0.count,
            todayOrders: rows1.count,
            newOrders: rows2.count,
            activeOrders: rows3.count,
            totalCustomers: rows4.count,
            totalRevenue: rows5.total,
            todayRevenue: rows6.total,
            totalProducts: rows7.count,
        };
    },
};

module.exports = { db, initDb, ...dbHelpers };
