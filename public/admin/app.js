// Express Delivery Admin Panel Logic
const API_URL = '/api';
const ADMIN_API = '/api/admin';
let authToken = localStorage.getItem('admin_token');

// Utility Functions
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const formatPrice = (price) => new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showDashboard();
    } else {
        showLogin();
    }
});

// Navigation Logic
$$('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = item.getAttribute('data-page');
        navigateTo(pageId);
    });
});

function navigateTo(pageId) {
    $$('.nav-item').forEach(nav => nav.classList.remove('active'));
    $(`.nav-item[data-page="${pageId}"]`)?.classList.add('active');

    $$('.page').forEach(page => page.classList.remove('active'));
    $(`#page-${pageId}`).classList.add('active');
    $('#page-title').textContent = pageId.charAt(0).toUpperCase() + pageId.slice(1);

    // Refresh Data based on page
    if (pageId === 'dashboard') loadDashboardStats();
    if (pageId === 'orders') loadOrders();
    if (pageId === 'products') loadProducts();
    if (pageId === 'categories') loadCategories();
    if (pageId === 'customers') loadCustomers();
    if (pageId === 'settings') loadSettings();
}

// Authentication
$('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#username').value;
    const password = $('#password').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
            authToken = data.token;
            localStorage.setItem('admin_token', authToken);
            showDashboard();
        } else {
            showError(data.error);
        }
    } catch (err) {
        showError('Server xatosi');
    }
});

$('#logout-btn').addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    authToken = null;
    showLogin();
});

function showLogin() {
    $('#login-screen').classList.remove('hidden');
    $('#dashboard-layout').classList.add('hidden');
}

function showDashboard() {
    $('#login-screen').classList.add('hidden');
    $('#dashboard-layout').classList.remove('hidden');
    loadDashboardStats();
    // Start polling for new orders
    setInterval(checkNewOrders, 10000);
}

function showError(msg) {
    const errorEl = $('#login-error');
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
}

// API Wrapper
async function api(endpoint, method = 'GET', body = null) {
    const headers = { 'Authorization': `Bearer ${authToken}` };
    if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const options = { method, headers };
    if (body) options.body = (body instanceof FormData) ? body : JSON.stringify(body);

    try {
        const res = await fetch(endpoint, options);
        if (res.status === 401) {
            showLogin(); // Token expired
            return null;
        }
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        return null;
    }
}

// Dashboard Logic
async function loadDashboardStats() {
    const stats = await api(`${ADMIN_API}/stats`);
    if (stats) {
        $('#stat-today-orders').textContent = stats.todayOrders;
        $('#stat-today-revenue').textContent = formatPrice(stats.todayRevenue);
        $('#stat-total-customers').textContent = stats.totalCustomers;
        $('#stat-total-products').textContent = stats.totalProducts || '-';

        const badge = $('#new-orders-badge');
        badge.textContent = stats.newOrders;
        badge.classList.toggle('hidden', stats.newOrders === 0);

        // Load recent orders table
        const orders = await api(`${ADMIN_API}/orders?limit=5`);
        const tbody = $('#dashboard-orders-table');
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.order_number}</td>
                <td>${order.first_name} ${order.last_name || ''}</td>
                <td>${formatPrice(order.total)}</td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td>${formatDate(order.created_at)}</td>
            </tr>
        `).join('');
    }
}

async function checkNewOrders() {
    const stats = await api(`${ADMIN_API}/stats`);
    if (stats && stats.newOrders > 0) {
        const badge = $('#new-orders-badge');
        badge.textContent = stats.newOrders;
        badge.classList.remove('hidden');
        // Optional: Play sound or show toast
    }
}

// Orders Logic
// Orders Logic
async function updateOrderCounts() {
    try {
        const orders = await api(`${ADMIN_API}/orders?limit=1000`);
        if (!orders) return;

        const counts = {
            all: orders.length,
            new: 0,
            confirmed: 0,
            preparing: 0,
            delivering: 0,
            completed: 0
        };

        orders.forEach(o => {
            if (counts[o.status] !== undefined) {
                counts[o.status]++;
            }
        });

        // Update badges
        for (const [key, value] of Object.entries(counts)) {
            const btn = $(`.filter-btn[data-status="${key}"]`);
            if (btn) {
                const badge = btn.querySelector('.badge-count');
                if (badge) {
                    badge.textContent = value;
                    if (value > 0) {
                        badge.classList.add('positive');
                    } else {
                        badge.classList.remove('positive');
                    }
                }
            }
        }
    } catch (err) {
        console.error("Failed to update order counts:", err);
    }
}

async function loadOrders(status = 'all') {
    updateOrderCounts(); // Update counts whenever we load orders

    let url = `${ADMIN_API}/orders`;
    if (status !== 'all') url += `?status=${status}`;

    const orders = await api(url);
    const container = $('#orders-kanban');

    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-state">Buyurtmalar topilmadi</div>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card" onclick="openOrderModal(${order.id})">
            <div class="order-header">
                <span class="order-id">#${order.order_number}</span>
                <span class="status-badge status-${order.status}">${order.status}</span>
            </div>
            <div class="order-customer">
                <h4>${order.first_name} ${order.last_name || ''}</h4>
                <p>📞 ${order.phone || order.customer_phone || '-'}</p>
                <p>📍 ${order.type === 'delivery' ? 'Yetkazib berish' : 'Olib ketish'}</p>
            </div>
            <div class="order-footer">
                <span class="order-time">${formatDate(order.created_at)}</span>
                <span class="order-total">${formatPrice(order.total)}</span>
            </div>
        </div>
    `).join('');
}

