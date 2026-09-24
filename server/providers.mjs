import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fail, uid } from './helpers.mjs';

const enabled = name => process.env[name] === 'true';
export const demoMode = process.env.NODE_ENV !== 'production' && enabled('DEMO_MODE');
export const cardEnabled = () => enabled('ENABLE_STRIPE') && enabled('STRIPE_MERCHANT_CONFIRMED') && !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET && !!process.env.PUBLIC_URL;
export function capabilities() { return { demoMode, otp: { email: !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM), sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM), demo: demoMode }, payments: { cash: process.env.ENABLE_CASH !== 'false', card: cardEnabled() }, uploads: true }; }
async function providerFetch(url, options, errorMessage) { let response; try { response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) }); } catch { fail(503, errorMessage, 'PROVIDER_UNAVAILABLE'); } if (!response.ok) fail(503, errorMessage, 'PROVIDER_UNAVAILABLE'); return response; }
export async function deliverOtp(identifier, code) {
  if (demoMode) return 'demo'; // Demo never contacts providers, even if credentials are inherited.
  if (identifier.type === 'email' && process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
    await providerFetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM, to: [identifier.value], subject: 'Yerli giriş kodun', text: `Yerli giriş kodun: ${code}. Kod 5 dəqiqə keçərlidir. Bu kodu heç kimlə paylaşma.` }) }, 'Email xidməti hazırda əlçatan deyil');
    return 'email';
  }
  if (identifier.type === 'sms' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
    const body = new URLSearchParams({ To: identifier.value, From: process.env.TWILIO_FROM, Body: `Yerli giriş kodun: ${code}. Kod 5 dəqiqə keçərlidir.` });
    await providerFetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(process.env.TWILIO_ACCOUNT_SID)}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body }, 'SMS xidməti hazırda əlçatan deyil');
    return 'sms';
  }
  fail(503, 'Bu giriş üsulu hələ aktiv deyil. Xidmət provayderi qoşulmalıdır.', 'OTP_NOT_CONFIGURED');
}
export async function stripeCheckout(order) {
  if (!cardEnabled()) fail(503, 'Kartla ödəniş hələ aktiv deyil', 'PAYMENT_NOT_CONFIGURED');
  const base = process.env.PUBLIC_URL.replace(/\/$/, '');
  const params = new URLSearchParams({ mode: 'payment', success_url: `${base}/?order=${order.id}&status=return`, cancel_url: `${base}/?order=${order.id}&status=cancelled`, 'metadata[orderId]': order.id, client_reference_id: order.id, expires_at: String(Math.floor(Date.now() / 1000) + 1800) });
  order.items.forEach((item, index) => { params.set(`line_items[${index}][quantity]`, String(item.quantity)); params.set(`line_items[${index}][price_data][currency]`, 'azn'); params.set(`line_items[${index}][price_data][unit_amount]`, String(item.unitPriceMinor)); params.set(`line_items[${index}][price_data][product_data][name]`, item.title); });
  if (order.shippingMinor) { const i = order.items.length; params.set(`line_items[${i}][quantity]`, '1'); params.set(`line_items[${i}][price_data][currency]`, 'azn'); params.set(`line_items[${i}][price_data][unit_amount]`, String(order.shippingMinor)); params.set(`line_items[${i}][price_data][product_data][name]`, 'Mağazalar üzrə çatdırılma'); }
  const response = await providerFetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': order.id }, body: params }, 'Ödəniş sessiyası yaradıla bilmədi. Sifarişin ödənişini yenidən yoxla.');
  const result = await response.json();
  if (typeof result.id !== 'string' || !String(result.url).startsWith('https://checkout.stripe.com/')) fail(502, 'Ödəniş xidmətindən etibarsız cavab alındı');
  return { id: result.id, url: result.url };
}
export async function expireCheckout(sessionId) {
  const response = await providerFetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/expire`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } }, 'Ödəniş sessiyası bağlana bilmədi. Sifarişin statusunu yenidən yoxla.');
  const session = await response.json(); if (session.status !== 'expired') fail(409, 'Ödəniş sessiyası hələ aktivdir');
}
export function verifyStripeWebhook(raw, signature) {
  if (!cardEnabled()) fail(503, 'Ödəniş xidməti aktiv deyil');
  const parts = String(signature || '').split(',').map(x => x.split('='));
  const timestamp = parts.find(x => x[0] === 't')?.[1];
  if (!/^\d+$/.test(timestamp || '') || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) fail(400, 'Webhook imzası düzgün deyil');
  const digest = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.`).update(raw).digest();
  const valid = parts.filter(x => x[0] === 'v1' && /^[a-f0-9]{64}$/i.test(x[1])).some(x => crypto.timingSafeEqual(digest, Buffer.from(x[1], 'hex')));
  if (!valid) fail(400, 'Webhook imzası düzgün deyil');
  try { return JSON.parse(raw.toString('utf8')); } catch { fail(400, 'Webhook JSON düzgün deyil'); }
}
function decodeImage(dataUrl) {
  const match = typeof dataUrl === 'string' && dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) fail(400, 'Yalnız PNG, JPEG və WEBP şəkilləri qəbul edilir');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) fail(400, 'Şəkil 5 MB-dan kiçik olmalıdır');
  const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
  if (!(png || jpeg || webp) || (match[1] === 'png' && !png) || (/jpe?g/.test(match[1]) && !jpeg) || (match[1] === 'webp' && !webp)) fail(400, 'Şəklin məzmunu formatına uyğun deyil');
  return bytes;
}
async function cleanImage(bytes) {
  const { default: sharp } = await import('sharp');
  try {
    const input = sharp(bytes, { limitInputPixels: 25000000, failOn: 'warning', animated: false });
    const info = await input.metadata();
    if (!['png','jpeg','webp'].includes(info.format) || !info.width || !info.height || info.width > 10000 || info.height > 10000 || (info.pages || 1) > 1) fail(400, 'Şəkil ölçüləri və ya formatı uyğun deyil');
    return await input.rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true}).webp({quality:84}).toBuffer();
  } catch (error) { if (error.status) throw error; fail(400, 'Şəkil oxuna bilmədi. Başqa PNG, JPG və ya WEBP seç.'); }
}
export async function uploadImage({ dataUrl, uploadRoot }) {
  const input = await cleanImage(decodeImage(dataUrl));
  const originalName = `${uid('image')}.webp`;
  fs.writeFileSync(path.join(uploadRoot, originalName), input, { flag: 'wx' });
  const originalUrl = `/media/${originalName}`;
  return { originalUrl, processedUrl: originalUrl, size: input.length, provider: 'storage' };
}
