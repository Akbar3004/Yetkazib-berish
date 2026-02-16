// ===== Express Delivery - Telegram Web App =====
const API_URL = window.location.origin;
const tg = window.Telegram?.WebApp;

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
}

// ===== State =====
const state = {
    lang: 'uz',
    orderType: 'delivery',
    address: '',
    phone: '',
    latitude: 0,
    longitude: 0,
    categories: [],
    products: [],
    cart: [],
    favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
    settings: {},
    currentProduct: null,
    currentQty: 1,
    activeTab: 'menu',
    activeCategory: null,
    telegramId: null,
    customer: null,
};

// Get telegram_id from URL
const urlParams = new URLSearchParams(window.location.search);
state.telegramId = urlParams.get('telegram_id') || (tg?.initDataUnsafe?.user?.id);

// ===== Translations =====
const translations = {
    uz: {
        selectLang: 'Tilni tanlang',
        orderType: 'Buyurtma turi',
        delivery: 'Yetkazib berish',
        deliveryDesc: 'Manzilingizga olib kelamiz',
        pickup: 'Olib ketish',
        pickupDesc: "O'zingiz olib keting",
        enterAddress: 'Manzilni kiriting',
        addressPlaceholder: 'Manzilni kiriting...',
        phonePlaceholder: '+998 XX XXX XX XX',
        confirmAddress: 'Manzilni tasdiqlash',
        menu: 'Menyu',
        search: 'Qidirish',
        favorites: 'Sevimlilar',
        profile: 'Profil',
        cart: 'Savatcha',
        addToCart: 'Savatga',
        products: 'Mahsulotlar',
        deliveryFee: 'Yetkazib berish',
        total: 'Jami',
        checkout: 'Buyurtma berish',
        emptyCart: "Savatcha bo'sh",
        comment: 'Izoh qoldiring...',
        orderSuccess: 'Buyurtma qabul qilindi!',
        orderSuccessDesc: 'Tez orada siz bilan bog\'lanamiz',
        backToHome: 'Bosh sahifaga',
        searchPlaceholder: 'Qidirish...',
        popular: 'Mashhur',
        all: 'Barchasi',
        deliveryLabel: 'Yetkazib berish',
        selectAddress: 'Manzil tanlang',
        totalOrders: 'Buyurtmalar',
        totalSpent: "Xarajatlar",
        changeLang: 'Tilni almashtirish',
        changeAddress: 'Manzilni almashtirish',
        support: "Qo'llab-quvvatlash",
        favEmpty: "Sevimlilar ro'yxati bo'sh",
        searchResults: 'Qidiruv natijalari',
        noResults: 'Hech narsa topilmadi',
        mapLoading: '📍 Xarita yuklanmoqda...',
        free: 'Bepul',
    },
    ru: {
        selectLang: 'Выберите язык',
        orderType: 'Тип заказа',
        delivery: 'Доставка',
        deliveryDesc: 'Доставим до вашего адреса',
        pickup: 'Самовывоз',
        pickupDesc: 'Заберите самостоятельно',
        enterAddress: 'Введите адрес',
        addressPlaceholder: 'Введите адрес...',
        phonePlaceholder: '+998 XX XXX XX XX',
        confirmAddress: 'Подтвердить адрес',
        menu: 'Меню',
        search: 'Поиск',
        favorites: 'Избранное',
        profile: 'Профиль',
        cart: 'Корзина',
        addToCart: 'В корзину',
        products: 'Продукты',
        deliveryFee: 'Доставка',
        total: 'Итого',
        checkout: 'Оформить заказ',
        emptyCart: 'Корзина пуста',
        comment: 'Оставьте комментарий...',
        orderSuccess: 'Заказ принят!',
        orderSuccessDesc: 'Мы скоро с вами свяжемся',
        backToHome: 'На главную',
        searchPlaceholder: 'Поиск...',
        popular: 'Популярное',
        all: 'Все',
        deliveryLabel: 'Доставка',
        selectAddress: 'Выберите адрес',
        totalOrders: 'Заказы',
        totalSpent: 'Расходы',
        changeLang: 'Изменить язык',
        changeAddress: 'Изменить адрес',
        support: 'Поддержка',
        favEmpty: 'Список избранного пуст',
        searchResults: 'Результаты поиска',
        noResults: 'Ничего не найдено',
        mapLoading: '📍 Загрузка карты...',
        free: 'Бесплатно',
    },
    en: {
        selectLang: 'Choose language',
        orderType: 'Order type',
        delivery: 'Delivery',
        deliveryDesc: 'We deliver to your address',
        pickup: 'Pickup',
        pickupDesc: 'Pick up by yourself',
        enterAddress: 'Enter address',
        addressPlaceholder: 'Enter your address...',
        phonePlaceholder: '+998 XX XXX XX XX',
        confirmAddress: 'Confirm address',
        menu: 'Menu',
        search: 'Search',
        favorites: 'Favorites',
        profile: 'Profile',
        cart: 'Cart',
        addToCart: 'Add to cart',
        products: 'Products',
        deliveryFee: 'Delivery fee',
        total: 'Total',
        checkout: 'Place order',
        emptyCart: 'Cart is empty',
        comment: 'Leave a comment...',
        orderSuccess: 'Order received!',
        orderSuccessDesc: 'We will contact you soon',
        backToHome: 'Back to home',
        searchPlaceholder: 'Search...',
        popular: 'Popular',
        all: 'All',
        deliveryLabel: 'Delivery',
        selectAddress: 'Select address',
        totalOrders: 'Orders',
        totalSpent: 'Spent',
        changeLang: 'Change language',
        changeAddress: 'Change address',
        support: 'Support',
        favEmpty: 'Favorites list is empty',
        searchResults: 'Search results',
        noResults: 'Nothing found',
        mapLoading: '📍 Loading map...',
        free: 'Free',
    }
};

