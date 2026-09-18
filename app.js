const imageUrls = {
  denim: "https://images.unsplash.com/photo-1708523842501-1619478cea1f?auto=format&fit=crop&w=900&q=85",
  flatlay: "https://images.unsplash.com/photo-1467043237213-65f2da53396f?auto=format&fit=crop&w=900&q=85",
  shirt: "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=85",
  sneakers: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",
  bag: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85",
  watch: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85",
  sweater: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85",
  bottle: "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&q=85"
};

const seedProducts = [
  { id: "p1", title: "Klassik denim gödəkçə", store: "NOVA Studio", category: "Geyim", subtype: "Gödəkçə", material: "Denim", colors: ["Mavi"], sizes: ["S", "M", "L", "XL"], price: 89, stock: 8, city: "Bakı", image: imageUrls.denim, badge: "Seçimimiz", description: "Yumşaq denim parçadan hazırlanmış, hər mövsümə uyğun klassik gödəkçə." },
  { id: "p2", title: "Ağ basic köynək", store: "Mimoza", category: "Geyim", subtype: "T-shirt", material: "Pambıq", colors: ["Ağ", "Qara"], sizes: ["S", "M", "L"], price: 32, stock: 20, city: "Bakı", image: imageUrls.flatlay, description: "Gündəlik kombinlərin əvəzolunmazı. 100% nəfəs alan pambıq." },
  { id: "p3", title: "Air Street 02", store: "Step Lab", category: "Ayaqqabı", subtype: "İdman ayaqqabısı", material: "Dəri", colors: ["Qara", "Ağ"], sizes: ["38", "39", "40", "41"], price: 145, stock: 5, city: "Gəncə", image: imageUrls.sneakers, badge: "Yeni", description: "Şəhər ritmi üçün yüngül altlıq və yumşaq içlik." },
  { id: "p4", title: "Kətan oversize köynək", store: "Sahil Concept", category: "Geyim", subtype: "Köynək", material: "Kətan", colors: ["Bej", "Yaşıl"], sizes: ["M", "L", "XL"], price: 64, stock: 12, city: "Bakı", image: imageUrls.shirt, description: "Yay üçün yüngül və rahat kətan köynək." },
  { id: "p5", title: "Luna gündəlik çanta", store: "Mavi Room", category: "Çanta", subtype: "Çiyin çantası", material: "Dəri", colors: ["Bej", "Qara"], sizes: ["One size"], price: 118, stock: 4, city: "Sumqayıt", image: imageUrls.bag, description: "Kiçik ölçüdə böyük rahatlıq. Gündəlik əşyaların üçün ideal." },
  { id: "p6", title: "Minimal saat 36 mm", store: "Saatçı", category: "Aksesuar", subtype: "Saat", material: "Paslanmaz polad", colors: ["Ağ"], sizes: ["One size"], price: 96, stock: 6, city: "Bakı", image: imageUrls.watch, description: "Minimal siferblat, klassik qayış və hər günə uyğun görünüş." },
  { id: "p7", title: "Terracotta sviter", store: "Mimoza", category: "Geyim", subtype: "Sviter", material: "Yun", colors: ["Yaşıl", "Bej"], sizes: ["S", "M", "L"], price: 74, stock: 10, city: "Şəki", image: imageUrls.sweater, description: "Sərin günlər üçün isti və yumşaq toxunuş." },
  { id: "p8", title: "Sakitlik şamı", store: "Evə", category: "Ev & həyat", subtype: "Dekor", material: "Soya mumu", colors: ["Ağ"], sizes: ["One size"], price: 28, stock: 25, city: "Lənkəran", image: imageUrls.bottle, badge: "Yerli istehsal", description: "Evinə sakit bir qoxu və isti işıq əlavə et." }
  ,{ id: "p9", title: "Qara straight jeans", store: "Denim Co", category: "Geyim", subtype: "Jeans", material: "Denim", colors: ["Qara"], sizes: ["28", "30", "32", "34"], price: 78, stock: 9, city: "Bakı", image: imageUrls.denim, badge: "Trend", description: "Gündəlik üslub üçün rahat kəsim, tünd qara denim." }
];

