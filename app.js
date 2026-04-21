/* =====================
   FAKE STORE APP
   ===================== */
const API = 'https://fakestoreapi.com';

const CATEGORY_META = {
  "electronics":        { emoji: '💻', label: 'Electrónica' },
  "jewelery":           { emoji: '💎', label: 'Joyería' },
  "men's clothing":     { emoji: '👔', label: 'Ropa Hombre' },
  "women's clothing":   { emoji: '👗', label: 'Ropa Mujer' },
};

/* ---- State ---- */
const state = {
  products: [],
  categories: [],
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  wishlist: JSON.parse(localStorage.getItem('wishlist') || '[]'),
  currentPage: 'home',
  activeCategory: 'all',
  searchQuery: '',
  sortBy: 'default',
  priceMin: 0,
  priceMax: 1000,
  viewMode: 'grid',
  productDetailId: null,
};

/* ---- DOM Refs ---- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ---- API ---- */
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadData() {
  const [products, categories] = await Promise.all([
    fetchJSON(`${API}/products`),
    fetchJSON(`${API}/products/categories`),
  ]);
  state.products = products;
  state.categories = categories;
  renderAll();
}

/* ---- ROUTER ---- */
function navigate(page, data = {}) {
  if (state.currentPage === page && !data.force) return;

  $$('.page').forEach(p => p.classList.remove('active'));
  $(`#page-${page}`)?.classList.add('active');

  $$('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });

  state.currentPage = page;
  if (data.category) state.activeCategory = data.category;
  if (data.productId) state.productDetailId = data.productId;

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'products') renderProductsPage();
  if (page === 'categories') renderCategoriesPage();
  if (page === 'product-detail') renderProductDetail();
}

/* ---- RENDER ALL ---- */
function renderAll() {
  renderHomeCategories();
  renderFeaturedProducts();
  renderSidebarCategories();
  renderProductsPage();
  renderCategoriesPage();
  updateCartUI();
}

/* ---- HOME ---- */
function renderHomeCategories() {
  const container = $('#home-categories');
  if (!container) return;
  container.innerHTML = state.categories.map(cat => {
    const meta = CATEGORY_META[cat] || { emoji: '🛍️', label: cat };
    const count = state.products.filter(p => p.category === cat).length;
    return `<div class="category-card" data-cat="${cat}" role="button" tabindex="0">
      <div class="category-emoji">${meta.emoji}</div>
      <h3>${meta.label || cat}</h3>
      <p>${count} productos</p>
    </div>`;
  }).join('');

  container.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => navigate('products', { category: card.dataset.cat }));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') card.click(); });
  });
}

function renderFeaturedProducts() {
  const container = $('#featured-products');
  if (!container) return;
  const featured = [...state.products]
    .sort((a, b) => b.rating.rate - a.rating.rate)
    .slice(0, 8);
  container.innerHTML = featured.map(p => productCardHTML(p)).join('');
  attachProductCardEvents(container);
}

/* ---- SIDEBAR ---- */
function renderSidebarCategories() {
  const list = $('#sidebar-categories');
  if (!list) return;
  const cats = state.categories.map(cat => {
    const meta = CATEGORY_META[cat] || { emoji: '🛍️', label: cat };
    return `<li><button class="category-btn" data-cat="${cat}">${meta.emoji} ${meta.label || cat}</button></li>`;
  }).join('');
  list.innerHTML = `<li><button class="category-btn active" data-cat="all">🏪 Todas</button></li>${cats}`;

  list.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.cat;
      $$('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderFilteredProducts();
    });
  });
}

/* ---- PRODUCTS PAGE ---- */
function renderProductsPage() {
  if (state.currentPage !== 'products') return;

  if (state.activeCategory !== 'all') {
    $$('.category-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === state.activeCategory);
    });
  }

  renderFilteredProducts();
}

function getFilteredProducts() {
  let list = [...state.products];

  if (state.activeCategory !== 'all') {
    list = list.filter(p => p.category === state.activeCategory);
  }
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }
  list = list.filter(p => p.price >= state.priceMin && p.price <= state.priceMax);

  switch (state.sortBy) {
    case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
    case 'price-desc': list.sort((a, b) => b.price - a.price); break;
    case 'rating':     list.sort((a, b) => b.rating.rate - a.rating.rate); break;
    case 'name':       list.sort((a, b) => a.title.localeCompare(b.title)); break;
  }

  return list;
}

