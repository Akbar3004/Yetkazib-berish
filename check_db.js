const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'delivery.db'));

const rows = db.prepare('SELECT id, name_uz, icon FROM categories').all();
console.table(rows);