const state = {
  products: [...seedProducts, ...readStore("yerli_products", [])],
  cart: readStore("yerli_cart", []),
  query: "",
  category: "Hamısı",
  location: "all",
  type: "all",
  color: "all",
  size: "all",
  minPrice: "",
  maxPrice: "",
  sort: "newest",
  favorites: readStore("yerli_favorites", [])
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const productsGrid = $("#products-grid");
const resultCount = $("#result-count");
const emptyState = $("#empty-state");
const modalBackdrop = $("#modal-backdrop");
const toast = $("#toast");
let toastTimer;
let sellerStep = 1;
let sellerDraft = {};

function readStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function money(value) { return `${Number(value).toFixed(0)} AZN`; }
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]); }
function showToast(message) { clearTimeout(toastTimer); toast.textContent = message; toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 2800); }

function productImage(product) { return product.aiProcessed || product.image || product.images?.[0]?.ai_processed_url || product.images?.[0]?.original_url || imageUrls.flatlay; }
function productText(product) { return `${product.title} ${product.category} ${product.subtype || ""} ${product.material || ""} ${product.store} ${product.city}`.toLocaleLowerCase("az"); }

function getVisibleProducts() {
  let items = state.products.filter(product => {
    const queryTokens = state.query.toLocaleLowerCase("az").split(/\s+/).filter(Boolean);
    const text = productText(product);
    const queryMatch = !queryTokens.length || queryTokens.every(token => text.includes(token));
    const categoryMatch = state.category === "Hamısı" || product.category === state.category;
    const typeMatch = state.type === "all" || product.category === state.type;
    const cityMatch = state.location === "all" || product.city === state.location;
    const colorMatch = state.color === "all" || product.colors?.includes(state.color);
    const sizeMatch = state.size === "all" || product.sizes?.includes(state.size);
    const minMatch = !state.minPrice || Number(product.price) >= Number(state.minPrice);
    const maxMatch = !state.maxPrice || Number(product.price) <= Number(state.maxPrice);
    return queryMatch && categoryMatch && typeMatch && cityMatch && colorMatch && sizeMatch && minMatch && maxMatch;
  });
  if (state.sort === "low") items.sort((a, b) => a.price - b.price);
  if (state.sort === "high") items.sort((a, b) => b.price - a.price);
  return items;
}

function renderProducts() {
  const visible = getVisibleProducts();
  resultCount.textContent = `${visible.length} məhsul`;
  productsGrid.innerHTML = visible.map(product => `
    <article class="product-card" data-product-id="${escapeHtml(product.id)}" tabindex="0">
      <div class="product-image-wrap">
        <img src="${escapeHtml(productImage(product))}" alt="${escapeHtml(product.title)}" loading="lazy" />
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}
        <button class="fav-btn ${state.favorites.includes(product.id) ? "faved" : ""}" data-favorite="${escapeHtml(product.id)}" aria-label="Sevimlilərə əlavə et">${state.favorites.includes(product.id) ? "♥" : "♡"}</button>
        <button class="add-card-btn" data-add="${escapeHtml(product.id)}" aria-label="Səbətə əlavə et">＋</button>
      </div>
      <div class="product-info"><div class="product-title">${escapeHtml(product.title)}</div><div class="product-store">${escapeHtml(product.store)}</div><div class="product-bottom"><span class="product-price">${money(product.price)}</span><span class="product-city">${escapeHtml(product.city)}</span></div></div>
    </article>`).join("");
  emptyState.hidden = visible.length !== 0;
  productsGrid.hidden = visible.length === 0;
  renderActiveFilters();
}