function renderFilteredProducts() {
  const container = $('#all-products');
  const noResults = $('#no-results');
  const countEl = $('#filtered-count');
  if (!container) return;

  const list = getFilteredProducts();

  if (countEl) countEl.textContent = `${list.length} producto${list.length !== 1 ? 's' : ''}`;

  container.className = `products-grid${state.viewMode === 'list' ? ' list-mode' : ''}`;

  if (list.length === 0) {
    container.innerHTML = '';
    noResults?.classList.remove('hidden');
  } else {
    noResults?.classList.add('hidden');
    container.innerHTML = list.map(p => productCardHTML(p)).join('');
    attachProductCardEvents(container);
  }
}

/* ---- CATEGORIES PAGE ---- */
function renderCategoriesPage() {
  const container = $('#categories-detail');
  if (!container) return;

  container.innerHTML = state.categories.map(cat => {
    const meta = CATEGORY_META[cat] || { emoji: '🛍️', label: cat };
    const catProducts = state.products.filter(p => p.category === cat);
    const previews = catProducts.slice(0, 3).map(p =>
      `<img class="category-preview-img" src="${p.image}" alt="${p.title}" loading="lazy" />`
    ).join('');
    const avgPrice = catProducts.reduce((s, p) => s + p.price, 0) / catProducts.length;

    return `
      <div class="category-detail-card" data-cat="${cat}" role="button" tabindex="0">
        <div class="category-detail-header">
          <div class="category-detail-emoji">${meta.emoji}</div>
          <div class="category-detail-info">
            <h3>${meta.label || cat}</h3>
            <p>${catProducts.length} productos disponibles</p>
          </div>
        </div>
        <div class="category-detail-products">${previews}</div>
        <div class="category-detail-footer">
          <span>Desde $${Math.min(...catProducts.map(p => p.price)).toFixed(2)}</span>
          <span>Precio medio: $${avgPrice.toFixed(2)}</span>
          <button class="btn btn-outline" style="padding:.4rem .9rem;font-size:.8rem;">Ver todos</button>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.category-detail-card').forEach(card => {
    card.addEventListener('click', () => navigate('products', { category: card.dataset.cat }));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') card.click(); });
  });
}

/* ---- PRODUCT DETAIL ---- */
function renderProductDetail() {
  const product = state.products.find(p => p.id === state.productDetailId);
  const container = $('#product-detail-content');
  if (!product || !container) return;

  const meta = CATEGORY_META[product.category] || { emoji: '🛍️', label: product.category };
  const stars = renderStars(product.rating.rate);
  const inWishlist = state.wishlist.includes(product.id);

  container.innerHTML = `
    <div class="product-detail">
      <div class="product-detail-img-wrap">
        <img class="product-detail-img" src="${product.image}" alt="${product.title}" />
      </div>
      <div class="product-detail-info">
        <p class="product-detail-category">${meta.emoji} ${meta.label || product.category}</p>
        <h1 class="product-detail-title">${product.title}</h1>
        <div class="product-detail-rating">
          <span class="stars">${stars}</span>
          <span>${product.rating.rate.toFixed(1)} / 5</span>
          <span class="rating-count">(${product.rating.count} valoraciones)</span>
        </div>
        <div class="product-detail-price-wrap">
          <span class="product-detail-price">$${product.price.toFixed(2)}</span>
          <span class="product-detail-badge">En Stock</span>
        </div>
        <p class="product-detail-desc">${product.description}</p>
        <div class="quantity-selector">
          <label>Cantidad:</label>
          <div class="qty-controls">
            <button class="qty-btn" id="qty-minus">-</button>
            <input type="number" id="qty-input" value="1" min="1" max="99" />
            <button class="qty-btn" id="qty-plus">+</button>
          </div>
        </div>
        <div class="product-detail-actions">
          <button class="btn btn-primary" id="detail-add-cart">🛒 Añadir al Carrito</button>
          <button class="btn btn-outline" id="detail-wishlist" style="${inWishlist ? 'color:var(--danger);border-color:var(--danger)' : ''}">
            ${inWishlist ? '❤️ En Wishlist' : '🤍 Wishlist'}
          </button>
        </div>
      </div>
    </div>`;

  const qtyInput = $('#qty-input');
  $('#qty-minus').addEventListener('click', () => {
    if (qtyInput.value > 1) qtyInput.value = parseInt(qtyInput.value) - 1;
  });
  $('#qty-plus').addEventListener('click', () => {
    if (qtyInput.value < 99) qtyInput.value = parseInt(qtyInput.value) + 1;
  });

  $('#detail-add-cart').addEventListener('click', () => {
    addToCart(product, parseInt(qtyInput.value));
  });

  $('#detail-wishlist').addEventListener('click', () => {
    toggleWishlist(product.id);
    renderProductDetail();
  });
}

/* ---- PRODUCT CARD HTML ---- */
function productCardHTML(product) {
  const stars = renderStars(product.rating.rate);
  const meta = CATEGORY_META[product.category] || { emoji: '🛍️' };
  const inWishlist = state.wishlist.includes(product.id);
  const oldPrice = (product.price * 1.2).toFixed(2);

  return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-img-wrap">
        <img class="product-img" src="${product.image}" alt="${product.title}" loading="lazy" />
        <span class="product-badge">${meta.emoji}</span>
        <button class="product-wishlist-btn${inWishlist ? ' active' : ''}" data-wish="${product.id}" aria-label="Wishlist">
          ${inWishlist ? '❤️' : '🤍'}
        </button>
      </div>
      <div class="product-body">
        <p class="product-category">${product.category}</p>
        <h3 class="product-title" data-id="${product.id}">${product.title}</h3>
        <div class="product-rating">
          <span class="stars">${stars}</span>
          <span class="rating-count">(${product.rating.count})</span>
        </div>
        <div class="product-footer">
          <div>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <div class="product-price-old">$${oldPrice}</div>
          </div>
          <button class="add-to-cart-btn" data-id="${product.id}">
            + Añadir
          </button>
        </div>
      </div>
    </div>`;
}

function attachProductCardEvents(container) {
  container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const product = state.products.find(p => p.id === parseInt(btn.dataset.id));
      if (product) addToCart(product);
    });
  });

  container.querySelectorAll('.product-title').forEach(title => {
    title.addEventListener('click', () => {
      navigate('product-detail', { productId: parseInt(title.dataset.id), force: true });
    });
  });

  container.querySelectorAll('.product-img-wrap').forEach(wrap => {
    const card = wrap.closest('.product-card');
    wrap.addEventListener('click', () => {
      navigate('product-detail', { productId: parseInt(card.dataset.id), force: true });
    });
    wrap.style.cursor = 'pointer';
  });

  container.querySelectorAll('.product-wishlist-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleWishlist(parseInt(btn.dataset.wish));
      btn.textContent = state.wishlist.includes(parseInt(btn.dataset.wish)) ? '❤️' : '🤍';
      btn.classList.toggle('active', state.wishlist.includes(parseInt(btn.dataset.wish)));
    });
  });
}