// Filter buttons
$$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadOrders(btn.dataset.status);
    });
});

async function openOrderModal(orderId) {
    const order = await api(`${ADMIN_API}/orders/${orderId}`);
    if (!order) return;

    $('#modal-order-id').textContent = order.order_number;
    const body = $('#order-modal-body');
    const footer = $('#order-modal-footer');

    let itemsHtml = order.items.map(item => `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:8px;">
            <div>
                <strong>${item.product_name}</strong> <br>
                <small>${formatPrice(item.price)} x ${item.quantity}</small>
            </div>
            <strong>${formatPrice(item.total)}</strong>
        </div>
    `).join('');

    body.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
            <div>
                <h4 style="color:gray; margin-bottom:8px;">Mijoz</h4>
                <p><strong>${order.first_name} ${order.last_name || ''}</strong></p>
                <p>${order.phone || order.customer_phone || '-'}</p>
            </div>
            <div>
                 <h4 style="color:gray; margin-bottom:8px;">Manzil</h4>
                 <p>${order.address || 'Manzil kiritilmagan'}</p>
                 ${order.latitude ? `<a href="https://maps.google.com/?q=${order.latitude},${order.longitude}" target="_blank" style="color:#FF6B35; font-size:12px;">Xaritada ochish ↗️</a>` : ''}
            </div>
        </div>
        <div style="background:#f9f9f9; padding:15px; border-radius:8px;">
            <h4 style="margin-bottom:10px;">Mahsulotlar</h4>
            ${itemsHtml}
            <div style="display:flex; justify-content:space-between; margin-top:10px; font-size:16px;">
                <strong>Jami:</strong>
                <strong style="color:#FF6B35;">${formatPrice(order.total)}</strong>
            </div>
        </div>
        ${order.comment ? `<p style="margin-top:10px; background:#fff3cd; padding:10px; border-radius:4px;">💬 Izoh: ${order.comment}</p>` : ''}
    `;

    // Status Buttons
    let buttons = '';
    if (order.status === 'new') {
        buttons = `
            <button class="btn-secondary" onclick="updateStatus(${order.id}, 'cancelled')">Bekor qilish</button>
            <button class="btn-primary" onclick="updateStatus(${order.id}, 'confirmed')">Qabul qilish</button>
        `;
    } else if (order.status === 'confirmed') {
        buttons = `<button class="btn-primary" onclick="updateStatus(${order.id}, 'preparing')">Tayyorlashni boshlash</button>`;
    } else if (order.status === 'preparing') {
        buttons = `<button class="btn-primary" onclick="updateStatus(${order.id}, 'delivering')">Yetkazishga berish</button>`;
    } else if (order.status === 'delivering') {
        buttons = `<button class="btn-primary" onclick="updateStatus(${order.id}, 'completed')">Muvaffaqiyatli tugatish</button>`;
    }

    footer.innerHTML = buttons;
    $('#order-modal').classList.remove('hidden');
}

window.updateStatus = async (id, status) => {
    await api(`${ADMIN_API}/orders/${id}/status`, 'PUT', { status });
    closeModal('order-modal');
    loadOrders($('.filter-btn.active').dataset.status);
    loadDashboardStats();
};

// Products Logic
async function loadProducts() {
    const products = await api(`${ADMIN_API}/products`);
    const tbody = $('#products-table');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.image || 'https://via.placeholder.com/40'}" alt=""></td>
            <td>${p.name_uz}</td>
            <td>${p.category_name}</td>
            <td>${formatPrice(p.price)}</td>
            <td><span class="badge" style="background:${p.is_active ? '#10B981' : '#EF4444'}">${p.is_active ? 'Faol' : 'Nofaol'}</span></td>
            <td>
                <div class="product-actions">
                    <button class="btn-edit" onclick="editProduct(${p.id})"><i class="fi fi-rr-pencil"></i></button>
                    <button class="btn-delete" onclick="deleteProduct(${p.id})"><i class="fi fi-rr-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadCategoriesForSelect() {
    const categories = await api(`${ADMIN_API}/categories`);
    const select = $('#product-category');
    select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name_uz}</option>`).join('');
}

