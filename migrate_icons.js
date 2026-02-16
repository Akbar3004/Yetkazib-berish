const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'delivery.db'));

const updates = [
    { old: '🍱', new: 'fi fi-rr-box-alt' },
    { old: '🌯', new: 'fi fi-rr-burrito' },
    { old: '🍔', new: 'fi fi-rr-hamburger' },
    { old: '🥪', new: 'fi fi-rr-sandwich' },
    { old: '🌭', new: 'fi fi-rr-hotdog' },
    { old: '🍕', new: 'fi fi-rr-pizza-slice' },
    { old: '🥤', new: 'fi fi-rr-drink-alt' },
    { old: '🍰', new: 'fi fi-rr-cake-slice' }
];

const updateStmt = db.prepare('UPDATE categories SET icon = ? WHERE icon = ?');

console.log('Starting migration...');
let changes = 0;

updates.forEach(u => {
    const info = updateStmt.run(u.new, u.old);
    changes += info.changes;
    console.log(`Updated ${u.old} -> ${u.new}: ${info.changes} rows`);
});

console.log(`Migration complete. Total changes: ${changes}`);