/* ---- STARS ---- */
function renderStars(rate) {
  const full = Math.floor(rate);
  const half = rate % 1 >= 0.5;
  let s = '★'.repeat(full);
  if (half) s += '½';
  s += '☆'.repeat(5 - full - (half ? 1 : 0));
  return s;
}

/* ---- CART ---- */
function addToCart(product, qty = 1) {
  const existing = state.cart.find(item => item.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({ id: product.id, qty, title: product.title, price: product.price, image: product.image });
  }
  saveCart();
  updateCartUI();
  showToast(`✅ "${product.title.slice(0, 30)}..." añadido al carrito`, 'success');
}

function removeFromCart(id) {
  state.cart = state.cart.filter(item => item.id !== id);
  saveCart();
  updateCartUI();
}

function updateCartQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else {
    saveCart();
    updateCartUI();
  }
}

function clearCart() {
  state.cart = [];
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
}

function updateCartUI() {
  const totalItems = state.cart.reduce((s, i) => s + i.qty, 0);
  const countEl = $('#cart-count');
  if (countEl) {
    countEl.textContent = totalItems > 0 ? totalItems : '';
  }

  const itemsEl = $('#cart-items');
  const emptyEl = $('#cart-empty');
  const footerEl = $('#cart-footer');
  if (!itemsEl) return;

  if (state.cart.length === 0) {
    emptyEl.style.display = 'flex';
    footerEl.style.display = 'none';
    itemsEl.innerHTML = '';
    itemsEl.appendChild(emptyEl);
    return;
  }

  emptyEl.style.display = 'none';
  footerEl.style.display = 'block';

  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= 50 ? 'Gratis' : '$4.99';
  const total = subtotal + (subtotal < 50 ? 4.99 : 0);

  $('#cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  $('#cart-shipping').textContent = shipping;
  $('#cart-total').textContent = `$${total.toFixed(2)}`;

  itemsEl.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img-wrap">
        <img class="cart-item-img" src="${item.image}" alt="${item.title}" loading="lazy" />
      </div>
      <div class="cart-item-info">
        <p class="cart-item-title">${item.title}</p>
        <p class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</p>
        <div class="cart-item-controls">
          <button class="cart-qty-btn" data-action="dec" data-id="${item.id}">-</button>
          <span class="cart-qty">${item.qty}</span>
          <button class="cart-qty-btn" data-action="inc" data-id="${item.id}">+</button>
        </div>
      </div>
      <button class="cart-item-remove" data-id="${item.id}" aria-label="Eliminar">🗑️</button>
    </div>`).join('');

  itemsEl.querySelectorAll('.cart-qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateCartQty(parseInt(btn.dataset.id), btn.dataset.action === 'inc' ? 1 : -1);
    });
  });
  itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
  });
}

function openCart() {
  $('#cart-sidebar').classList.add('open');
  $('#cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  $('#cart-sidebar').classList.remove('open');
  $('#cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ---- WISHLIST ---- */
function toggleWishlist(id) {
  const idx = state.wishlist.indexOf(id);
  if (idx === -1) {
    state.wishlist.push(id);
    showToast('❤️ Añadido a tu wishlist', 'success');
  } else {
    state.wishlist.splice(idx, 1);
    showToast('🤍 Eliminado de tu wishlist');
  }
  localStorage.setItem('wishlist', JSON.stringify(state.wishlist));
}

/* ---- TOAST ---- */
function showToast(message, type = '') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast${type ? ` toast-${type}` : ''}`;
  toast.innerHTML = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

/* ---- CHECKOUT ---- */
function checkout() {
  closeCart();
  const overlay = $('#modal-overlay');
  overlay.classList.add('open');
  clearCart();
}

/* ---- SEARCH ---- */
function handleSearch() {
  const query = $('#search-input').value.trim();
  state.searchQuery = query;
  state.activeCategory = 'all';
  navigate('products', { force: true });
  $$('.category-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
}

/* ---- INIT EVENT LISTENERS ---- */
function initListeners() {
  /* Navigation */
  $$('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.page);
    });
  });

  /* Logo */
  $('#logo-link')?.addEventListener('click', e => { e.preventDefault(); navigate('home'); });

  /* Mobile menu */
  $('#menu-toggle')?.addEventListener('click', () => {
    $('#mobile-nav').classList.toggle('open');
  });

  /* Cart */
  $('#cart-btn')?.addEventListener('click', openCart);
  $('#close-cart-btn')?.addEventListener('click', closeCart);
  $('#cart-overlay')?.addEventListener('click', closeCart);
  $('#cart-shop-btn')?.addEventListener('click', () => { closeCart(); navigate('products'); });
  $('#checkout-btn')?.addEventListener('click', checkout);
  $('#clear-cart-btn')?.addEventListener('click', () => {
    clearCart();
    showToast('🗑️ Carrito vaciado');
  });

  /* Modal */
  $('#modal-close')?.addEventListener('click', () => $('#modal-overlay').classList.remove('open'));
  $('#modal-continue')?.addEventListener('click', () => {
    $('#modal-overlay').classList.remove('open');
    navigate('products');
  });
  $('#modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) $('#modal-overlay').classList.remove('open');
  });

  /* Back button */
  $('#back-btn')?.addEventListener('click', () => navigate('products'));

  /* Search */
  $('#search-btn')?.addEventListener('click', handleSearch);
  $('#search-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSearch();
  });

  /* Sort */
  $('#sort-select')?.addEventListener('change', e => {
    state.sortBy = e.target.value;
    renderFilteredProducts();
  });

  /* Price range */
  $('#price-min')?.addEventListener('input', e => {
    state.priceMin = parseInt(e.target.value);
    $('#price-min-val').textContent = state.priceMin;
    if (state.priceMin > state.priceMax) {
      state.priceMax = state.priceMin;
      $('#price-max').value = state.priceMax;
      $('#price-max-val').textContent = state.priceMax;
    }
    renderFilteredProducts();
  });
  $('#price-max')?.addEventListener('input', e => {
    state.priceMax = parseInt(e.target.value);
    $('#price-max-val').textContent = state.priceMax;
    if (state.priceMax < state.priceMin) {
      state.priceMin = state.priceMax;
      $('#price-min').value = state.priceMin;
      $('#price-min-val').textContent = state.priceMin;
    }
    renderFilteredProducts();
  });

  /* View toggle */
  $('#grid-view-btn')?.addEventListener('click', () => {
    state.viewMode = 'grid';
    $('#grid-view-btn').classList.add('active');
    $('#list-view-btn').classList.remove('active');
    renderFilteredProducts();
  });
  $('#list-view-btn')?.addEventListener('click', () => {
    state.viewMode = 'list';
    $('#list-view-btn').classList.add('active');
    $('#grid-view-btn').classList.remove('active');
    renderFilteredProducts();
  });
}

/* ---- BOOT ---- */
document.addEventListener('DOMContentLoaded', async () => {
  initListeners();
  updateCartUI();

  try {
    await loadData();
  } catch (err) {
    console.error('Error loading data:', err);
    showToast('❌ Error cargando productos. Inténtalo de nuevo.', 'error');
    $$('.skeleton-card').forEach(el => {
      el.style.background = '#fee2e2';
      el.style.animation = 'none';
    });
  }
});