function t(key) {
    return translations[state.lang]?.[key] || translations.uz[key] || key;
}

function getProductName(product) {
    const key = `name_${state.lang}`;
    return product[key] || product.name_uz || '';
}

function getProductDesc(product) {
    const key = `description_${state.lang}`;
    return product[key] || product.description_uz || '';
}

function getCategoryName(category) {
    const key = `name_${state.lang}`;
    return category[key] || category.name_uz || '';
}

function formatPrice(price) {
    return price.toLocaleString() + " so'm";
}

// ===== Screen Management =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
}

// ===== API Calls =====
async function apiGet(endpoint) {
    try {
        const res = await fetch(API_URL + endpoint);
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        return null;
    }
}

async function apiPost(endpoint, data) {
    try {
        const res = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        return null;
    }
}

// ===== Load Data =====
async function loadData() {
    showLoading(true);

    const [categories, products, settings] = await Promise.all([
        apiGet('/api/categories'),
        apiGet('/api/products'),
        apiGet('/api/settings/public'),
    ]);

    if (categories) state.categories = categories;
    if (products) state.products = products;
    if (settings) state.settings = settings;

    // Register customer
    if (state.telegramId) {
        const user = tg?.initDataUnsafe?.user;
        const customer = await apiPost('/api/customers/register', {
            telegram_id: parseInt(state.telegramId),
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            username: user?.username || '',
            language: state.lang,
        });
        if (customer) state.customer = customer;
    }

    showLoading(false);
}

function showLoading(show) {
    const el = document.getElementById('loading');
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
}

// ===== Language Screen =====
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const lang = btn.dataset.lang;
        state.lang = lang;
        localStorage.setItem('lang', lang);

        // Highlight selected
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        await loadData();
        updateTexts();
        showScreen('screen-type');
    });
});

// ===== Order Type Screen =====
document.getElementById('type-back').addEventListener('click', () => showScreen('screen-language'));

document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.orderType = btn.dataset.type;

        if (state.orderType === 'delivery') {
            showScreen('screen-address');
        } else {
            // Pickup - go directly to menu
            renderMenu();
            showScreen('screen-menu');
        }
    });
});

// ===== Address Screen =====
document.getElementById('address-back').addEventListener('click', () => showScreen('screen-type'));
document.getElementById('address-close').addEventListener('click', () => showScreen('screen-type'));

