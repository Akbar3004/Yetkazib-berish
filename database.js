const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'delivery.db'));

// WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ===== Create Tables =====
db.exec(`
  -- Kategoriyalar
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_uz TEXT NOT NULL,
    name_ru TEXT DEFAULT '',
    name_en TEXT DEFAULT '',
    icon TEXT DEFAULT '🍽️',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Mahsulotlar
  CREATE TABLE IF NOT EXISTS products (
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
  );

  -- Mijozlar
  CREATE TABLE IF NOT EXISTS customers (
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
  );

  -- Buyurtmalar
  CREATE TABLE IF NOT EXISTS orders (
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
  );

  -- Buyurtma elementlari
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    price INTEGER NOT NULL,
    total INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- Sozlamalar
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ===== Default Settings =====
const defaultSettings = {
    'shop_name': 'Express Delivery',
    'shop_name_uz': 'Express Yetkazib Berish',
    'shop_phone': '+998 90 123 45 67',
    'delivery_price': '15000',
    'min_order': '30000',
    'working_hours': '09:00 - 23:00',
    'is_open': '1',
    'currency': "so'm",
    'welcome_uz': "Assalomu alaykum! 👋\n\nMazali taomlarimizga buyurtma berish uchun \"Ochish\" tugmasini bosing.\n\nAgar sizda biron bir savol bo'lsa, iltimos, qo'llab-quvvatlashimizga yozing.",
    'welcome_ru': "Здравствуйте! 👋\n\nЧтобы заказать наши блюда, нажмите кнопку \"Открыть\".\n\nЕсли у вас возникнут вопросы, напишите в нашу поддержку.",
    'welcome_en': "Hello! 👋\n\nClick the button below \"Open\" to start ordering our delicious dishes.\n\nIf you have any questions, write to our support."
};

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value);
}

// ===== Seed Demo Data =====
const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
if (categoryCount.count === 0) {
    const insertCategory = db.prepare(`
    INSERT INTO categories (name_uz, name_ru, name_en, icon, sort_order) 
    VALUES (?, ?, ?, ?, ?)
  `);

    const categories = [
        ['Kombo', 'Комбо', 'Combo', 'fi fi-rr-box-alt', 1],
        ['Lavash', 'Лаваш', 'Lavash', 'fi fi-rr-burrito', 2],
        ['Burger', 'Бургер', 'Burger', 'fi fi-rr-hamburger', 3],
        ['Sendvich', 'Сэндвич', 'Sandwich', 'fi fi-rr-sandwich', 4],
        ['Hot-dog', 'Хот-дог', 'Hot-dog', 'fi fi-rr-hotdog', 5],
        ['Pizza', 'Пицца', 'Pizza', 'fi fi-rr-pizza-slice', 6],
        ['Ichimliklar', 'Напитки', 'Drinks', 'fi fi-rr-drink-alt', 7],
        ['Desertlar', 'Десерты', 'Desserts', 'fi fi-rr-cake-slice', 8],
    ];

    categories.forEach(cat => insertCategory.run(...cat));

    const insertProduct = db.prepare(`
    INSERT INTO products (category_id, name_uz, name_ru, name_en, description_uz, description_ru, description_en, price, old_price, is_popular, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

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

    products.forEach(prod => insertProduct.run(...prod));
}

// ===== Helper Functions =====
const dbHelpers = {
    // Categories
    getCategories: () => db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order').all(),
    getAllCategories: () => db.prepare('SELECT * FROM categories ORDER BY sort_order').all(),
    getCategoryById: (id) => db.prepare('SELECT * FROM categories WHERE id = ?').get(id),
    createCategory: (data) => {
        return db.prepare(`INSERT INTO categories (name_uz, name_ru, name_en, icon, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
            data.name_uz, data.name_ru || '', data.name_en || '', data.icon || 'fi fi-rr-box-alt', data.sort_order || 0
        );
    },
    updateCategory: (id, data) => {
        return db.prepare(`UPDATE categories SET name_uz = ?, name_ru = ?, name_en = ?, icon = ?, sort_order = ?, is_active = ? WHERE id = ?`).run(
            data.name_uz, data.name_ru || '', data.name_en || '', data.icon || 'fi fi-rr-box-alt', data.sort_order || 0, data.is_active ? 1 : 0, id
        );
    },
    deleteCategory: (id) => db.prepare('DELETE FROM categories WHERE id = ?').run(id),

    // Products
    getProducts: () => db.prepare('SELECT p.*, c.name_uz as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1 ORDER BY p.sort_order').all(),
    getAllProducts: () => db.prepare('SELECT p.*, c.name_uz as category_name FROM products p JOIN categories c ON p.category_id = c.id ORDER BY p.sort_order').all(),
    getProductsByCategory: (categoryId) => db.prepare('SELECT * FROM products WHERE category_id = ? AND is_active = 1 ORDER BY sort_order').all(categoryId),
    getProductById: (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id),
    getPopularProducts: () => db.prepare('SELECT * FROM products WHERE is_popular = 1 AND is_active = 1 ORDER BY sort_order').all(),
    createProduct: (data) => {
        return db.prepare(`INSERT INTO products (category_id, name_uz, name_ru, name_en, description_uz, description_ru, description_en, price, old_price, image, is_popular, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            data.category_id, data.name_uz, data.name_ru || '', data.name_en || '',
            data.description_uz || '', data.description_ru || '', data.description_en || '',
            data.price, data.old_price || 0, data.image || '', data.is_popular ? 1 : 0, data.sort_order || 0
        );
    },
    updateProduct: (id, data) => {
        return db.prepare(`UPDATE products SET category_id = ?, name_uz = ?, name_ru = ?, name_en = ?, description_uz = ?, description_ru = ?, description_en = ?,
      price = ?, old_price = ?, image = ?, is_active = ?, is_popular = ?, sort_order = ? WHERE id = ?`).run(
            data.category_id, data.name_uz, data.name_ru || '', data.name_en || '',
            data.description_uz || '', data.description_ru || '', data.description_en || '',
            data.price, data.old_price || 0, data.image || '', data.is_active ? 1 : 0, data.is_popular ? 1 : 0, data.sort_order || 0, id
        );
    },
    deleteProduct: (id) => db.prepare('DELETE FROM products WHERE id = ?').run(id),

    // Customers
    getCustomers: () => db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all(),
    getCustomerByTelegramId: (telegramId) => db.prepare('SELECT * FROM customers WHERE telegram_id = ?').get(telegramId),
    getCustomerById: (id) => db.prepare('SELECT * FROM customers WHERE id = ?').get(id),
    createOrUpdateCustomer: (data) => {
        const existing = db.prepare('SELECT * FROM customers WHERE telegram_id = ?').get(data.telegram_id);
        if (existing) {
            db.prepare(`UPDATE customers SET first_name = ?, last_name = ?, username = ?, language = ? WHERE telegram_id = ?`).run(
                data.first_name || '', data.last_name || '', data.username || '', data.language || 'uz', data.telegram_id
            );
            return db.prepare('SELECT * FROM customers WHERE telegram_id = ?').get(data.telegram_id);
        } else {
            db.prepare(`INSERT INTO customers (telegram_id, first_name, last_name, username, language) VALUES (?, ?, ?, ?, ?)`).run(
                data.telegram_id, data.first_name || '', data.last_name || '', data.username || '', data.language || 'uz'
            );
            return db.prepare('SELECT * FROM customers WHERE telegram_id = ?').get(data.telegram_id);
        }
    },
    updateCustomerPhone: (telegramId, phone) => db.prepare('UPDATE customers SET phone = ? WHERE telegram_id = ?').run(phone, telegramId),
    updateCustomerAddress: (telegramId, address, lat, lng) => db.prepare('UPDATE customers SET address = ?, latitude = ?, longitude = ? WHERE telegram_id = ?').run(address, lat, lng, telegramId),
    blockCustomer: (id, blocked) => db.prepare('UPDATE customers SET is_blocked = ? WHERE id = ?').run(blocked ? 1 : 0, id),

    // Orders
    getOrders: (status = null, limit = 50) => {
        if (status) {
            return db.prepare(`SELECT o.*, c.first_name, c.last_name, c.phone as customer_phone, c.telegram_id 
        FROM orders o JOIN customers c ON o.customer_id = c.id 
        WHERE o.status = ? ORDER BY o.created_at DESC LIMIT ?`).all(status, limit);
        }
        return db.prepare(`SELECT o.*, c.first_name, c.last_name, c.phone as customer_phone, c.telegram_id 
      FROM orders o JOIN customers c ON o.customer_id = c.id 
      ORDER BY o.created_at DESC LIMIT ?`).all(limit);
    },
    getOrderById: (id) => {
        const order = db.prepare(`SELECT o.*, c.first_name, c.last_name, c.phone as customer_phone, c.telegram_id 
      FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.id = ?`).get(id);
        if (order) {
            order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
        }
        return order;
    },
    createOrder: (data) => {
        const orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase();
        const result = db.prepare(`INSERT INTO orders (order_number, customer_id, type, status, address, latitude, longitude, phone, comment, subtotal, delivery_fee, total, payment_method)
      VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            orderNumber, data.customer_id, data.type || 'delivery', data.address || '', data.latitude || 0, data.longitude || 0,
            data.phone || '', data.comment || '', data.subtotal, data.delivery_fee || 0, data.total, data.payment_method || 'cash'
        );

        const orderId = result.lastInsertRowid;
        const insertItem = db.prepare(`INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)`);

        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                insertItem.run(orderId, item.product_id, item.product_name, item.quantity, item.price, item.quantity * item.price);
            });
        }

        // Update customer stats
        db.prepare('UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ?, last_order_at = CURRENT_TIMESTAMP WHERE id = ?').run(data.total, data.customer_id);

        return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    },
    updateOrderStatus: (id, status) => {
        const completedAt = (status === 'completed' || status === 'cancelled') ? new Date().toISOString() : null;
        return db.prepare(`UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP, completed_at = COALESCE(?, completed_at) WHERE id = ?`).run(status, completedAt, id);
    },

    // Settings
    getSetting: (key) => {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        return row ? row.value : null;
    },
    getAllSettings: () => {
        const rows = db.prepare('SELECT * FROM settings').all();
        const settings = {};
        rows.forEach(row => { settings[row.key] = row.value; });
        return settings;
    },
    setSetting: (key, value) => db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value),

    // Stats
    getStats: () => {
        const today = new Date().toISOString().split('T')[0];
        return {
            totalOrders: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
            todayOrders: db.prepare("SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ?").get(today).count,
            newOrders: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'new'").get().count,
            activeOrders: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('new', 'confirmed', 'preparing', 'delivering')").get().count,
            totalCustomers: db.prepare('SELECT COUNT(*) as count FROM customers').get().count,
            totalRevenue: db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status = 'completed'").get().total,
            todayRevenue: db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status = 'completed' AND DATE(created_at) = ?").get(today).total,
            totalProducts: db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get().count,
        };
    },
};

module.exports = { db, ...dbHelpers };
