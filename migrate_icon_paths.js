const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'delivery.db'));

const updates = [
    { name: 'Kombo', icon: '/uploads/categories/combo.png' },
    { name: 'Lavash', icon: '/uploads/categories/lavash.png' },
    { name: 'Burger', icon: '/uploads/categories/burger.png' },
    { name: 'Sendvich', icon: '/uploads/categories/sandwich.png' },
    { name: 'Hot-dog', icon: '/uploads/categories/hot-dog.png' },
    { name: 'Pizza', icon: '/uploads/categories/pizza.png' },
    { name: 'Ichimliklar', icon: '/uploads/categories/drinks.png' },
    { name: 'Desertlar', icon: '/uploads/categories/desserts.png' }
];

const updateStmt = db.prepare('UPDATE categories SET icon = ? WHERE name_uz = ?');

console.log('Starting icon path migration...');
let changes = 0;

updates.forEach(u => {
    const info = updateStmt.run(u.icon, u.name);
    changes += info.changes;
    console.log(`Updated ${u.name} -> ${u.icon}: ${info.changes} rows`);
});

console.log(`Migration complete. Total changes: ${changes}`);