document.getElementById('confirm-address').addEventListener('click', () => {
    const address = document.getElementById('address-input').value.trim();
    const phone = document.getElementById('phone-input').value.trim();

    if (!address) {
        document.getElementById('address-input').style.borderColor = 'var(--danger)';
        return;
    }

    state.address = address;
    state.phone = phone;

    // Update customer address
    if (state.telegramId) {
        apiPost(`/api/customers/${state.telegramId}/address`, {
            address: state.address,
            latitude: state.latitude,
            longitude: state.longitude,
        });

        if (phone) {
            fetch(API_URL + `/api/customers/${state.telegramId}/phone`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
        }
    }

    renderMenu();
    showScreen('screen-menu');
});

// ===== Menu Screen =====
function renderMenu() {
    renderCategories();
    renderProducts();
    updateCartFloat();
    updateTopbar();
}

function renderCategories() {
    const container = document.getElementById('categories-tabs');
    container.innerHTML = '';

    // "All" tab
    const allTab = document.createElement('button');
    allTab.className = 'cat-tab' + (!state.activeCategory ? ' active' : '');
    allTab.textContent = t('all');
    allTab.addEventListener('click', () => {
        state.activeCategory = null;
        renderCategories();
        renderProducts();
    });
    container.appendChild(allTab);

    state.categories.forEach(cat => {
        const tab = document.createElement('button');
        tab.className = 'cat-tab' + (state.activeCategory === cat.id ? ' active' : '');
        tab.textContent = `${cat.icon} ${getCategoryName(cat)}`;
        tab.addEventListener('click', () => {
            state.activeCategory = cat.id;
            renderCategories();
            renderProducts();
            // Scroll tab into view
            tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
        container.appendChild(tab);
    });
}

function renderProducts(searchQuery = null) {
    const container = document.getElementById('products-area');
    container.innerHTML = '';

    let productsToShow = [...state.products];

    // Filter by search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        productsToShow = productsToShow.filter(p =>
            p.name_uz.toLowerCase().includes(q) ||
            (p.name_ru && p.name_ru.toLowerCase().includes(q)) ||
            (p.name_en && p.name_en.toLowerCase().includes(q))
        );
    }

    // Filter by category
    if (state.activeCategory) {
        productsToShow = productsToShow.filter(p => p.category_id === state.activeCategory);
    }

    if (state.activeTab === 'favorites') {
        productsToShow = productsToShow.filter(p => state.favorites.includes(p.id));
        if (productsToShow.length === 0) {
            container.innerHTML = `
        <div class="favorites-empty">
          <i class="ri-heart-line"></i>
          <p>${t('favEmpty')}</p>
        </div>
      `;
            return;
        }
    }

    if (state.activeTab === 'search') {
        // Search view
        container.innerHTML = `
      <div class="search-section">
        <div class="input-group">
          <i class="ri-search-line"></i>
          <input type="text" id="search-main-input" placeholder="${t('searchPlaceholder')}" autofocus>
        </div>
        <div id="search-results"></div>
      </div>
    `;

        const searchInput = document.getElementById('search-main-input');
        searchInput.addEventListener('input', (e) => {
            renderSearchResults(e.target.value);
        });
        return;
    }

    if (state.activeTab === 'profile') {
        renderProfile(container);
        return;
    }

    // Group by category
    if (!state.activeCategory && !searchQuery) {
        // Show popular first
        const popular = productsToShow.filter(p => p.is_popular);
        if (popular.length > 0) {
            const section = createProductSection(t('popular') + ' 🔥', popular);
            container.appendChild(section);
        }

        // Then by category
        state.categories.forEach(cat => {
            const catProducts = productsToShow.filter(p => p.category_id === cat.id);
            if (catProducts.length > 0) {
                const section = createProductSection(getCategoryName(cat), catProducts);
                container.appendChild(section);
            }
        });
    } else {
        // Show all filtered
        const title = state.activeCategory
            ? getCategoryName(state.categories.find(c => c.id === state.activeCategory))
            : t('searchResults');

        if (productsToShow.length === 0) {
            container.innerHTML = `
        <div class="favorites-empty">
          <i class="ri-search-line"></i>
          <p>${t('noResults')}</p>
        </div>
      `;
            return;
        }

        const section = createProductSection(title, productsToShow);
        container.appendChild(section);
    }
}

function createProductSection(title, products) {
    const section = document.createElement('div');
    section.className = 'category-section';

    section.innerHTML = `<h3 class="category-section-title">${title}</h3>`;

    const grid = document.createElement('div');
    grid.className = 'products-grid';

    products.forEach(product => {
        grid.appendChild(createProductCard(product));
    });

    section.appendChild(grid);
    return section;
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id;

    const isFav = state.favorites.includes(product.id);
    const hasDiscount = product.old_price > 0;
    const discountPercent = hasDiscount ? Math.round((1 - product.price / product.old_price) * 100) : 0;

    const imageHtml = product.image
        ? `<img src="${API_URL}${product.image}" alt="${getProductName(product)}" loading="lazy">`
        : `<span class="product-placeholder">🍽️</span>`;

    card.innerHTML = `
    <div class="product-card-image">
      ${imageHtml}
      <button class="product-fav-btn ${isFav ? 'active' : ''}" data-product-id="${product.id}">
        <i class="ri-heart-${isFav ? 'fill' : 'line'}"></i>
      </button>
      ${hasDiscount ? `<span class="product-discount-badge">-${discountPercent}%</span>` : ''}
    </div>
    <div class="product-card-body">
      <div class="product-card-name">${getProductName(product)}</div>
      <div class="product-card-price">
        <span class="current">${formatPrice(product.price)}</span>
        ${hasDiscount ? `<span class="old">${formatPrice(product.old_price)}</span>` : ''}
      </div>
    </div>
  `;

    // Favorite button click
    const favBtn = card.querySelector('.product-fav-btn');
    favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(product.id);
        const isNowFav = state.favorites.includes(product.id);
        favBtn.classList.toggle('active', isNowFav);
        favBtn.innerHTML = `<i class="ri-heart-${isNowFav ? 'fill' : 'line'}"></i>`;
    });

    // Card click -> product detail
    card.addEventListener('click', () => openProductDetail(product));

    return card;
}

