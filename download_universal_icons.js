const fs = require('fs');
const path = require('path');
const https = require('https');

// Target directory: public/uploads/categories
// We will store all icons there for now to be accessible by the picker.

const icons = [
    // Grocery / Food
    { name: 'apple', url: 'https://em-content.zobj.net/source/microsoft-teams/337/red-apple_1f34e.png' },
    { name: 'banana', url: 'https://em-content.zobj.net/source/microsoft-teams/337/banana_1f34c.png' },
    { name: 'bread', url: 'https://em-content.zobj.net/source/microsoft-teams/337/bread_1f35e.png' },
    { name: 'milk', url: 'https://em-content.zobj.net/source/microsoft-teams/337/glass-of-milk_1f95b.png' },
    { name: 'cheese', url: 'https://em-content.zobj.net/source/microsoft-teams/337/cheese-wedge_1f9c0.png' },
    { name: 'carrot', url: 'https://em-content.zobj.net/source/microsoft-teams/337/carrot_1f955.png' },
    { name: 'broccoli', url: 'https://em-content.zobj.net/source/microsoft-teams/337/broccoli_1f966.png' },
    { name: 'shopping-cart', url: 'https://em-content.zobj.net/source/microsoft-teams/337/shopping-cart_1f6d2.png' },

    // Construction
    { name: 'construction', url: 'https://em-content.zobj.net/source/microsoft-teams/337/building-construction_1f3d7.png' },
    { name: 'hammer', url: 'https://em-content.zobj.net/source/microsoft-teams/337/hammer_1f528.png' },
    { name: 'wrench', url: 'https://em-content.zobj.net/source/microsoft-teams/337/wrench_1f527.png' },
    { name: 'brick', url: 'https://em-content.zobj.net/source/microsoft-teams/337/brick_1f9f1.png' },
    { name: 'safety-vest', url: 'https://em-content.zobj.net/source/microsoft-teams/337/safety-vest_1f9ba.png' },
    { name: 'toolbox', url: 'https://em-content.zobj.net/source/microsoft-teams/337/toolbox_1f9f0.png' },

    // Clothing
    { name: 't-shirt', url: 'https://em-content.zobj.net/source/microsoft-teams/337/t-shirt_1f455.png' },
    { name: 'jeans', url: 'https://em-content.zobj.net/source/microsoft-teams/337/jeans_1f456.png' },
    { name: 'dress', url: 'https://em-content.zobj.net/source/microsoft-teams/337/dress_1f457.png' },
    { name: 'shoe', url: 'https://em-content.zobj.net/source/microsoft-teams/337/running-shoe_1f45f.png' },
    { name: 'cap', url: 'https://em-content.zobj.net/source/microsoft-teams/337/billed-cap_1f9e2.png' },
    { name: 'shopping-bags', url: 'https://em-content.zobj.net/source/microsoft-teams/337/shopping-bags_1f6cd.png' },

    // Electronics & General
    { name: 'mobile', url: 'https://em-content.zobj.net/source/microsoft-teams/337/mobile-phone_1f4f1.png' },
    { name: 'laptop', url: 'https://em-content.zobj.net/source/microsoft-teams/337/laptop_1f4bb.png' },
    { name: 'package', url: 'https://em-content.zobj.net/source/microsoft-teams/337/package_1f4e6.png' },
    { name: 'gift', url: 'https://em-content.zobj.net/source/microsoft-teams/337/wrapped-gift_1f381.png' },
    { name: 'bulb', url: 'https://em-content.zobj.net/source/microsoft-teams/337/light-bulb_1f4a1.png' },
];

const downloadFile = (url, destPath) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                fs.unlink(destPath, () => { });
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
    // Use uploads/categories as the persistent storage
    const targetDir = path.join(__dirname, 'uploads', 'categories');

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`Downloading ${icons.length} universal icons...`);

    for (const icon of icons) {
        const destPath = path.join(targetDir, `${icon.name}.png`);
        try {
            await downloadFile(icon.url, destPath);
        } catch (err) {
            console.error(`Error downloading ${icon.name}: ${err.message}`);
        }
    }
};

run();
