require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const db = require('./database');

const BOT_TOKEN = process.env.BOT_TOKEN;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const WEBHOOK_URL = process.env.WEBHOOK_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log('⚠️  BOT_TOKEN .env faylida sozlanmagan!');
    process.exit(1);
}

// Initialize bot without polling by default
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

// Function to initialize bot (set webhook or start polling)
const initBot = async () => {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        // Use Webhook in production
        if (WEBHOOK_URL) {
            try {
                await bot.setWebHook(`${WEBHOOK_URL}/api/webhook`);
                console.log(`🔗 Webhook sozlandi: ${WEBHOOK_URL}/api/webhook`);
            } catch (error) {
                console.error('Webhook sozlashda xatolik:', error);
            }
        } else {
            console.warn('⚠️ WEBHOOK_URL sozlanmagan! Bot ishlamasligi mumkin.');
        }
    } else {
        // Use Polling in development
        try {
            await bot.deleteWebHook();
            await bot.startPolling();
            console.log('🤖 Telegram bot (Polling) ishga tushdi!');
        } catch (error) {
            console.error('Polling xatolik:', error);
        }
    }
};

// ===== /start command =====
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    // Register customer
    await db.createOrUpdateCustomer({
        telegram_id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        language: user.language_code === 'ru' ? 'ru' : 'uz',
    });

    const customer = await db.getCustomerByTelegramId(user.id);
    const lang = customer ? customer.language : 'uz';

    const welcomeKey = `welcome_${lang}`;
    const welcomeText = (await db.getSetting(welcomeKey)) || (await db.getSetting('welcome_uz'));

    // Greeting message
    const greetingText = `🇺🇿 Assalomu alaykum! 👋\n\n${welcomeText}`;

    await bot.sendMessage(chatId, greetingText, {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: '🛒 Ochish / Открыть / Open',
                    web_app: { url: `${SERVER_URL}/webapp?telegram_id=${user.id}` }
                }],
            ]
        }
    });
});

// ===== /menu command =====
bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    await bot.sendMessage(chatId, '🍽️ Menyu ochish uchun quyidagi tugmani bosing:', {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: '📋 Menyuni ochish',
                    web_app: { url: `${SERVER_URL}/webapp?telegram_id=${user.id}` }
                }],
            ]
        }
    });
});

// ===== /help command =====
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const shopPhone = (await db.getSetting('shop_phone')) || '+998 90 123 45 67';

    await bot.sendMessage(chatId,
        `ℹ️ *Yordam*\n\n` +
        `📱 Buyurtma berish: /start bosing\n` +
        `🍽️ Menyu ko'rish: /menu bosing\n` +
        `📍 Manzilimiz: /location bosing\n` +
        `📞 Aloqa: ${shopPhone}\n\n` +
        `Savollar uchun shu raqamga murojaat qiling.`,
        { parse_mode: 'Markdown' }
    );
});

// ===== /language command =====
bot.onText(/\/language/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, '🌐 Tilni tanlang / Выберите язык / Choose language:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🇺🇿 O'zbekcha", callback_data: 'lang_uz' }],
                [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
                [{ text: '🇺🇸 English', callback_data: 'lang_en' }],
            ]
        }
    });
});

// ===== Callback Queries =====
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;

    if (data.startsWith('lang_')) {
        const lang = data.replace('lang_', '');
        const customer = await db.getCustomerByTelegramId(userId);
        if (customer) {
            await db.createOrUpdateCustomer({
                telegram_id: userId,
                first_name: customer.first_name,
                last_name: customer.last_name,
                username: customer.username,
                language: lang,
            });
        }

        const messages = {
            uz: "✅ Til o'zbekchaga o'zgartirildi!",
            ru: "✅ Язык изменён на русский!",
            en: "✅ Language changed to English!",
        };

        await bot.answerCallbackQuery(callbackQuery.id, { text: messages[lang] });
        try {
            await bot.editMessageText(messages[lang], {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
            });
        } catch (e) { /* ignore if message content is same */ }
    }
});

// ===== Contact handler =====
bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const phone = msg.contact.phone_number;

    await db.updateCustomerPhone(msg.from.id, phone);

    await bot.sendMessage(chatId, `✅ Telefon raqamingiz saqlandi: ${phone}`);
});

// ===== Location handler =====
bot.on('location', async (msg) => {
    const chatId = msg.chat.id;

    await db.updateCustomerAddress(
        msg.from.id,
        `${msg.location.latitude}, ${msg.location.longitude}`,
        msg.location.latitude,
        msg.location.longitude
    );

    await bot.sendMessage(chatId, '✅ Manzilingiz saqlandi!');
});

// ===== Web App Data handler =====
bot.on('web_app_data', async (msg) => {
    const chatId = msg.chat.id;

    try {
        const data = JSON.parse(msg.web_app_data.data);

        if (data.type === 'order') {
            // Order was placed through web app
            await bot.sendMessage(chatId,
                `✅ *Buyurtmangiz qabul qilindi!*\n\n` +
                `📦 Buyurtma raqami: *${data.order_number}*\n` +
                `💰 Jami: *${data.total.toLocaleString()} so'm*\n\n` +
                `Tez orada siz bilan bog'lanamiz! 📞`,
                { parse_mode: 'Markdown' }
            );
        }
    } catch (e) {
        console.error('Web App data error:', e);
    }
});

// ===== Notify admin about new order =====
const notifyNewOrder = async (order) => {
    // You can set admin chat ID in settings
    const adminChatId = await db.getSetting('admin_chat_id');
    if (!adminChatId) return;

    try {
        const fullOrder = await db.getOrderById(order.id);
        if (!fullOrder) return;

        let itemsList = '';
        if (fullOrder.items) {
            itemsList = fullOrder.items.map(item =>
                `  • ${item.product_name} x${item.quantity} = ${item.total.toLocaleString()} so'm`
            ).join('\n');
        }

        const statusEmojis = {
            delivery: '🚚 Yetkazib berish',
            pickup: '🏪 Olib ketish',
        };

        await bot.sendMessage(adminChatId,
            `🆕 *YANGI BUYURTMA!*\n\n` +
            `📦 Raqam: *${fullOrder.order_number}*\n` +
            `👤 Mijoz: ${fullOrder.first_name} ${fullOrder.last_name}\n` +
            `📞 Tel: ${fullOrder.phone || fullOrder.customer_phone}\n` +
            `📍 Manzil: ${fullOrder.address || 'Koʻrsatilmagan'}\n` +
            `📋 Turi: ${statusEmojis[fullOrder.type] || fullOrder.type}\n\n` +
            `🛒 *Mahsulotlar:*\n${itemsList}\n\n` +
            `💰 Jami: *${fullOrder.total.toLocaleString()} so'm*`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('Admin notification error:', e);
    }
};

module.exports = { bot, initBot, notifyNewOrder };