function toggleFavorite(productId) {
    const idx = state.favorites.indexOf(productId);
    if (idx > -1) {
        state.favorites.splice(idx, 1);
    } else {
        state.favorites.push(productId);
    }
    localStorage.setItem('favorites', JSON.stringify(state.favorites));
}

function renderSearchResults(query) {
    const container = document.getElementById('search-results');
    if (!query || query.length < 2) {
        container.innerHTML = '';
        return;
    }

    const q = query.toLowerCase();
    const results = state.products.filter(p =>
        p.name_uz.toLowerCase().includes(q) ||
        (p.name_ru && p.name_ru.toLowerCase().includes(q)) ||
        (p.name_en && p.name_en.toLowerCase().includes(q)) ||
        (p.description_uz && p.description_uz.toLowerCase().includes(q))
    );

    if (results.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-light);padding:40px 0;">${t('noResults')}</p>`;
        return;
    }

    container.innerHTML = `<p class="search-results-title">${t('searchResults')} (${results.length})</p>`;
    const grid = document.createElement('div');
    grid.className = 'products-grid';
    results.forEach(p => grid.appendChild(createProductCard(p)));
    container.appendChild(grid);
}

function renderProfile(container) {
    const customer = state.customer || {};
    const initials = (customer.first_name || 'U').charAt(0).toUpperCase();

    container.innerHTML = `
    <div class="profile-section">
      <div class="profile-card">
        <div class="profile-header-info">
          <div class="profile-avatar">${initials}</div>
          <div>
            <div class="profile-name">${customer.first_name || ''} ${customer.last_name || ''}</div>
            <div class="profile-username">${customer.username ? '@' + customer.username : ''}</div>
          </div>
        </div>
        <div class="profile-stats">
          <div class="profile-stat">
            <div class="profile-stat-value">${customer.total_orders || 0}</div>
            <div class="profile-stat-label">${t('totalOrders')}</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value">${formatPrice(customer.total_spent || 0)}</div>
            <div class="profile-stat-label">${t('totalSpent')}</div>
          </div>
        </div>
      </div>
      
      <div class="profile-menu-item" id="profile-lang">
        <i class="ri-global-line"></i>
        <span>${t('changeLang')}</span>
        <i class="ri-arrow-right-s-line"></i>
      </div>
      
      <div class="profile-menu-item" id="profile-address">
        <i class="ri-map-pin-line"></i>
        <span>${t('changeAddress')}</span>
        <i class="ri-arrow-right-s-line"></i>
      </div>
      
      <div class="profile-menu-item" id="profile-support">
        <i class="ri-customer-service-line"></i>
        <span>${t('support')}</span>
        <i class="ri-arrow-right-s-line"></i>
      </div>
    </div>
  `;

    document.getElementById('profile-lang')?.addEventListener('click', () => {
        showScreen('screen-language');
    });

    document.getElementById('profile-address')?.addEventListener('click', () => {
        showScreen('screen-address');
    });

    document.getElementById('profile-support')?.addEventListener('click', () => {
        if (tg) tg.close();
    });
}