window.openProductModal = async (productId = null) => {
    await loadCategoriesForSelect();
    const modal = $('#product-modal');
    const form = $('#product-form');

    if (productId) {
        // Edit mode
        $('#product-modal-title').textContent = "Mahsulotni Tahrirlash";
        // Fetch product details logic here if needed (or pass object)
    } else {
        form.reset();
        $('#product-id').value = '';
        $('#image-preview').classList.add('hidden');
    }
    modal.classList.remove('hidden');
};

$('#product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    const id = $('#product-id').value;

    formData.append('name_uz', $('#product-name-uz').value);
    formData.append('category_id', $('#product-category').value);
    formData.append('price', $('#product-price').value);
    formData.append('is_active', true);

    const file = $('#product-image').files[0];
    if (file) formData.append('image', file);

    const url = id ? `${ADMIN_API}/products/${id}` : `${ADMIN_API}/products`;
    const method = id ? 'PUT' : 'POST';

    await api(url, method, formData);
    closeModal('product-modal');
    loadProducts();
});

window.deleteProduct = async (id) => {
    if (confirm('O\'chirilsinmi?')) {
        await api(`${ADMIN_API}/products/${id}`, 'DELETE');
        loadProducts();
    }
};

// Categories Logic
async function loadCategories() {
    const categories = await api(`${ADMIN_API}/categories`);
    $('#categories-list').innerHTML = categories.map(c => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:15px; margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:24px;">
                    ${c.icon.includes('/') ? `<img src="${c.icon}" width="40" height="40" alt="${c.name_uz}" style="object-fit: contain;">` : `<i class="${c.icon}"></i>`}
                </span>
                <strong>${c.name_uz}</strong>
            </div>
            <div class="product-actions">
                <button class="btn-edit" onclick="editCategory(${c.id})"><i class="fi fi-rr-pencil"></i></button>
                <button class="btn-delete" onclick="deleteCategory(${c.id})"><i class="fi fi-rr-trash"></i></button>
            </div>
        </div>
    `).join('');
}

window.openCategoryModal = () => {
    $('#category-form').reset();
    $('#category-id').value = '';
    $('#category-icon').value = 'fi fi-rr-box-alt';
    $('#category-icon-preview').innerHTML = `<i class="fi fi-rr-box-alt"></i>`;
    $('#category-modal').classList.remove('hidden');
    $('#category-modal-title').textContent = "Kategoriya Qo'shish";
};

window.openIconPicker = async () => {
    $('#icon-picker-modal').classList.remove('hidden');
    const container = $('#icons-grid');
    container.innerHTML = '<p>Yuklanmoqda...</p>';

    try {
        const icons = await api(`${ADMIN_API}/icons`);
        container.innerHTML = '';

        // Add default Flaticon classes option (text input fallback or just common ones)
        // For now, let's just show the downloaded images

        icons.forEach(iconPath => {
            const div = document.createElement('div');
            div.style.cursor = 'pointer';
            div.style.border = '1px solid #eee';
            div.style.borderRadius = '8px';
            div.style.padding = '5px';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'center';
            div.style.height = '60px';

            div.innerHTML = `<img src="${iconPath}" style="max-width:100%; max-height:100%; object-fit:contain;">`;

            div.onclick = () => selectIcon(iconPath);
            container.appendChild(div);
        });
    } catch (err) {
        container.innerHTML = '<p>Xatolik yuz berdi</p>';
    }
};

window.selectIcon = (iconPath) => {
    $('#category-icon').value = iconPath;
    $('#category-icon-preview').innerHTML = `<img src="${iconPath}" style="width:100%; height:100%; object-fit:contain;">`;
    closeModal('icon-picker-modal');
};

$('#category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        name_uz: $('#category-name-uz').value,
        icon: $('#category-icon').value || 'fi fi-rr-box-alt',
        sort_order: $('#category-sort').value
    };

    // Check if ID exists for update
    const id = $('#category-id').value;
    const url = id ? `${ADMIN_API}/categories/${id}` : `${ADMIN_API}/categories`;
    const method = id ? 'PUT' : 'POST';

    await api(url, method, data);
    closeModal('category-modal');
    loadCategories();
});

window.editCategory = async (id) => {
    // We need to fetch the category or find it in the list
    // Since we don't store the full list in a variable in this snippet, let's fetch it or assume it's refetched
    // For simplicity, let's just fetch all again or find from DOM if possible. 
    // Better: GET /categories/:id
    // But since we don't have that endpoint in server.js (we have /api/admin/categories but it returns all), 
    // let's just iterate over the currently loaded categories if we can. 
    // Wait, server.js has `getCategoryById` but the API endpoint `GET /api/admin/categories` returns all. 
    // Let's just quick fetch list and find.

    const categories = await api(`${ADMIN_API}/categories`);
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    $('#category-id').value = cat.id;
    $('#category-name-uz').value = cat.name_uz;
    $('#category-icon').value = cat.icon;
    $('#category-sort').value = cat.sort_order;

    if (cat.icon.includes('/')) {
        $('#category-icon-preview').innerHTML = `<img src="${cat.icon}" style="width:100%; height:100%; object-fit:contain;">`;
    } else {
        $('#category-icon-preview').innerHTML = `<i class="${cat.icon}"></i>`;
    }

    $('#category-modal-title').textContent = "Kategoriya Tahrirlash";
    $('#category-modal').classList.remove('hidden');
};

window.deleteCategory = async (id) => {
    if (confirm('Kategoriya va uning mahsulotlari o\'chiriladi. Rozimisiz?')) {
        await api(`${ADMIN_API}/categories/${id}`, 'DELETE');
        loadCategories();
    }
};

// Customers Logic
async function loadCustomers() {
    const customers = await api(`${ADMIN_API}/customers`);
    $('#customers-table').innerHTML = customers.map(c => `
        <tr>
            <td>${c.first_name || ''} ${c.last_name || ''}</td>
            <td>${c.phone || '-'}</td>
            <td>${c.username ? '@' + c.username : '-'}</td>
            <td>${c.total_orders}</td>
            <td>${formatDate(c.created_at)}</td>
        </tr>
    `).join('');
}

// Settings Logic
async function loadSettings() {
    const settings = await api(`${ADMIN_API}/settings`);
    const form = $('#settings-form');
    if (settings) {
        form.elements['shop_name'].value = settings.shop_name;
        form.elements['shop_phone'].value = settings.shop_phone;
        form.elements['delivery_price'].value = settings.delivery_price;
        form.elements['min_order'].value = settings.min_order;
        form.elements['admin_chat_id'].value = settings.admin_chat_id;
        form.elements['is_open'].checked = settings.is_open === '1';
    }
}

$('#settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.is_open = data.is_open === 'on' ? '1' : '0';

    await api(`${ADMIN_API}/settings`, 'PUT', data);
    alert('Sozlamalar saqlandi');
});

// Modal Utilities
window.closeModal = (id) => {
    $(`#${id}`).classList.add('hidden');
};

// Closing modal on outside click
$$('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
});
