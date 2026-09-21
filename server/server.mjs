import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.mjs';
import { ApiError, fail, hash, integer, json, money, normalizeIdentifier, normalizePhone, now, productSelect, productView, publicStore, publicUser, stableStringify, stringList, text, uid } from './helpers.mjs';
import { capabilities, deliverOtp, expireCheckout, stripeCheckout, uploadImage, verifyStripeWebhook } from './providers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const staticRoot = path.join(root, 'dist');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const uploadRoot = path.join(dataDir, 'uploads');
const port = Number(process.env.PORT || 4173);
const publicUrl = process.env.PUBLIC_URL || `http://127.0.0.1:${port}`;
const allowedOrigins = (process.env.ALLOW_ORIGIN || process.env.FRONTEND_URL || '').split(',').map(value => value.trim()).filter(Boolean);
const cities = ['Bakı', 'Gəncə', 'Sumqayıt', 'Şəki', 'Lənkəran', 'Naxçıvan', 'Quba', 'Mingəçevir'];
const administrators = new Set((process.env.ADMIN_IDENTIFIERS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8' };
const requestCounts = new Map();

const seeds = [
  ['NOVA Studio', 'Bakı', 'Klassik denim gödəkçə', 'Geyim', 8900, 8, { subtype: 'Gödəkçə', material: 'Denim', colors: ['Mavi'], sizes: ['S', 'M', 'L', 'XL'], image: 'https://images.unsplash.com/photo-1708523842501-1619478cea1f?auto=format&fit=crop&w=900&q=85', badge: 'Seçimimiz', description: 'Yumşaq denim parçadan hazırlanmış, hər mövsümə uyğun klassik gödəkçə.' }],
  ['Mimoza', 'Bakı', 'Ağ basic köynək', 'Geyim', 3200, 20, { subtype: 'T-shirt', material: 'Pambıq', colors: ['Ağ', 'Qara'], sizes: ['S', 'M', 'L'], image: 'https://images.unsplash.com/photo-1467043237213-65f2da53396f?auto=format&fit=crop&w=900&q=85', description: 'Gündəlik kombinlərin əvəzolunmazı. 100% nəfəs alan pambıq.' }],
  ['Step Lab', 'Gəncə', 'Air Street 02', 'Ayaqqabı', 14500, 5, { subtype: 'İdman ayaqqabısı', material: 'Dəri', colors: ['Qara', 'Ağ'], sizes: ['38', '39', '40', '41'], image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85', badge: 'Yeni', description: 'Şəhər ritmi üçün yüngül altlıq və yumşaq içlik.' }],
  ['Sahil Concept', 'Bakı', 'Kətan oversize köynək', 'Geyim', 6400, 12, { subtype: 'Köynək', material: 'Kətan', colors: ['Bej', 'Yaşıl'], sizes: ['M', 'L', 'XL'], image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', description: 'Yay üçün yüngül və rahat kətan köynək.' }],
  ['Mavi Room', 'Sumqayıt', 'Luna gündəlik çanta', 'Çanta', 11800, 4, { subtype: 'Çiyin çantası', material: 'Dəri', colors: ['Bej', 'Qara'], sizes: ['One size'], image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85', description: 'Kiçik ölçüdə böyük rahatlıq. Gündəlik əşyaların üçün ideal.' }],
  ['Saatçı', 'Bakı', 'Minimal saat 36 mm', 'Aksesuar', 9600, 6, { subtype: 'Saat', material: 'Paslanmayan polad', colors: ['Ağ'], sizes: ['One size'], image: 'https://images.unsplash.com/photo-1523275335684-37898b6af30?auto=format&fit=crop&w=900&q=85', description: 'Minimal siferblat, klassik qayış və hər günə uyğun görünüş.' }],
  ['Mimoza', 'Şəki', 'Terracotta sviter', 'Geyim', 7400, 10, { subtype: 'Sviter', material: 'Yun', colors: ['Yaşıl', 'Bej'], sizes: ['S', 'M', 'L'], image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', description: 'Sərin günlər üçün isti və yumşaq toxunuş.' }],
  ['Evə', 'Lənkəran', 'Sakitlik şamı', 'Ev & həyat', 2800, 25, { subtype: 'Dekor', material: 'Soya mumu', colors: ['Ağ'], sizes: ['One size'], image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&q=85', badge: 'Yerli istehsal', description: 'Evinə sakit bir qoxu və isti işıq əlavə et.' }],
  ['Denim Co', 'Bakı', 'Qara straight jeans', 'Geyim', 7800, 9, { subtype: 'Jeans', material: 'Denim', colors: ['Qara'], sizes: ['28', '30', '32', '34'], image: 'https://images.unsplash.com/photo-1708523842501-1619478cea1f?auto=format&fit=crop&w=900&q=85', badge: 'Trend', description: 'Gündəlik üslub üçün rahat kəsim, tünd qara denim.' }],
];

const demoImages = [
  'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1584917865442-0c8b3f0e95dd?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=85',
];
const demoCatalog = [
  ['Zarka Demo', 'Bakı', [['Ağ gündəlik sneaker','Ayaqqabı',89,10,3],['Qara şəhər loaferi','Ayaqqabı',119,5,4],['Rəngli canvas sneaker','Ayaqqabı',75,11,3],['Linen rahat köynək','Geyim',45,12,0],['Saten köynək','Geyim',55,11,1],['Düz kəsim şalvar','Geyim',65,7,2],['Şəhər kəsimli şalvar','Geyim',59,9,1],['Yüngül bomber kurtka','Geyim',99,5,1],['Denim kurtka','Geyim',109,6,0],['Oversize jaket','Geyim',119,6,2]]],
];

function isAllowedOrigin(origin) { return !origin || !allowedOrigins.length || allowedOrigins.includes(origin); }
function baseHeaders(req, extra = {}) {
  const origin = req.headers.origin;
  return { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()', 'Cross-Origin-Opener-Policy': 'same-origin', 'Cache-Control': 'no-store', ...(origin && isAllowedOrigin(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}), ...extra };
}
function send(req, res, status, body, extra = {}) { const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body); res.writeHead(status, baseHeaders(req, { 'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : Buffer.isBuffer(body) ? 'application/octet-stream' : 'application/json; charset=utf-8', ...extra })); res.end(payload); }
function clientIp(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
function limited(req, group, max, windowMs) { const key = `${group}:${clientIp(req)}`; const stamp = Date.now(); const entries = (requestCounts.get(key) || []).filter(time => time > stamp - windowMs); if (entries.length >= max) { requestCounts.set(key, entries); fail(429, 'Çox sayda sorğu göndərildi. Bir az sonra yenidən cəhd et.', 'RATE_LIMITED'); } entries.push(stamp); requestCounts.set(key, entries); }
async function readBody(req, limit = 1_000_000) { const chunks = []; let total = 0; for await (const chunk of req) { total += chunk.length; if (total > limit) fail(413, 'Məlumat həcmi çox böyükdür'); chunks.push(chunk); } if (!chunks.length) return {}; try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'Göndərilən məlumat düzgün deyil'); } }
function tokenFrom(req) { const value = String(req.headers.authorization || ''); return value.startsWith('Bearer ') ? value.slice(7) : ''; }
async function currentUser(db, req) { const token = tokenFrom(req); if (!/^[a-f0-9]{64}$/i.test(token)) return null; const session = await db.get('SELECT s.*, u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?', [hash(token), Date.now()]); return session?.status === 'active' ? session : null; }
async function requireUser(db, req) { const user = await currentUser(db, req); if (!user) fail(401, 'Giriş tələb olunur', 'AUTH_REQUIRED'); return user; }
async function requireAdmin(db, req) { const user = await requireUser(db, req); if (user.role !== 'admin') fail(403, 'Bu əməliyyat yalnız admin üçündür', 'ADMIN_REQUIRED'); return user; }
function cleanOriginPath(value) { return String(value || '').replace(/[?#].*$/, '').replace(/^\/+/, ''); }
function quoteShipping(city, storeCount) { const base = city === 'Bakı' ? 350 : cities.includes(city) ? 600 : 800; return { method: 'Yerli kuryer', city, amountMinor: base * Math.max(1, storeCount), amount: (base * Math.max(1, storeCount)) / 100, etaDays: city === 'Bakı' ? '1-2' : '2-4', currency: 'AZN' }; }
function validCity(value) { const city = text(value, 'Şəhər', { min: 2, max: 50 }); if (!cities.includes(city)) fail(400, 'Şəhər siyahıdan seçilməlidir'); return city; }

async function seedDatabase(db) {
  if (process.env.SEED_DEMO === 'false') return;
  const row = await db.get('SELECT COUNT(*) AS count FROM products');
  if (Number(row.count)) return;
  await db.transaction(async tx => {
    for (const [name, city, title, category, priceMinor, stock, details] of seeds) {
      const storeId = `seed_${hash(name).slice(0, 18)}`;
      const ownerId = `seed_owner_${hash(name).slice(0, 18)}`;
      await tx.run('INSERT INTO users(id,identifier,identifier_type,role,status,profile,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(identifier) DO NOTHING', [ownerId, `${hash(name).slice(0, 16)}@seed.yerli.local`, 'email', 'buyer', 'active', '{}', now()]);
      await tx.run('INSERT INTO stores(id,owner_id,name,city,phone,description,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING', [storeId, ownerId, name, city, '+994000000000', 'Yerli mağazadan seçilmiş məhsullar.', 'active', now(), now()]);
      await tx.run('INSERT INTO products(id,store_id,title,category,price_minor,stock,status,details,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)', [uid('seed_product'), storeId, title, category, priceMinor, stock, 'active', JSON.stringify(details), now(), now()]);
    }
  });
}

async function seedCategories(db) {
  const names = ['Geyim', 'Ayaqqabı', 'Çanta', 'Aksesuar', 'Ev & həyat', 'Gözəllik'];
  for (const [position, name] of names.entries()) await db.run('INSERT INTO categories(id,name,position,active) VALUES(?,?,?,1) ON CONFLICT(name) DO NOTHING', [`category_${hash(name).slice(0, 16)}`, name, position]);
}

async function seedDemoCatalog(db) {
  await db.transaction(async tx => {
    for (const [storeName, city, items] of demoCatalog) {
      const storeId = `demo_store_${hash(storeName).slice(0, 18)}`; const ownerId = `demo_owner_${hash(storeName).slice(0, 18)}`; const at = now();
      await tx.run('INSERT INTO users(id,identifier,identifier_type,role,status,profile,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(identifier) DO NOTHING', [ownerId, `${hash(storeName).slice(0, 18)}@demo.yerli.local`, 'email', 'buyer', 'active', '{}', at]);
      await tx.run('INSERT INTO stores(id,owner_id,name,city,phone,description,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING', [storeId, ownerId, storeName, city, '+994000000000', 'Demo mağaza: məhsul, qiymət və stok məlumatları yalnız sınaq üçündür.', 'active', at, at]);
      for (const [title, category, price, stock, imageIndex] of items) { const id = `demo_product_${hash(`${storeName}:${title}`).slice(0, 22)}`; const details = { subtype: category, material: 'Demo material', colors: ['Bej', 'Qara'], sizes: category === 'Ayaqqabı' ? ['38', '39', '40'] : ['S', 'M', 'L'], image: demoImages[imageIndex], badge: 'Demo', description: `${storeName} üçün nümayiş məhsulu. Satışa və real sifarişə aid deyil.` }; await tx.run('INSERT INTO products(id,store_id,title,category,price_minor,stock,status,details,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING', [id, storeId, title, category, price * 100, stock, 'active', JSON.stringify(details), at, at]); }
    }
  });
}

async function importLegacyJson(db) {
  if (dataDir !== path.join(root, 'data')) return;
  const source = path.join(root, 'data', 'db.json');
  if (!fs.existsSync(source)) return;
  const raw = fs.readFileSync(source, 'utf8'); const sourceHash = hash(raw);
  if (await db.get('SELECT source_hash FROM legacy_imports WHERE source_hash=?', [sourceHash])) return;
  let legacy; try { legacy = JSON.parse(raw); } catch { return; }
  if (!Array.isArray(legacy.products) && !Array.isArray(legacy.users)) return;
  await db.transaction(async tx => {
    const at = now(); const storesByName = new Map();
    for (const user of legacy.users || []) { if (!user?.id || !user?.identifier) continue; await tx.run('INSERT INTO users(id,identifier,identifier_type,role,status,profile,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(identifier) DO NOTHING', [user.id, String(user.identifier).toLowerCase(), user.identifierType || 'email', 'buyer', 'active', '{}', user.createdAt || at]); }
    for (const store of legacy.stores || []) { if (!store?.id || !store?.ownerId || !store?.name) continue; const owner = await tx.get('SELECT id FROM users WHERE id=?', [store.ownerId]); if (!owner) continue; await tx.run('INSERT INTO stores(id,owner_id,name,city,phone,description,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING', [store.id, store.ownerId, store.name, store.city || 'Bakı', store.phone || '+994000000000', store.description || '', 'active', store.createdAt || at, store.updatedAt || at]); storesByName.set(store.name, store.id); }
    for (const product of legacy.products || []) {
      if (!product?.id || !product?.title || !product?.store) continue; let storeId = storesByName.get(product.store);
      if (!storeId) { storeId = `legacy_store_${hash(product.store).slice(0, 20)}`; const ownerId = `legacy_owner_${hash(product.store).slice(0, 20)}`; await tx.run('INSERT INTO users(id,identifier,identifier_type,role,status,profile,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(identifier) DO NOTHING', [ownerId, `${hash(product.store).slice(0, 18)}@legacy.yerli.local`, 'email', 'buyer', 'active', '{}', at]); await tx.run('INSERT INTO stores(id,owner_id,name,city,phone,description,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING', [storeId, ownerId, product.store, product.city || 'Bakı', '+994000000000', 'Köçürülmüş Yerli mağazası.', 'active', at, at]); storesByName.set(product.store, storeId); }
      const details = { subtype: product.subtype || '', material: product.material || '', colors: Array.isArray(product.colors) ? product.colors : [], sizes: Array.isArray(product.sizes) ? product.sizes : [], image: product.aiProcessed || product.image || '', badge: product.badge || '', description: product.description || '' }; const minor = Math.max(1, Math.round(Number(product.price || 0) * 100)); await tx.run('INSERT INTO products(id,store_id,title,category,price_minor,stock,status,details,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING', [product.id, storeId, product.title, product.category || 'Digər', minor, Math.max(0, Number(product.stock || 0)), 'active', JSON.stringify(details), product.createdAt || at, at]);
    }
    for (const order of legacy.orders || []) {
      if (!order?.id || !order?.userId || !(await tx.get('SELECT id FROM users WHERE id=?', [order.userId]))) continue; const present = await tx.get('SELECT id FROM orders WHERE id=?', [order.id]); if (present) continue; const items = (order.items || []).filter(item => item?.productId); const subtotalMinor = Math.round(Number(order.subtotal || 0) * 100); const shippingMinor = Math.round(Number(order.shipping?.amount || 0) * 100); await tx.run('INSERT INTO orders(id,user_id,request_key,request_hash,subtotal_minor,shipping_minor,total_minor,customer,shipping,payment_method,payment_status,payment_session,checkout_url,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [order.id, order.userId, `legacy_${order.id}`, hash(order.id), subtotalMinor, shippingMinor, Math.round(Number(order.total || 0) * 100), JSON.stringify(order.customer || {}), JSON.stringify(order.shipping || {}), order.payment?.method || 'cash', order.payment?.status || 'cash_on_delivery', null, null, order.status || 'new', order.createdAt || at, order.createdAt || at]); for (const item of items) { const product = await tx.get(`${productSelect} WHERE p.id=?`, [item.productId]); if (!product) continue; const shipmentId = uid('legacy_shipment'); await tx.run('INSERT INTO shipments(id,order_id,store_id,shipping_minor,subtotal_minor,status,updated_at) VALUES(?,?,?,?,?,?,?)', [shipmentId, order.id, product.store_id, 0, Math.round(Number(item.unitPrice || 0) * Number(item.quantity || 0) * 100), order.status || 'new', at]); await tx.run('INSERT INTO order_items(id,order_id,shipment_id,product_id,store_id,title,quantity,unit_price_minor,variant) VALUES(?,?,?,?,?,?,?,?,?)', [uid('legacy_item'), order.id, shipmentId, item.productId, product.store_id, item.title || product.title, Math.max(1, Number(item.quantity || 1)), Math.round(Number(item.unitPrice || 0) * 100), JSON.stringify({ color: item.selectedColor || '', size: item.selectedSize || '' })]); }
    }
    await tx.run('INSERT INTO legacy_imports(source_hash,source_name,payload,imported_at) VALUES(?,?,?,?)', [sourceHash, 'data/db.json', JSON.stringify({ users: (legacy.users || []).length, products: (legacy.products || []).length, orders: (legacy.orders || []).length }), at]);
  });
}

async function getStore(db, ownerId) { return db.get('SELECT * FROM stores WHERE owner_id=?', [ownerId]); }
async function catalogItems(db, where = '', params = []) { return (await db.all(`${productSelect} ${where}`, params)).map(productView); }
async function requestedItems(tx, rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 30) fail(400, 'Səbətdə 1–30 məhsul olmalıdır');
  const combined = new Map();
  for (const value of rawItems) {
    const productId = text(value?.productId, 'Məhsul', { min: 1, max: 100 });
    const quantity = integer(value?.quantity, 'Miqdar', 1, 99);
    const key = `${productId}:${value?.selectedColor || ''}:${value?.selectedSize || ''}`;
    combined.set(key, { productId, quantity: (combined.get(key)?.quantity || 0) + quantity, selectedColor: String(value?.selectedColor || ''), selectedSize: String(value?.selectedSize || '') });
  }
  const result = [];
  for (const item of combined.values()) {
    if (item.quantity > 99) fail(400, 'Bir məhsuldan ən çox 99 ədəd seçilə bilər');
    const product = await tx.get(`${productSelect} WHERE p.id=?`, [item.productId]);
    if (!product || product.status !== 'active' || product.store_status !== 'active') fail(404, 'Məhsul artıq satışda deyil');
    const details = json(product.details);
    if (item.selectedColor && (!Array.isArray(details.colors) || !details.colors.includes(item.selectedColor))) fail(400, 'Məhsulun seçilən rəngi yoxdur');
    if (item.selectedSize && (!Array.isArray(details.sizes) || !details.sizes.includes(item.selectedSize))) fail(400, 'Məhsulun seçilən ölçüsü yoxdur');
    if (Number(product.stock) < item.quantity) fail(409, `${product.title} üçün kifayət qədər stok yoxdur`, 'OUT_OF_STOCK');
    result.push({ product, quantity: item.quantity, selectedColor: item.selectedColor || details.colors?.[0] || '', selectedSize: item.selectedSize || details.sizes?.[0] || '' });
  }
  return result;
}
function orderFromItems(items, body) {
  const city = validCity(body?.shipping?.city);
  const address = text(body?.shipping?.address, 'Ünvan', { min: 5, max: 350 });
  const customer = { name: text(body?.customer?.name, 'Ad və soyad', { min: 2, max: 100 }), phone: normalizePhone(body?.customer?.phone), note: text(body?.customer?.note || '', 'Qeyd', { max: 500 }) };
  const paymentMethod = body?.payment?.method === 'card' ? 'card' : body?.payment?.method === 'cash' ? 'cash' : fail(400, 'Ödəniş üsulu düzgün deyil');
  const storeIds = new Set(items.map(item => item.product.store_id));
  const shipping = quoteShipping(city, storeIds.size);
  const subtotalMinor = items.reduce((total, item) => total + Number(item.product.price_minor) * item.quantity, 0);
  return { items, customer, shipping: { city, address, method: shipping.method, etaDays: shipping.etaDays }, paymentMethod, subtotalMinor, shippingMinor: shipping.amountMinor, totalMinor: subtotalMinor + shipping.amountMinor };
}
function publicOrder(row, items = []) { return { id: row.id, status: row.status, payment: { method: row.payment_method, status: row.payment_status, checkoutUrl: row.checkout_url || null }, customer: json(row.customer), shipping: json(row.shipping), subtotalMinor: Number(row.subtotal_minor), shippingMinor: Number(row.shipping_minor), totalMinor: Number(row.total_minor), subtotal: Number(row.subtotal_minor) / 100, shippingAmount: Number(row.shipping_minor) / 100, total: Number(row.total_minor) / 100, currency: 'AZN', createdAt: row.created_at, updatedAt: row.updated_at, items } }
async function orderItems(db, orderId) { return (await db.all('SELECT i.*, s.name AS store_name FROM order_items i JOIN stores s ON s.id=i.store_id WHERE i.order_id=? ORDER BY i.id', [orderId])).map(row => ({ productId: row.product_id, storeId: row.store_id, store: row.store_name, title: row.title, quantity: row.quantity, unitPriceMinor: Number(row.unit_price_minor), unitPrice: Number(row.unit_price_minor) / 100, selectedColor: json(row.variant).color || '', selectedSize: json(row.variant).size || '' })); }

async function api(db, req, res, url) {
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === '/api/health' && req.method === 'GET') return send(req, res, 200, { ok: true, service: 'yerli-api', database: db.kind, capabilities: capabilities(), time: now() });
  if (pathname === '/api/products' && req.method === 'GET') {
    const products = await catalogItems(db, 'WHERE p.status=? AND s.status=? ORDER BY p.created_at DESC', ['active', 'active']);
    const stores = (await db.all('SELECT * FROM stores WHERE status=? ORDER BY updated_at DESC', ['active'])).map(row => publicStore(row));
    return send(req, res, 200, { products, stores });
  }
  if (pathname === '/api/categories' && req.method === 'GET') return send(req, res, 200, { categories: await db.all('SELECT id,parent_id AS parentId,name,position FROM categories WHERE active=1 ORDER BY position,name') });
  if (pathname === '/api/auth/request-otp' && req.method === 'POST') {
    limited(req, 'otp', 10, 10 * 60_000); const body = await readBody(req, 10_000); const identifier = normalizeIdentifier(body.identifier);
    const previous = await db.get('SELECT requested_at FROM otp_challenges WHERE identifier=?', [identifier.value]);
    if (previous && Number(previous.requested_at) > Date.now() - 60_000) fail(429, 'Yeni kod üçün 1 dəqiqə gözlə', 'OTP_COOLDOWN');
    const code = String(crypto.randomInt(100000, 1_000_000)); const channel = await deliverOtp(identifier, code);
    await db.run('INSERT INTO otp_challenges(identifier,code_hash,attempts,expires_at,requested_at) VALUES(?,?,?,?,?) ON CONFLICT(identifier) DO UPDATE SET code_hash=excluded.code_hash,attempts=0,expires_at=excluded.expires_at,requested_at=excluded.requested_at', [identifier.value, hash(code), 0, Date.now() + 5 * 60_000, Date.now()]);
    return send(req, res, 200, { ok: true, channel, expiresIn: 300, ...(channel === 'demo' ? { devCode: code } : {}) });
  }
  if (pathname === '/api/auth/verify-otp' && req.method === 'POST') {
    limited(req, 'verify-otp', 20, 10 * 60_000); const body = await readBody(req, 10_000); const identifier = normalizeIdentifier(body.identifier); const code = text(body.code, 'Giriş kodu', { min: 6, max: 6 });
    const result = await db.transaction(async tx => {
      const challenge = await tx.get('SELECT * FROM otp_challenges WHERE identifier=?', [identifier.value]);
      if (!challenge || Number(challenge.expires_at) < Date.now() || Number(challenge.attempts) >= 5 || !crypto.timingSafeEqual(Buffer.from(hash(code)), Buffer.from(challenge?.code_hash || hash('invalid')))) { if (challenge) await tx.run('UPDATE otp_challenges SET attempts=attempts+1 WHERE identifier=?', [identifier.value]); fail(400, 'Giriş kodu düzgün deyil və ya vaxtı bitib'); }
      await tx.run('DELETE FROM otp_challenges WHERE identifier=?', [identifier.value]);
      let user = await tx.get('SELECT * FROM users WHERE identifier=?', [identifier.value]);
      if (!user) { const role = administrators.has(identifier.value) ? 'admin' : 'buyer'; const userId = uid('user'); await tx.run('INSERT INTO users(id,identifier,identifier_type,role,status,profile,created_at) VALUES(?,?,?,?,?,?,?)', [userId, identifier.value, identifier.type, role, 'active', '{}', now()]); user = await tx.get('SELECT * FROM users WHERE id=?', [userId]); }
      const token = crypto.randomBytes(32).toString('hex'); await tx.run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)', [hash(token), user.id, Date.now() + 30 * 24 * 60 * 60_000]); return { token, user };
    });
    const store = await getStore(db, result.user.id); return send(req, res, 200, { token: result.token, user: publicUser(result.user), store: publicStore(store, true) });
  }
  if (pathname === '/api/auth/me' && req.method === 'GET') { const user = await requireUser(db, req); return send(req, res, 200, { user: publicUser(user), store: publicStore(await getStore(db, user.id), true) }); }
  if (pathname === '/api/auth/logout' && req.method === 'POST') { const token = tokenFrom(req); if (token) await db.run('DELETE FROM sessions WHERE token_hash=?', [hash(token)]); return send(req, res, 200, { ok: true }); }
  if (pathname === '/api/stores' && req.method === 'POST') {
    const user = await requireUser(db, req); const body = await readBody(req); const store = { name: text(body.name, 'Mağaza adı', { min: 2, max: 100 }), city: validCity(body.city), phone: normalizePhone(body.phone), description: text(body.description || '', 'Təsvir', { max: 500 }) }; let row = await getStore(db, user.id);
    if (row) { await db.run('UPDATE stores SET name=?,city=?,phone=?,description=?,status=?,updated_at=? WHERE id=?', [store.name, store.city, store.phone, store.description, row.status === 'active' ? 'pending' : row.status, now(), row.id]); } else { row = { id: uid('store') }; await db.run('INSERT INTO stores(id,owner_id,name,city,phone,description,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)', [row.id, user.id, store.name, store.city, store.phone, store.description, 'pending', now(), now()]); }
    return send(req, res, 200, { store: publicStore(await db.get('SELECT * FROM stores WHERE id=?', [row.id]), true), message: 'Mağaza yoxlama üçün göndərildi' });
  }
  if (pathname === '/api/media/process' && req.method === 'POST') { const user = await requireUser(db, req); const body = await readBody(req, 7_000_000); const result = await uploadImage({ dataUrl: body.dataUrl, removeBackground: body.removeBackground === true, uploadRoot }); await db.run('INSERT INTO media(path,owner_id,size,created_at) VALUES(?,?,?,?)', [result.originalUrl, user.id, result.size, now()]); if (result.processedUrl !== result.originalUrl) await db.run('INSERT INTO media(path,owner_id,size,created_at) VALUES(?,?,?,?)', [result.processedUrl, user.id, result.size, now()]); return send(req, res, 201, result); }
  if (pathname === '/api/products' && req.method === 'POST') {
    const user = await requireUser(db, req); const store = await getStore(db, user.id); if (!store) fail(400, 'Əvvəl mağaza profilini tamamla'); const body = await readBody(req);
    const suppliedImages = Array.isArray(body.images) ? body.images : [{ originalUrl: body.originalUrl, processedUrl: body.processedUrl }];
    if (!suppliedImages.length || suppliedImages.length > 8) fail(400, '1–8 şəkil əlavə et');
    const images = [];
    for (const item of suppliedImages) {
      if (!item || typeof item !== 'object') fail(400, 'Şəkil məlumatı düzgün deyil');
      const originalUrl = text(item.originalUrl || item.original_url || item.processedUrl || item.processed_url || '', 'Şəkil', { min: 1, max: 300 });
      const processedUrl = text(item.processedUrl || item.processed_url || originalUrl, 'Emal olunmuş şəkil', { min: 1, max: 300 });
      for (const mediaPath of new Set([originalUrl, processedUrl])) { if (!mediaPath.startsWith('/media/')) fail(400, 'Şəkil ünvanı düzgün deyil'); if (!await db.get('SELECT path FROM media WHERE path=? AND owner_id=?', [mediaPath, user.id])) fail(403, 'Yalnız özün yüklədiyin şəkildən istifadə edə bilərsən'); }
      images.push({ original_url: originalUrl, ai_processed_url: processedUrl });
    }
    const details = { subtype: text(body.subtype || '', 'Növ', { max: 100 }), material: text(body.material || '', 'Material', { max: 100 }), colors: stringList(body.colors || [], 'Rəng'), sizes: stringList(body.sizes || [], 'Ölçü'), image: images[0].ai_processed_url, images, description: text(body.description || `${store.name} mağazasından yeni məhsul.`, 'Təsvir', { min: 2, max: 1000 }) };
    const product = { id: uid('product'), title: text(body.title, 'Başlıq', { min: 2, max: 160 }), category: text(body.category, 'Kateqoriya', { min: 2, max: 60 }), priceMinor: money(body.price), stock: integer(body.stock ?? 0, 'Stok', 0, 100000) };
    await db.transaction(async tx => { await tx.run('INSERT INTO products(id,store_id,title,category,price_minor,stock,status,details,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)', [product.id, store.id, product.title, product.category, product.priceMinor, product.stock, 'pending', JSON.stringify(details), now(), now()]); for (const [position, image] of images.entries()) await tx.run('INSERT INTO product_images(id,product_id,original_url,ai_processed_url,position,created_at) VALUES(?,?,?,?,?,?)', [uid('image'), product.id, image.original_url, image.ai_processed_url, position, now()]); });
    const row = await db.get(`${productSelect} WHERE p.id=?`, [product.id]); return send(req, res, 201, { product: productView(row), message: 'Məhsul moderasiya üçün göndərildi' });
  }
  if (pathname === '/api/seller/products' && req.method === 'GET') { const user = await requireUser(db, req); const store = await getStore(db, user.id); if (!store) return send(req, res, 200, { products: [] }); return send(req, res, 200, { products: await catalogItems(db, 'WHERE p.store_id=? ORDER BY p.updated_at DESC', [store.id]) }); }
  const sellerProduct = pathname.match(/^\/api\/seller\/products\/([A-Za-z0-9_-]+)$/);
  if (sellerProduct && req.method === 'PATCH') {
    const user = await requireUser(db, req); const store = await getStore(db, user.id); if (!store) fail(404, 'Mağaza tapılmadı'); const body = await readBody(req); const product = await db.get(`${productSelect} WHERE p.id=? AND p.store_id=?`, [sellerProduct[1], store.id]); if (!product) fail(404, 'Məhsul tapılmadı');
    const previous = json(product.details); const details = { ...previous, subtype: body.subtype === undefined ? previous.subtype : text(body.subtype || '', 'Növ', { max: 100 }), material: body.material === undefined ? previous.material : text(body.material || '', 'Material', { max: 100 }), description: body.description === undefined ? previous.description : text(body.description || '', 'Təsvir', { min: 2, max: 1000 }), colors: body.colors === undefined ? previous.colors : stringList(body.colors || [], 'Rəng'), sizes: body.sizes === undefined ? previous.sizes : stringList(body.sizes || [], 'Ölçü') };
    const title = body.title === undefined ? product.title : text(body.title, 'Başlıq', { min: 2, max: 160 }); const category = body.category === undefined ? product.category : text(body.category, 'Kateqoriya', { min: 2, max: 60 }); const priceMinor = body.price === undefined ? product.price_minor : money(body.price); const stock = body.stock === undefined ? product.stock : integer(body.stock, 'Stok', 0, 100000);
    const reviewNeeded = ['title', 'category', 'price', 'description', 'material', 'subtype', 'colors', 'sizes'].some(key => body[key] !== undefined); await db.run('UPDATE products SET title=?,category=?,price_minor=?,stock=?,details=?,status=?,updated_at=? WHERE id=?', [title, category, priceMinor, stock, JSON.stringify(details), reviewNeeded && product.status === 'active' ? 'pending' : product.status, now(), product.id]); return send(req, res, 200, { product: productView(await db.get(`${productSelect} WHERE p.id=?`, [product.id])), message: reviewNeeded ? 'Dəyişiklik moderasiya üçün göndərildi' : 'Stok yeniləndi' });
  }
  if (pathname === '/api/seller/orders' && req.method === 'GET') {
    const user = await requireUser(db, req); const store = await getStore(db, user.id); if (!store) return send(req, res, 200, { orders: [], sales: { orders: 0, units: 0, revenue: 0 } });
    const rows = await db.all('SELECT o.*, i.title,i.quantity,i.unit_price_minor,i.variant FROM orders o JOIN order_items i ON i.order_id=o.id WHERE i.store_id=? ORDER BY o.created_at DESC', [store.id]); const orders = rows.map(row => ({ id: row.id, status: row.status, paymentStatus: row.payment_status, customer: json(row.customer), shipping: json(row.shipping), title: row.title, quantity: Number(row.quantity), total: Number(row.unit_price_minor) * Number(row.quantity) / 100, variant: json(row.variant), createdAt: row.created_at })); const sales = orders.filter(order => !['cancelled', 'payment_failed'].includes(order.status)).reduce((sum, order) => ({ orders: sum.orders + 1, units: sum.units + order.quantity, revenue: sum.revenue + order.total }), { orders: 0, units: 0, revenue: 0 }); return send(req, res, 200, { orders, sales });
  }
  if (pathname === '/api/shipping/quote' && req.method === 'POST') { const body = await readBody(req); const city = validCity(body.shipping?.city); const count = Math.max(1, integer(body.storeCount ?? 1, 'Mağaza sayı', 1, 30)); return send(req, res, 200, { quote: quoteShipping(city, count) }); }
  if (pathname === '/api/orders/quote' && req.method === 'POST') { const user = await requireUser(db, req); const body = await readBody(req); const result = await db.transaction(async tx => orderFromItems(await requestedItems(tx, body.items), body)); return send(req, res, 200, { quote: { currency: 'AZN', subtotalMinor: result.subtotalMinor, shippingMinor: result.shippingMinor, totalMinor: result.totalMinor, subtotal: result.subtotalMinor / 100, shippingAmount: result.shippingMinor / 100, total: result.totalMinor / 100, shipping: result.shipping } }); }
  if (pathname === '/api/orders' && req.method === 'POST') {
    const user = await requireUser(db, req); limited(req, 'order', 20, 10 * 60_000); const requestKey = String(req.headers['idempotency-key'] || ''); if (!/^[A-Za-z0-9._-]{16,200}$/.test(requestKey)) fail(400, 'Sifariş üçün etibarlı idempotency açarı tələb olunur'); const body = await readBody(req); const requestHash = hash(stableStringify(body));
    const existing = await db.get('SELECT * FROM orders WHERE user_id=? AND request_key=?', [user.id, requestKey]); if (existing) { if (existing.request_hash !== requestHash) fail(409, 'Bu idempotency açarı başqa sifariş üçün istifadə olunub'); return send(req, res, 200, { order: publicOrder(existing, await orderItems(db, existing.id)) }); }
    const draft = await db.transaction(async tx => {
      const duplicate = await tx.get('SELECT * FROM orders WHERE user_id=? AND request_key=?', [user.id, requestKey]); if (duplicate) return { duplicate };
      const itemRows = await requestedItems(tx, body.items); const order = orderFromItems(itemRows, body); if (order.paymentMethod === 'card' && !capabilities().payments.card) fail(503, 'Kartla ödəniş hələ aktiv deyil', 'PAYMENT_NOT_CONFIGURED');
      const orderId = uid('order'); const groups = new Map(); for (const item of itemRows) { const storeId = item.product.store_id; groups.set(storeId, [...(groups.get(storeId) || []), item]); }
      const orderRow = [orderId, user.id, requestKey, requestHash, order.subtotalMinor, order.shippingMinor, order.totalMinor, JSON.stringify(order.customer), JSON.stringify(order.shipping), order.paymentMethod, order.paymentMethod === 'cash' ? 'cash_on_delivery' : 'pending', null, null, order.paymentMethod === 'cash' ? 'new' : 'awaiting_payment', now(), now()]; await tx.run('INSERT INTO orders(id,user_id,request_key,request_hash,subtotal_minor,shipping_minor,total_minor,customer,shipping,payment_method,payment_status,payment_session,checkout_url,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', orderRow);
      for (const [storeId, group] of groups) { const shipmentId = uid('shipment'); const subtotal = group.reduce((sum, item) => sum + Number(item.product.price_minor) * item.quantity, 0); await tx.run('INSERT INTO shipments(id,order_id,store_id,shipping_minor,subtotal_minor,status,updated_at) VALUES(?,?,?,?,?,?,?)', [shipmentId, orderId, storeId, Math.floor(order.shippingMinor / groups.size), subtotal, 'new', now()]); for (const item of group) { const updated = await tx.run('UPDATE products SET stock=stock-?,updated_at=? WHERE id=? AND stock>=?', [item.quantity, now(), item.product.id, item.quantity]); if (updated.changes !== 1) fail(409, `${item.product.title} üçün stok dəyişib`, 'OUT_OF_STOCK'); await tx.run('INSERT INTO order_items(id,order_id,shipment_id,product_id,store_id,title,quantity,unit_price_minor,variant) VALUES(?,?,?,?,?,?,?,?,?)', [uid('item'), orderId, shipmentId, item.product.id, storeId, item.product.title, item.quantity, item.product.price_minor, JSON.stringify({ color: item.selectedColor, size: item.selectedSize })]); } }
      return { id: orderId, paymentMethod: order.paymentMethod };
    });
    if (draft.duplicate) return send(req, res, 200, { order: publicOrder(draft.duplicate, await orderItems(db, draft.duplicate.id)) });
    if (draft.paymentMethod === 'card') { try { const order = await db.get('SELECT * FROM orders WHERE id=?', [draft.id]); const checkout = await stripeCheckout({ ...publicOrder(order, await orderItems(db, draft.id)), items: await orderItems(db, draft.id) }); await db.run('UPDATE orders SET payment_session=?,checkout_url=?,payment_status=?,updated_at=? WHERE id=?', [checkout.id, checkout.url, 'checkout_created', now(), draft.id]); } catch (error) { await cancelOrder(db, draft.id, 'payment_setup_failed'); throw error; } }
    const created = await db.get('SELECT * FROM orders WHERE id=?', [draft.id]); return send(req, res, 201, { order: publicOrder(created, await orderItems(db, created.id)) });
  }
  if (pathname === '/api/orders' && req.method === 'GET') { const user = await requireUser(db, req); const rows = await db.all('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', [user.id]); return send(req, res, 200, { orders: await Promise.all(rows.map(async row => publicOrder(row, await orderItems(db, row.id)))) }); }
  const orderMatch = pathname.match(/^\/api\/orders\/([A-Za-z0-9_-]+)$/);
  if (orderMatch && req.method === 'GET') { const user = await requireUser(db, req); const row = await db.get('SELECT * FROM orders WHERE id=?', [orderMatch[1]]); if (!row) fail(404, 'Sifariş tapılmadı'); if (row.user_id !== user.id && user.role !== 'admin') fail(403, 'Bu sifarişə baxmaq icazən yoxdur'); return send(req, res, 200, { order: publicOrder(row, await orderItems(db, row.id)) }); }
  if (orderMatch && req.method === 'PATCH') { const user = await requireUser(db, req); const row = await db.get('SELECT * FROM orders WHERE id=?', [orderMatch[1]]); if (!row) fail(404, 'Sifariş tapılmadı'); const body = await readBody(req); if (body.status !== 'cancelled') fail(400, 'Yalnız ləğv əməliyyatı dəstəklənir'); if (row.user_id !== user.id && user.role !== 'admin') fail(403, 'Bu sifarişi ləğv etmək icazən yoxdur'); if (row.user_id === user.id && !['new', 'awaiting_payment'].includes(row.status)) fail(409, 'Bu sifariş artıq ləğv edilə bilməz'); if (row.payment_session && row.payment_status === 'checkout_created') await expireCheckout(row.payment_session); await cancelOrder(db, row.id, 'cancelled'); const updated = await db.get('SELECT * FROM orders WHERE id=?', [row.id]); return send(req, res, 200, { order: publicOrder(updated, await orderItems(db, row.id)) }); }
  if (pathname === '/api/admin/overview' && req.method === 'GET') { await requireAdmin(db, req); const [stores, products, orders] = await Promise.all([db.get('SELECT COUNT(*) AS count FROM stores WHERE status=?', ['pending']), db.get('SELECT COUNT(*) AS count FROM products WHERE status=?', ['pending']), db.get('SELECT COUNT(*) AS count FROM orders WHERE status IN (?,?)', ['new', 'awaiting_payment'])]); return send(req, res, 200, { pending: { stores: Number(stores.count), products: Number(products.count), orders: Number(orders.count) } }); }
  if (pathname === '/api/admin/pending' && req.method === 'GET') { await requireAdmin(db, req); const [stores, products] = await Promise.all([db.all('SELECT * FROM stores WHERE status=? ORDER BY updated_at ASC', ['pending']), catalogItems(db, 'WHERE p.status=? ORDER BY p.updated_at ASC', ['pending'])]); return send(req, res, 200, { stores: stores.map(row => publicStore(row, true)), products }); }
  const adminStore = pathname.match(/^\/api\/admin\/stores\/([A-Za-z0-9_-]+)$/);
  if (adminStore && req.method === 'PATCH') { const admin = await requireAdmin(db, req); const body = await readBody(req); const status = body.status === 'active' || body.status === 'rejected' ? body.status : fail(400, 'Status düzgün deyil'); const result = await db.run('UPDATE stores SET status=?,updated_at=? WHERE id=?', [status, now(), adminStore[1]]); if (!result.changes) fail(404, 'Mağaza tapılmadı'); await db.run('INSERT INTO audit_log(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', [uid('audit'), admin.id, `store_${status}`, adminStore[1], now()]); return send(req, res, 200, { ok: true }); }
  const adminProduct = pathname.match(/^\/api\/admin\/products\/([A-Za-z0-9_-]+)$/);
  if (adminProduct && req.method === 'PATCH') { const admin = await requireAdmin(db, req); const body = await readBody(req); const status = body.status === 'active' || body.status === 'rejected' ? body.status : fail(400, 'Status düzgün deyil'); const result = await db.run('UPDATE products SET status=?,updated_at=? WHERE id=?', [status, now(), adminProduct[1]]); if (!result.changes) fail(404, 'Məhsul tapılmadı'); await db.run('INSERT INTO audit_log(id,user_id,action,target_id,created_at) VALUES(?,?,?,?,?)', [uid('audit'), admin.id, `product_${status}`, adminProduct[1], now()]); return send(req, res, 200, { ok: true }); }
  if (pathname === '/api/stripe/webhook' && req.method === 'POST') { const raw = await readRawBody(req, 1_000_000); const event = verifyStripeWebhook(raw, req.headers['stripe-signature']); const prior = await db.get('SELECT id FROM webhook_events WHERE id=?', [event.id]); if (prior) return send(req, res, 200, { received: true }); await db.transaction(async tx => { await tx.run('INSERT INTO webhook_events(id,event_type,processed_at) VALUES(?,?,?)', [event.id, event.type, now()]); const orderId = event.data?.object?.metadata?.orderId || event.data?.object?.client_reference_id; if (!orderId) return; if (event.type === 'checkout.session.completed' && event.data.object.payment_status === 'paid') await tx.run('UPDATE orders SET payment_status=?,status=?,updated_at=? WHERE id=?', ['paid', 'paid', now(), orderId]); if (['checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) { const order = await tx.get('SELECT id FROM orders WHERE id=?', [orderId]); if (order) await releaseOrderStock(tx, orderId, 'payment_failed'); } }); return send(req, res, 200, { received: true }); }
  fail(404, 'API endpoint tapılmadı');
}

async function releaseOrderStock(tx, orderId, status) { const current = await tx.get('SELECT * FROM orders WHERE id=?', [orderId]); if (!current || ['cancelled', 'payment_failed'].includes(current.status)) return; const shipments = await tx.all('SELECT * FROM shipments WHERE order_id=?', [orderId]); for (const shipment of shipments) { if (Number(shipment.stock_released)) continue; const items = await tx.all('SELECT product_id,quantity FROM order_items WHERE shipment_id=?', [shipment.id]); for (const item of items) await tx.run('UPDATE products SET stock=stock+?,updated_at=? WHERE id=?', [item.quantity, now(), item.product_id]); await tx.run('UPDATE shipments SET status=?,stock_released=1,updated_at=? WHERE id=?', [status, now(), shipment.id]); } await tx.run('UPDATE orders SET status=?,updated_at=? WHERE id=?', [status, now(), orderId]); }
async function cancelOrder(db, orderId, status) { return db.transaction(tx => releaseOrderStock(tx, orderId, status)); }
async function readRawBody(req, limit) { const chunks = []; let total = 0; for await (const chunk of req) { total += chunk.length; if (total > limit) fail(413, 'Məlumat həcmi çox böyükdür'); chunks.push(chunk); } return Buffer.concat(chunks); }
async function serveFile(req, res, pathname) { if (pathname.startsWith('/media/')) { const name = path.basename(pathname); const record = path.join(uploadRoot, name); if (!fs.existsSync(record)) return send(req, res, 404, 'Tapılmadı'); const ext = path.extname(record).toLowerCase(); if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return send(req, res, 404, 'Tapılmadı'); return send(req, res, 200, fs.readFileSync(record), { 'Content-Type': mimeTypes[ext], 'Cache-Control': 'public, max-age=604800, immutable' }); }
  const relative = pathname === '/' ? 'index.html' : cleanOriginPath(pathname); const target = path.resolve(staticRoot, relative); if (!target.startsWith(staticRoot + path.sep) && target !== path.join(staticRoot, 'index.html')) return send(req, res, 403, 'Qadağandır'); if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return send(req, res, 404, 'Tapılmadı'); return send(req, res, 200, fs.readFileSync(target), { 'Content-Type': mimeTypes[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control': path.extname(target) === '.html' ? 'no-store' : 'public, max-age=3600' });
}

fs.mkdirSync(uploadRoot, { recursive: true });
const db = await openDatabase({ dataDir }); await seedCategories(db); await importLegacyJson(db); await seedDatabase(db); await seedDemoCatalog(db);
const server = http.createServer(async (req, res) => {
  try { if (!isAllowedOrigin(req.headers.origin)) return send(req, res, 403, { error: 'Bu ünvanın girişinə icazə yoxdur' }); if (req.method === 'OPTIONS') { res.writeHead(204, baseHeaders(req, { 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, Stripe-Signature', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS' })); return res.end(); } const url = new URL(req.url, publicUrl); if (url.pathname.startsWith('/api/')) return await api(db, req, res, url); return await serveFile(req, res, url.pathname); } catch (error) { const status = error instanceof ApiError ? error.status : 500; if (status >= 500) console.error(error); return send(req, res, status, { error: error.message || 'Server xətası', ...(error.code ? { code: error.code } : {}) }); }
});
server.listen(port, '0.0.0.0', () => console.log(`Yerli server: ${publicUrl}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => db.close().finally(() => process.exit(0))));