function updateTopbar() {
    const typeText = state.orderType === 'delivery' ? t('deliveryLabel') : t('pickup');
    const addressText = state.address || t('selectAddress');

    document.getElementById('topbar-type').textContent = typeText;
    document.getElementById('topbar-address').textContent = addressText;
}

// ===== Product Detail =====
function openProductDetail(product) {
    state.currentProduct = product;
    state.currentQty = 1;

    document.getElementById('product-detail-name').textContent = getProductName(product);
    document.getElementById('product-detail-desc').textContent = getProductDesc(product);
    document.getElementById('product-detail-price').textContent = formatPrice(product.price);

    const oldPriceEl = document.getElementById('product-detail-old-price');
    if (product.old_price > 0) {
        oldPriceEl.textContent = formatPrice(product.old_price);
        oldPriceEl.style.display = 'inline';
    } else {
        oldPriceEl.style.display = 'none';
    }

    // Image
    const imageContainer = document.getElementById('product-detail-image');
    if (product.image) {
        imageContainer.innerHTML = `<img src="${API_URL}${product.image}" alt="${getProductName(product)}">`;
    } else {
        imageContainer.innerHTML = `<div class="product-placeholder-icon"><i class="ri-restaurant-line"></i></div>`;
    }

    // Favorite
    const favBtn = document.getElementById('product-fav');
    const isFav = state.favorites.includes(product.id);
    favBtn.innerHTML = `<i class="ri-heart-${isFav ? 'fill' : 'line'}"></i>`;
    if (isFav) favBtn.style.color = 'var(--danger)';
    else favBtn.style.color = '';

    document.getElementById('qty-value').textContent = '1';
    document.getElementById('add-cart-text').textContent = t('addToCart');

    showScreen('screen-product');
}

document.getElementById('product-back').addEventListener('click', () => showScreen('screen-menu'));

document.getElementById('product-fav').addEventListener('click', () => {
    if (!state.currentProduct) return;
    toggleFavorite(state.currentProduct.id);
    const isFav = state.favorites.includes(state.currentProduct.id);
    const favBtn = document.getElementById('product-fav');
    favBtn.innerHTML = `<i class="ri-heart-${isFav ? 'fill' : 'line'}"></i>`;
    if (isFav) favBtn.style.color = 'var(--danger)';
    else favBtn.style.color = '';
});

document.getElementById('qty-minus').addEventListener('click', () => {
    if (state.currentQty > 1) {
        state.currentQty--;
        document.getElementById('qty-value').textContent = state.currentQty;
    }
});

document.getElementById('qty-plus').addEventListener('click', () => {
    if (state.currentQty < 99) {
        state.currentQty++;
        document.getElementById('qty-value').textContent = state.currentQty;
    }
});

document.getElementById('btn-add-cart').addEventListener('click', () => {
    if (!state.currentProduct) return;

    addToCart(state.currentProduct, state.currentQty);

    // Haptic feedback
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

    showScreen('screen-menu');
    updateCartFloat();
    renderProducts();
});

// ===== Cart Management =====
function addToCart(product, qty) {
    const existing = state.cart.find(item => item.product_id === product.id);
    if (existing) {
        existing.quantity += qty;
    } else {
        state.cart.push({
            product_id: product.id,
            product_name: product.name_uz,
            price: product.price,
            quantity: qty,
            image: product.image,
        });
    }
    updateCartFloat();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.product_id !== productId);
    updateCartFloat();
}

function updateCartItemQty(productId, delta) {
    const item = state.cart.find(i => i.product_id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        removeFromCart(productId);
    }
    updateCartFloat();
}