function renderActiveFilters() {
  const filters = [];
  if (state.query) filters.push(["Axtarış", state.query, () => { state.query = ""; $("#search-input").value = ""; }]);
  if (state.category !== "Hamısı") filters.push(["Kateqoriya", state.category, () => { state.category = "Hamısı"; setCategoryPills(); }]);
  if (state.type !== "all") filters.push(["Növ", state.type, () => { state.type = "all"; $("#type-filter").value = "all"; }]);
  if (state.location !== "all") filters.push(["Şəhər", state.location, () => { state.location = "all"; $("#location-filter").value = "all"; }]);
  if (state.color !== "all") filters.push(["Rəng", state.color, () => { state.color = "all"; $("#color-filter").value = "all"; }]);
  if (state.size !== "all") filters.push(["Ölçü", state.size, () => { state.size = "all"; $("#size-filter").value = "all"; }]);
  $("#active-filters").innerHTML = filters.map(([, value], index) => `<span class="filter-tag">${escapeHtml(value)} <button data-remove-filter="${index}" aria-label="Filtri sil">×</button></span>`).join("");
  $("#active-filters")._filterActions = filters.map(([, , action]) => action);
}
function clearFilters() {
  Object.assign(state, { query: "", category: "Hamısı", location: "all", type: "all", color: "all", size: "all", minPrice: "", maxPrice: "" });
  $("#search-input").value = ""; $("#location-filter").value = "all"; $("#type-filter").value = "all"; $("#color-filter").value = "all"; $("#size-filter").value = "all"; $("#min-price").value = ""; $("#max-price").value = ""; setCategoryPills(); renderProducts();
}
function setCategoryPills() { $$(".cat-pill").forEach(button => button.classList.toggle("active", button.dataset.category === state.category)); }

function openModal(id) { modalBackdrop.hidden = false; $(id).hidden = false; document.body.classList.add("modal-open"); }
function closeAllLayers() { modalBackdrop.hidden = true; $$(".modal, .drawer").forEach(layer => layer.hidden = true); document.body.classList.remove("modal-open"); }
function openCart() { renderCart(); modalBackdrop.hidden = false; $("#cart-drawer").hidden = false; document.body.classList.add("modal-open"); }

function toggleFavorite(id) { state.favorites = state.favorites.includes(id) ? state.favorites.filter(item => item !== id) : [...state.favorites, id]; writeStore("yerli_favorites", state.favorites); renderProducts(); }
function addToCart(product, options = {}) {
  const key = `${product.id}-${options.color || ""}-${options.size || ""}`;
  const found = state.cart.find(item => item.key === key);
  if (found) found.quantity += 1;
  else state.cart.push({ key, productId: product.id, quantity: 1, selectedColor: options.color || product.colors?.[0] || "", selectedSize: options.size || product.sizes?.[0] || "" });
  writeStore("yerli_cart", state.cart); updateCartCount(); showToast(`${product.title} səbətə əlavə edildi`);
}
function updateCartCount() { $("#cart-count").textContent = state.cart.reduce((total, item) => total + item.quantity, 0); }

