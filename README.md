# 🚀 Express Delivery - Yetkazib Berish Xizmati

Telegram bot va admin panel orqali yetkazib berish xizmatini avtomatlashtirish tizimi.

## 🛠️ Texnologiyalar

- **Backend:** Node.js + Express.js
- **Database:** SQLite (better-sqlite3)
- **Bot:** node-telegram-bot-api
- **Frontend:** HTML5 + CSS3 + Vanilla JS

## 📁 Loyiha tuzilmasi

```
├── server.js              # Express server va REST API
├── database.js            # SQLite ma'lumotlar bazasi
├── bot.js                 # Telegram bot
├── .env                   # Konfiguratsiya sozlamalari
├── public/
│   ├── webapp/            # Telegram Web App (mijozlar uchun)
│   │   ├── index.html
│   │   ├── style.css
│   │   └── app.js
│   └── admin/             # Admin panel (boshqaruv)
│       ├── index.html
│       ├── style.css
│       └── app.js
└── uploads/               # Mahsulot rasmlari
```

## 🚀 Ishga tushirish

### 1. Bog'liqliklarni o'rnating
```bash
npm install
```

### 2. `.env` faylini sozlang
```env
BOT_TOKEN=your_telegram_bot_token
SERVER_URL=https://your-domain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 3. Serverni ishga tushiring
```bash
npm start
```

### 4. Telegram botni ishga tushiring (alohida terminal)
```bash
npm run bot
```

## 🔗 Havolalar

Server ishga tushgandan so'ng:
- **🖥️ Admin Panel:** http://localhost:3000/admin
- **📱 Web App:** http://localhost:3000/webapp

## 📋 Admin Panel funksiyalari

- **Dashboard** — Statistika: bugungi buyurtmalar, daromad, mijozlar
- **Buyurtmalar** — Buyurtmalarni boshqarish (yangi → tasdiqlangan → tayyorlanmoqda → yetkazilmoqda → bajarildi)
- **Mahsulotlar** — Mahsulotlar CRUD (qo'shish, tahrirlash, o'chirish, rasm yuklash)
- **Kategoriyalar** — Kategoriyalar boshqaruvi
- **Mijozlar** — Mijozlar bazasi, bloklash
- **Sozlamalar** — Do'kon nomi, narxlar, ish vaqti, Telegram admin chat ID

## 🤖 Telegram Bot funksiyalari

- **/start** — Xush kelibsiz xabari + Web App tugmasi
- **/menu** — Menyu ochish
- **/help** — Yordam
- **/language** — Til almashtirish
- **Tillar:** O'zbekcha, Русский, English

## 📱 Telegram Web App funksiyalari

- Til tanlash (UZ/RU/EN)
- Buyurtma turi (Yetkazib berish / Olib ketish)
- Manzil kiritish
- Menyu ko'rish (kategoriyalar, qidiruv)
- Mahsulot tafsilotlari
- Savatcha (qo'shish, o'chirish, miqdor)
- Sevimlilar ro'yxati
- Profil
- Buyurtma berish

## ⚙️ Telegram botni sozlash

1. [@BotFather](https://t.me/BotFather) ga `/newbot` buyrug'ini yuboring
2. Bot nomini va username'ni kiriting
3. Olingan tokenni `.env` faylga yozing
4. BotFather da `/setmenubutton` orqali Web App tugmasini sozlang:
   - URL: `https://your-domain.com/webapp`
   - Button text: `Ochish / Открыть / Open`

## 🌐 Deploy qilish

Serveringizni internetga chiqarish uchun:
1. **ngrok** — development uchun: `ngrok http 3000`
2. **Railway / Render / Vercel** — production uchun
3. `.env` da `SERVER_URL` ni yangilang

## 📝 Login ma'lumotlari

- **Login:** admin
- **Parol:** admin123