function getCartTotal() {
    return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartCount() {
    return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartFloat() {
    const count = getCartCount();
    const total = getCartTotal();
    const cartFloat = document.getElementById('cart-float');

    if (count > 0) {
        cartFloat.classList.remove('hidden');
        document.getElementById('cart-count').textContent = count;
        document.getElementById('cart-total').textContent = formatPrice(total);
    } else {
        cartFloat.classList.add('hidden');
    }
}

// ===== Cart Screen =====
document.getElementById('open-cart').addEventListener('click', openCart);
document.getElementById('cart-back').addEventListener('click', () => {
    showScreen('screen-menu');
    renderProducts();
});

document.getElementById('cart-clear').addEventListener('click', () => {
    state.cart = [];
    updateCartFloat();
    openCart();
});

function openCart() {
    renderCartItems();
    showScreen('screen-cart');
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    const emptyEl = document.getElementById('cart-empty');
    const summaryEl = document.getElementById('cart-summary');
    const footerEl = document.getElementById('cart-footer');

    if (state.cart.length === 0) {
        container.innerHTML = '';
        emptyEl.classList.remove('hidden');
        summaryEl.style.display = 'none';
        footerEl.style.display = 'none';
        document.getElementById('cart-empty-text').textContent = t('emptyCart');
        return;
    }

    emptyEl.classList.add('hidden');
    summaryEl.style.display = 'block';
    footerEl.style.display = 'flex';
    container.innerHTML = '';

    state.cart.forEach(item => {
        const el = document.createElement('div');
        el.className = 'cart-item';

        const imageHtml = item.image
            ? `<img src="${API_URL}${item.image}" alt="">`
            : `<span class="cart-item-placeholder">🍽️</span>`;

        el.innerHTML = `
      <div class="cart-item-image">${imageHtml}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.product_name}</div>
        <div class="cart-item-price">${formatPrice(item.price * item.quantity)}</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn cart-qty-minus" data-id="${item.product_id}"><i class="ri-subtract-line"></i></button>
        <span class="qty-value">${item.quantity}</span>
        <button class="qty-btn cart-qty-plus" data-id="${item.product_id}"><i class="ri-add-line"></i></button>
      </div>
    `;

        container.appendChild(el);
    });

    // Event listeners for quantity buttons
    container.querySelectorAll('.cart-qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            updateCartItemQty(parseInt(btn.dataset.id), -1);
            renderCartItems();
        });
    });

    container.querySelectorAll('.cart-qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            updateCartItemQty(parseInt(btn.dataset.id), 1);
            renderCartItems();
        });
    });

    // Update summary
    const subtotal = getCartTotal();
    const deliveryFee = state.orderType === 'delivery'
        ? (state.settings.delivery_price || 15000)
        : 0;
    const total = subtotal + deliveryFee;

    document.getElementById('subtotal-label').textContent = t('products');
    document.getElementById('cart-subtotal').textContent = formatPrice(subtotal);
    document.getElementById('delivery-label').textContent = t('deliveryFee');
    document.getElementById('cart-delivery-fee').textContent = deliveryFee > 0 ? formatPrice(deliveryFee) : t('free');
    document.getElementById('total-label').textContent = t('total');
    document.getElementById('cart-total-amount').textContent = formatPrice(total);

    // Delivery row visibility
    const deliveryRow = document.getElementById('delivery-row');
    deliveryRow.style.display = state.orderType === 'delivery' ? 'flex' : 'none';

    // Checkout button
    document.getElementById('checkout-text').textContent = t('checkout');
    document.getElementById('checkout-total').textContent = formatPrice(total);
    document.getElementById('order-comment').placeholder = t('comment');

    // Update cart title
    document.getElementById('cart-title').textContent = t('cart');
}

// ===== Checkout =====
document.getElementById('btn-checkout').addEventListener('click', placeOrder);