function renderCart() {
  const container = $("#cart-items");
  if (!state.cart.length) { container.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">▱</div><h3>Səbətin hələ boşdur</h3><p>Bəyəndiyin məhsulları buraya əlavə et.</p></div>`; $("#cart-footer").innerHTML = ""; return; }
  let total = 0;
  container.innerHTML = state.cart.map(item => { const product = state.products.find(p => p.id === item.productId); if (!product) return ""; total += product.price * item.quantity; return `<div class="cart-item" data-cart-key="${escapeHtml(item.key)}"><img src="${escapeHtml(productImage(product))}" alt="${escapeHtml(product.title)}" /><div class="cart-item-info"><div class="cart-item-title">${escapeHtml(product.title)}</div><div class="cart-item-store">${escapeHtml(product.store)} · ${escapeHtml(item.selectedSize)}</div><div class="cart-item-bottom"><div class="qty-control"><button data-qty="minus">−</button><span>${item.quantity}</span><button data-qty="plus">＋</button></div><strong>${money(product.price * item.quantity)}</strong></div><button class="cart-remove" data-cart-remove>Sil</button></div></div>`; }).join("");
  $("#cart-footer").innerHTML = `<div class="cart-total"><span>Cəmi</span><span>${money(total)}</span></div><button class="checkout-btn" id="checkout-btn">Sifarişi mağazaya göndər</button><p class="checkout-note">MVP-də sifariş mağazaya əlaqə forması kimi göndərilir. Ödəniş və çatdırılma mağaza ilə razılaşdırılır.</p>`;
}

function showProductDetail(product) {
  const colors = (product.colors || []).map((color, index) => `<button class="variant-btn ${index === 0 ? "active" : ""}" data-variant="color">${escapeHtml(color)}</button>`).join("");
  const sizes = (product.sizes || []).map((size, index) => `<button class="variant-btn ${index === 0 ? "active" : ""}" data-variant="size">${escapeHtml(size)}</button>`).join("");
  $("#product-detail").innerHTML = `<div class="product-detail-grid"><div class="detail-image"><img src="${escapeHtml(productImage(product))}" alt="${escapeHtml(product.title)}" /></div><div class="detail-copy"><span class="eyebrow">${escapeHtml(product.category)}</span><h2>${escapeHtml(product.title)}</h2><div class="detail-store">${escapeHtml(product.store)} · ${escapeHtml(product.city)}</div><p class="detail-description">${escapeHtml(product.description || "Yerli mağazadan seçilmiş məhsul.")}</p><div class="detail-meta"><span class="meta-pill">${escapeHtml(product.material || "Material qeyd olunmayıb")}</span><span class="meta-pill">${product.stock > 0 ? `${product.stock} ədəd stokda` : "Mövcud deyil"}</span></div><div class="detail-price">${money(product.price)}</div>${colors ? `<div class="variant-row"><label>Rəng</label><div class="variant-options">${colors}</div></div>` : ""}${sizes ? `<div class="variant-row"><label>Ölçü</label><div class="variant-options">${sizes}</div></div>` : ""}<button class="add-detail-btn" id="add-detail-btn">Səbətə əlavə et</button></div></div>`;
  $$("[data-variant]").forEach(button => button.addEventListener("click", () => { $$(`[data-variant="${button.dataset.variant}"]`).forEach(item => item.classList.remove("active")); button.classList.add("active"); }));
  $("#add-detail-btn").addEventListener("click", () => { addToCart(product, { color: $("[data-variant=\"color\"].active")?.textContent, size: $("[data-variant=\"size\"].active")?.textContent }); closeAllLayers(); });
  openModal("#product-modal");
}

function renderSeller() {
  const content = $("#seller-content");
  $$(".seller-step").forEach((step, index) => step.classList.toggle("active", index + 1 === sellerStep));
  if (sellerStep === 1) {
    content.innerHTML = `<span class="eyebrow">Mağaza profilin</span><h2>Mağazanı bir neçə addımda yarat.</h2><p>Məhsullarını yerləşdirməzdən əvvəl alıcıların səni tanıması üçün əsas məlumatları daxil et.</p><form id="store-form"><div class="form-grid"><div class="form-field"><label for="store-name">Mağaza adı *</label><input id="store-name" required placeholder="məs. NOVA Studio" value="${escapeHtml(sellerDraft.storeName || "")}" /></div><div class="form-field"><label for="store-owner">Adın</label><input id="store-owner" placeholder="Ad və soyad" value="${escapeHtml(sellerDraft.owner || "")}" /></div><div class="form-field"><label for="store-location">Şəhər / rayon *</label><select id="store-location" required><option value="">Seç</option>${["Bakı", "Gəncə", "Sumqayıt", "Şəki", "Lənkəran", "Naxçıvan", "Quba", "Mingəçevir"].map(city => `<option ${sellerDraft.location === city ? "selected" : ""}>${city}</option>`).join("")}</select></div><div class="form-field"><label for="store-contact">Əlaqə nömrəsi *</label><input id="store-contact" required placeholder="+994 50 000 00 00" value="${escapeHtml(sellerDraft.contact || "")}" /></div><div class="form-field full"><label for="store-description">Qısa təsvir</label><textarea id="store-description" placeholder="Mağazanı bir cümlə ilə tanıt">${escapeHtml(sellerDraft.description || "")}</textarea></div></div><div class="form-error" id="store-error">Zəhmət olmasa, tələb olunan sahələri doldur.</div><button class="primary-wide" type="submit">Mağazanı yarat və məhsul əlavə et <span>→</span></button></form>`;
    $("#store-form").addEventListener("submit", event => { event.preventDefault(); const form = event.currentTarget; if (!form.checkValidity()) { $("#store-error").classList.add("show"); return; } sellerDraft = { ...sellerDraft, storeName: $("#store-name").value.trim(), owner: $("#store-owner").value.trim(), location: $("#store-location").value, contact: $("#store-contact").value.trim(), description: $("#store-description").value.trim() }; writeStore("yerli_store", sellerDraft); sellerStep = 2; renderSeller(); });
  } else if (sellerStep === 2) {
    const hasImage = !!sellerDraft.originalImage;
    content.innerHTML = `<span class="eyebrow">AI Studio</span><h2>Şəkli vitrininə hazırla.</h2><p>Telefonla çəkdiyin şəkli yüklə. AI fonu təmizləyib daha peşəkar görünüş yaradacaq.</p>${hasImage ? `<div class="ai-processing"><div class="image-preview"><img src="${escapeHtml(sellerDraft.originalImage)}" alt="Orijinal şəkil" /><span class="preview-label">Orijinal</span></div><div class="image-preview">${sellerDraft.processedImage ? `<img src="${escapeHtml(sellerDraft.processedImage)}" alt="AI ilə işlənmiş şəkil" /><span class="preview-label">AI Studio</span>` : `<div class="ai-loading" id="ai-result-placeholder"><div><div class="upload-icon">✦</div><p>Nəticə burada görünəcək</p></div></div>`}</div></div>` : `<label class="upload-zone" id="upload-zone" for="product-image"><div><div class="upload-icon">↥</div><h3>Şəkli buraya at və ya seç</h3><p>JPG, PNG · maksimum 10 MB</p><span class="upload-label">Şəkil seç</span><input id="product-image" type="file" accept="image/png,image/jpeg,image/webp" /></div></label><div class="ai-info"><span class="ai-info-icon">✦</span><p>AI Studio sadə fotoşəkildə fonu neytral studiya fonuna çevirir. Orijinal şəkil hər zaman ayrıca saxlanılır.</p></div><button class="secondary-btn" id="use-demo-image" style="margin-top:13px;height:38px;border-radius:9px;width:100%;font-size:12px">Demo şəkli ilə sına</button>`}${hasImage && !sellerDraft.processedImage ? `<button class="primary-wide" id="run-ai">AI ilə fonu təmizlə <span>✦</span></button>` : ""}${sellerDraft.processedImage ? `<div class="ai-info"><span class="ai-info-icon">✓</span><p>Şəklin hazırdır. Nəticəni bəyənməsən, yenidən emal edə və ya məhsul məlumatlarına keçə bilərsən.</p></div><div class="ai-actions"><button class="secondary-btn" id="regenerate-ai">Yenidən emal et</button><button class="primary-wide" id="continue-product" style="margin:0">Məhsul məlumatları <span>→</span></button></div>` : ""}`;
    const input = $("#product-image"); if (input) input.addEventListener("change", event => { const file = event.target.files?.[0]; if (file) readProductImage(file); });
    const zone = $("#upload-zone"); if (zone) { ["dragenter", "dragover"].forEach(type => zone.addEventListener(type, event => { event.preventDefault(); zone.classList.add("dragging"); })); ["dragleave", "drop"].forEach(type => zone.addEventListener(type, event => { event.preventDefault(); zone.classList.remove("dragging"); })); zone.addEventListener("drop", event => { const file = event.dataTransfer.files?.[0]; if (file) readProductImage(file); }); }
    $("#use-demo-image")?.addEventListener("click", () => { sellerDraft.originalImage = imageUrls.denim; sellerDraft.fileName = "demo-denim.jpg"; renderSeller(); });
    $("#run-ai")?.addEventListener("click", runAiProcessing);
    $("#regenerate-ai")?.addEventListener("click", () => { sellerDraft.processedImage = ""; renderSeller(); setTimeout(runAiProcessing, 60); });
    $("#continue-product")?.addEventListener("click", () => { sellerStep = 3; renderSeller(); });
  } else {
    content.innerHTML = `<span class="eyebrow">Son addım</span><h2>Məhsul məlumatlarını tamamla.</h2><p>Alıcılar məhsulunu daha rahat tapsın deyə məlumatları mümkün qədər dəqiq yaz.</p><form id="product-form"><div class="form-grid"><div class="form-field full"><label for="product-title">Başlıq *</label><input id="product-title" required placeholder="məs. Kişi köynəyi" /></div><div class="form-field"><label for="product-category">Kateqoriya *</label><select id="product-category" required><option value="">Seç</option><option>Geyim</option><option>Ayaqqabı</option><option>Çanta</option><option>Aksesuar</option><option>Ev & həyat</option><option>Gözəllik</option></select></div><div class="form-field"><label for="product-subtype">Növ / model</label><input id="product-subtype" placeholder="məs. İdman ayaqqabısı" /></div><div class="form-field"><label for="product-color">Rənglər</label><input id="product-color" placeholder="Qara, ağ" /></div><div class="form-field"><label for="product-size">Ölçülər</label><input id="product-size" placeholder="S, M, L və ya 38, 39" /></div><div class="form-field"><label for="product-material">Material</label><input id="product-material" placeholder="Pambıq, dəri..." /></div><div class="form-field"><label for="product-price">Qiymət (AZN) *</label><input id="product-price" required min="1" step="0.01" type="number" placeholder="0" /></div><div class="form-field"><label for="product-stock">Stok</label><input id="product-stock" min="0" type="number" placeholder="Məs. 10" /></div></div><div class="form-error" id="product-error">Başlıq, kateqoriya və düzgün qiymət daxil et.</div><button class="primary-wide" type="submit">Məhsulu yayımla <span>↗</span></button></form>`;
    $("#product-form").addEventListener("submit", event => { event.preventDefault(); const price = Number($("#product-price").value); if (!event.currentTarget.checkValidity() || price <= 0) { $("#product-error").classList.add("show"); return; } const id = `user-${Date.now()}`; const product = { id, title: $("#product-title").value.trim(), store: sellerDraft.storeName, category: $("#product-category").value, subtype: $("#product-subtype").value.trim(), material: $("#product-material").value.trim(), colors: $("#product-color").value.split(",").map(item => item.trim()).filter(Boolean), sizes: $("#product-size").value.split(",").map(item => item.trim()).filter(Boolean), price, stock: Number($("#product-stock").value || 0), city: sellerDraft.location, image: sellerDraft.originalImage, aiProcessed: sellerDraft.processedImage, description: `${sellerDraft.storeName} mağazasından yeni məhsul.` }; state.products.push(product); const saved = readStore("yerli_products", []); writeStore("yerli_products", [...saved, product]); sellerStep = 1; sellerDraft = { ...readStore("yerli_store", {}), originalImage: "", processedImage: "" }; closeAllLayers(); renderProducts(); showToast("Məhsul vitrində yayımlandı"); });
  }
}

function readProductImage(file) { if (!file.type.startsWith("image/")) { showToast("Yalnız JPG, PNG və ya WEBP şəkil seç."); return; } if (file.size > 10 * 1024 * 1024) { showToast("Şəkil 10 MB-dan kiçik olmalıdır."); return; } const reader = new FileReader(); reader.onload = event => { sellerDraft.originalImage = event.target.result; sellerDraft.processedImage = ""; sellerDraft.fileName = file.name; renderSeller(); }; reader.readAsDataURL(file); }
async function runAiProcessing() { const runButton = $("#run-ai"); if (runButton) { runButton.disabled = true; runButton.textContent = "AI işləyir..."; } const original = sellerDraft.originalImage; if (!original) return; await new Promise(resolve => setTimeout(resolve, 1100)); sellerDraft.processedImage = await makeStudioImage(original); renderSeller(); }
function makeStudioImage(src) { return new Promise(resolve => { const image = new Image(); image.onload = () => { try { const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 900; const context = canvas.getContext("2d"); context.fillStyle = "#f4f5f7"; context.fillRect(0, 0, 900, 900); const scale = Math.min(720 / image.width, 720 / image.height); const width = image.width * scale; const height = image.height * scale; const x = (900 - width) / 2; const y = (900 - height) / 2; context.save(); context.shadowColor = "rgba(17,28,56,.18)"; context.shadowBlur = 28; context.shadowOffsetY = 17; context.drawImage(image, x, y, width, height); context.restore(); resolve(canvas.toDataURL("image/jpeg", .88)); } catch { resolve(src); } }; image.onerror = () => resolve(src); image.src = src; }); }

function bindEvents() {
  renderProducts(); updateCartCount();
  $("#search-submit").addEventListener("click", () => { state.query = $("#search-input").value.trim(); renderProducts(); $("#catalog").scrollIntoView({ behavior: "smooth" }); });
  $("#search-input").addEventListener("keydown", event => { if (event.key === "Enter") $("#search-submit").click(); });
  $$(".popular-searches button").forEach(button => button.addEventListener("click", () => { $("#search-input").value = button.dataset.query; $("#search-submit").click(); }));
  $$(".cat-pill").forEach(button => button.addEventListener("click", () => { state.category = button.dataset.category; setCategoryPills(); renderProducts(); }));
  [["#location-filter", "location"], ["#type-filter", "type"], ["#color-filter", "color"], ["#size-filter", "size"], ["#sort-select", "sort"]].forEach(([selector, key]) => $(selector).addEventListener("change", event => { state[key] = event.target.value; renderProducts(); }));
  ["#min-price", "#max-price"].forEach(selector => $(selector).addEventListener("input", event => { state[selector === "#min-price" ? "minPrice" : "maxPrice"] = event.target.value; renderProducts(); }));
  $("#clear-filters").addEventListener("click", clearFilters); $("#empty-reset").addEventListener("click", clearFilters);
  $("#open-filters").addEventListener("click", () => $("#filters-panel").classList.add("open")); $("#close-filters").addEventListener("click", () => $("#filters-panel").classList.remove("open"));
  $("#open-cart").addEventListener("click", openCart); $("#open-search").addEventListener("click", () => { $("#search-input").focus(); $("#search-input").scrollIntoView({ behavior: "smooth", block: "center" }); });
  $("#open-seller").addEventListener("click", () => { sellerStep = 1; sellerDraft = readStore("yerli_store", {}); renderSeller(); openModal("#seller-modal"); }); $("#open-seller-ai").addEventListener("click", () => { sellerStep = 1; sellerDraft = readStore("yerli_store", {}); renderSeller(); openModal("#seller-modal"); });
  $("#browse-stores").addEventListener("click", () => showToast("Mağaza kataloqu tezliklə genişlənir")); $("#open-mobile-menu").addEventListener("click", () => showToast("Kəşf et · Mağazalar · Necə işləyir?"));
  productsGrid.addEventListener("click", event => { const add = event.target.closest("[data-add]"); if (add) { event.stopPropagation(); const product = state.products.find(item => item.id === add.dataset.add); if (product) addToCart(product); return; } const favorite = event.target.closest("[data-favorite]"); if (favorite) { event.stopPropagation(); toggleFavorite(favorite.dataset.favorite); return; } const card = event.target.closest("[data-product-id]"); if (card) { const product = state.products.find(item => item.id === card.dataset.productId); if (product) showProductDetail(product); } });
  productsGrid.addEventListener("keydown", event => { if (event.key === "Enter") event.target.closest("[data-product-id]")?.click(); });
  $("#active-filters").addEventListener("click", event => { const button = event.target.closest("[data-remove-filter]"); if (button) { $("#active-filters")._filterActions?.[Number(button.dataset.removeFilter)](); renderProducts(); } });
  $("#cart-items").addEventListener("click", event => { const itemEl = event.target.closest("[data-cart-key]"); if (!itemEl) return; const item = state.cart.find(entry => entry.key === itemEl.dataset.cartKey); if (!item) return; if (event.target.closest("[data-cart-remove]")) state.cart = state.cart.filter(entry => entry.key !== item.key); if (event.target.closest("[data-qty=plus]")) item.quantity += 1; if (event.target.closest("[data-qty=minus]")) item.quantity = Math.max(0, item.quantity - 1); state.cart = state.cart.filter(entry => entry.quantity > 0); writeStore("yerli_cart", state.cart); updateCartCount(); renderCart(); });
  $("#cart-footer").addEventListener("click", event => { if (event.target.id === "checkout-btn") { const phone = window.prompt("Mağazanın sənə çatması üçün telefon nömrəni yaz:", "+994 "); if (phone) { closeAllLayers(); showToast("Sifariş məlumatın mağazaya göndərilməyə hazırdır"); } } });
  modalBackdrop.addEventListener("click", closeAllLayers); $$("[data-close-modal], [data-close-drawer]").forEach(button => button.addEventListener("click", closeAllLayers)); document.addEventListener("keydown", event => { if (event.key === "Escape") closeAllLayers(); });
}

bindEvents();
