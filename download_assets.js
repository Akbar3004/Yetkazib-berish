const fs = require('fs');
const path = require('path');
const https = require('https');

const assets = [
    { url: 'https://em-content.zobj.net/source/microsoft-teams/337/bento-box_1f371.png', target: 'combo.png' },
    { url: 'https://em-content.zobj.net/source/microsoft-teams/337/burrito_1f32f.png', target: 'lavash.png' },
    { url: 'https://em-content.zobj.net/source/microsoft-teams/337/hamburger_1f354.png', target: 'burger.png' },
    { url: 'https://em-content.zobj.net/source/microsoft-teams/337/sandwich_1f96a.png', target: 'sandwich.png' },
    { url: 'https://em-content.zobj.net/source/microsoft-teams/337/hot-dog_1f32d.png', target: 'hot-dog.png' },
    { url: 'https://em-content.zobj.net/source/microsoft-teams/337/pizza_1f355.png', target: 'pizza.png' },
    { url: 'https://em-content.zobj.net/source/microsoft-teams/337/cup-with-straw_1f964.png', target: 'drinks.png' },
    { url: 'https://em-content.zobj.net/source/microsoft-teams/337/shortcake_1f370.png', target: 'desserts.png' },
    { url: 'https://em-content.zobj.net/source/microsoft-teams/337/rocket_1f680.png', target: 'logo.png', dest: 'public' }
];

const downloadFile = (url, destPath) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded: ${destPath}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => { });
            reject(err);
        });
    });
};

const run = async () => {
    const categoriesDir = path.join(__dirname, 'public', 'uploads', 'categories');
    if (!fs.existsSync(categoriesDir)) {
        fs.mkdirSync(categoriesDir, { recursive: true });
    }

    for (const asset of assets) {
        const destDir = asset.dest === 'public' ? path.join(__dirname, 'public') : categoriesDir;
        const destPath = path.join(destDir, asset.target);

        try {
            await downloadFile(asset.url, destPath);
        } catch (err) {
            console.error(err.message);
        }
    }
};

run();