async function placeOrder() {
    if (state.cart.length === 0) return;

    showLoading(true);

    const subtotal = getCartTotal();
    const deliveryFee = state.orderType === 'delivery'
        ? (state.settings.delivery_price || 15000)
        : 0;
    const total = subtotal + deliveryFee;
    const comment = document.getElementById('order-comment').value.trim();

    const orderData = {
        customer_id: state.customer?.id || 1,
        type: state.orderType,
        address: state.address,
        latitude: state.latitude,
        longitude: state.longitude,
        phone: state.phone || state.customer?.phone || '',
        comment: comment,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        total: total,
        payment_method: 'cash',
        items: state.cart.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
        })),
    };

    const result = await apiPost('/api/orders', orderData);

    showLoading(false);

    if (result && result.order_number) {
        // Success
        state.cart = [];
        updateCartFloat();

        document.getElementById('success-title').textContent = t('orderSuccess');
        document.getElementById('success-order-number').textContent = `#${result.order_number}`;
        document.getElementById('success-desc').textContent = t('orderSuccessDesc');
        document.getElementById('success-btn-text').textContent = t('backToHome');

        showScreen('screen-success');

        // Send data back to Telegram
        if (tg) {
            try {
                tg.sendData(JSON.stringify({
                    type: 'order',
                    order_number: result.order_number,
                    total: total,
                }));
            } catch (e) { }
        }

        // Haptic
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } else {
        alert('Xatolik yuz berdi. Qayta urinib ko\'ring.');
    }
}

document.getElementById('success-back').addEventListener('click', () => {
    renderMenu();
    showScreen('screen-menu');
});

// ===== Bottom Navigation =====
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        state.activeTab = tab;
        state.activeCategory = null;

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show/hide categories tabs
        const catTabs = document.getElementById('categories-tabs');
        if (tab === 'menu') {
            catTabs.style.display = 'flex';
            renderCategories();
        } else {
            catTabs.style.display = 'none';
        }

        renderProducts();
    });
});

// ===== Search =====
document.getElementById('btn-search').addEventListener('click', () => {
    const searchBar = document.getElementById('search-bar');
    searchBar.classList.toggle('hidden');
    if (!searchBar.classList.contains('hidden')) {
        document.getElementById('search-input').focus();
    }
});

document.getElementById('search-close').addEventListener('click', () => {
    document.getElementById('search-bar').classList.add('hidden');
    document.getElementById('search-input').value = '';
    state.activeCategory = null;
    renderProducts();
});

document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length >= 2) {
        renderProducts(query);
    } else {
        renderProducts();
    }
});

// Language button
document.getElementById('btn-lang').addEventListener('click', () => {
    showScreen('screen-language');
});

// Delivery badge click
document.getElementById('delivery-badge').addEventListener('click', () => {
    showScreen('screen-address');
});

// ===== Update Texts =====
function updateTexts() {
    document.getElementById('type-title').textContent = t('orderType');
    document.getElementById('type-delivery-text').textContent = t('delivery');
    document.getElementById('type-delivery-desc').textContent = t('deliveryDesc');
    document.getElementById('type-pickup-text').textContent = t('pickup');
    document.getElementById('type-pickup-desc').textContent = t('pickupDesc');
    document.getElementById('address-title').textContent = t('enterAddress');
    document.getElementById('address-input').placeholder = t('addressPlaceholder');
    document.getElementById('phone-input').placeholder = t('phonePlaceholder');
    document.getElementById('confirm-address-text').textContent = t('confirmAddress');
    document.getElementById('nav-menu-text').textContent = t('menu');
    document.getElementById('nav-search-text').textContent = t('search');
    document.getElementById('nav-fav-text').textContent = t('favorites');
    document.getElementById('nav-profile-text').textContent = t('profile');
    document.getElementById('cart-float-text').textContent = t('cart');
    document.getElementById('search-input').placeholder = t('searchPlaceholder');
}

// ===== Init =====
(async function init() {
    // Check saved language
    const savedLang = localStorage.getItem('lang');
    if (savedLang) {
        state.lang = savedLang;
    }

    // Pre-fill from Telegram user
    if (tg?.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        if (user.language_code === 'ru') state.lang = 'ru';
        else if (user.language_code === 'en') state.lang = 'en';
    }

    // Set theme based on Telegram
    if (tg?.colorScheme === 'dark') {
        document.documentElement.style.setProperty('--bg', '#1A1A2E');
        document.documentElement.style.setProperty('--bg-card', '#222240');
        document.documentElement.style.setProperty('--bg-input', '#2A2A48');
        document.documentElement.style.setProperty('--text-primary', '#F0F0FF');
        document.documentElement.style.setProperty('--text-secondary', '#9999BB');
        document.documentElement.style.setProperty('--text-light', '#666688');
        document.documentElement.style.setProperty('--border', '#333355');
        document.documentElement.style.setProperty('--border-light', '#2A2A48');
    }
})();
