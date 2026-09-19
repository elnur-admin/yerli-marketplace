# Yerli marketplace

Yerli Azərbaycanın mağazalarını, məhsullarını və sifarişlərini bir platformada birləşdirən mobil uyğun marketplace-dir. Alıcı məhsulları axtara, mağazaya baxa, səbət yarada və sifariş göndərə bilər; mağaza isə profilini və məhsullarını təqdim edir.

## Canlı ünvanlar

- Sayt: <https://elnur-admin.github.io/yerli-marketplace/>
- Backend sağlamlıq yoxlaması: <https://yerli-api.onrender.com/api/health>
- GitHub repo: <https://github.com/elnur-admin/yerli-marketplace>

## Hazırda tamamlanan işlər

- [x] GitHub repo yaradıldı və layihə ora göndərildi.
- [x] GitHub Pages ilə pulsuz canlı sayt yayımlandı.
- [x] Mobil və desktop görünüşü, məhsul kataloqu, axtarış, kateqoriya, filtr və sıralama hazırdır.
- [x] Məhsul detalı, səbət, checkout və mağaza təqdimetmə axınları hazırdır.
- [x] Kataloqdakı demo məhsullar real foto URL-ləri ilə göstərilir; ikon kimi görünən məhsul şəkilləri düzəldilib.
- [x] Render Free üzərində Node.js backend yayımlandı.
- [x] GitHub Pages frontend-i Render API-yə qoşuldu.
- [x] OTP sorğusu, OTP təsdiqi, sessiya, mağaza, məhsul, media, çatdırılma hesablaması və sifariş endpoint-ləri hazırdır.
- [x] Sifarişlər serverə yazılır, şəhərə görə çatdırılma haqqı və təxmini müddət hesablanır.
- [x] Şəkil yükləmə üçün server storage axını və əlavə remove.bg inteqrasiyası hazırdır.
- [x] Stripe açarı veriləndə Checkout sessiyası yaradıla bilir; açar olmadıqda qapıda ödəniş seçimi qalır.
- [x] GitHub Pages build/deploy prosesi işləyir.

## Layihə quruluşu

```text
dist/index.html     Frontend səhifəsi və API config
dist/app.js         Kataloq, səbət, checkout və UI məntiqi
dist/styles.css     Dizayn və responsive görünüş
dist/assets/        Lokal şəkil və vizual aktivlər
server.mjs          Backend API və statik fayl serveri
package.json        npm start skripti
render.yaml         Render deploy ayarları
data/db.json        Demo məlumat bazası (lokal/keçid mərhələsi)
data/uploads/       Yüklənən şəkillər (lokal/keçid mərhələsi)
```

## Lokal işə salma

Node.js 18 və ya daha yeni versiya tələb olunur.

```powershell
npm install
npm start
```

Sonra <http://127.0.0.1:4173> ünvanını aç. Server ilk açılışda `data/db.json` və `data/uploads/` qovluqlarını yaradır.

Provider açarları verilməyən demo mühitində OTP kodu API cavabında `devCode` kimi qaytarılır və ekranda göstərilir. Bu yalnız test üçündür.

## Render deploy ayarları

Render servisinin hazırkı quruluşu:

```text
Build command: npm install
Start command: npm start
Plan: Free
Health check: /api/health
```

Hazırda Render-də frontend üçün aşağıdakı dəyərlər istifadə olunur:

```text
NODE_ENV=production
ALLOW_ORIGIN=https://elnur-admin.github.io
DEV_OTP=true
```

Frontend `dist/index.html` daxilində `window.YERLI_API_BASE` ilə `https://yerli-api.onrender.com` ünvanına qoşulur. Lokal işə salmada bu dəyər boş qalır və `/api/*` eyni serverdən işləyir.

## Production dəyişənləri

Real xidmətləri aktivləşdirmək üçün Render Environment bölməsinə bunları əlavə etmək lazımdır:

```text
NODE_ENV=production
PUBLIC_URL=https://yerli-api.onrender.com
ALLOW_ORIGIN=https://elnur-admin.github.io
RESEND_API_KEY=...
RESEND_FROM=Yerli <noreply@sənin-domenin.az>
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+994...
REMOVEBG_API_KEY=...
STRIPE_SECRET_KEY=...
```

`DEV_OTP=true` real istifadəçilər üçün təhlükəsiz deyil. Resend və ya Twilio qoşulduqdan sonra bu dəyişəni silmək və ya `false` etmək lazımdır.

## API xəritəsi

```text
GET  /api/health
GET  /api/products
POST /api/auth/request-otp
POST /api/auth/verify-otp
GET  /api/auth/me
POST /api/auth/logout
POST /api/stores
POST /api/media/process
POST /api/products
POST /api/shipping/quote
POST /api/orders
GET  /api/orders
```

## Qalan işlər və görüləcək addımlar

### 1. Real email və SMS girişini aktivləşdirmək

1. Resend hesabı və göndərən domeni yarat.
2. `RESEND_API_KEY`, `RESEND_FROM` dəyişənlərini Render-ə əlavə et.
3. SMS də tələb olunursa Twilio hesabı, telefon nömrəsi və `TWILIO_*` dəyişənlərini əlavə et.
4. `DEV_OTP` dəyişənini sil və ya `false` et.
5. Gmail, başqa email və Azərbaycan telefon nömrəsi ilə OTP testləri apar.

### 2. JSON məlumat bazasını real database ilə əvəz etmək

1. Pulsuz başlanğıc üçün Supabase Postgres layihəsi yarat.
2. `users`, `sessions`, `stores`, `products`, `orders` və `order_items` cədvəllərini yarat.
3. `server.mjs`-də JSON oxuma/yazma hissəsini Postgres sorğuları ilə əvəz et.
4. Məlumat köçürməsi, indekslər, backup və silinmə qaydalarını əlavə et.

### 3. Şəkilləri qalıcı storage-a keçirmək

1. Supabase Storage, Cloudinary və ya S3 tipli storage seç.
2. Public/private bucket və CDN ünvanı yarat.
3. Original və işlənmiş şəkilləri həmin storage-a yaz.
4. `data/uploads/`-dan asılılığı aradan qaldır və silinmiş məhsul şəkillərini təmizlə.

### 4. Real background removal qoşmaq

1. remove.bg hesabı və API açarı yarat.
2. `REMOVEBG_API_KEY`-i Render secret kimi əlavə et.
3. Upload zamanı fayl ölçüsü, format, timeout və API limiti yoxlamalarını et.
4. Həm original, həm də şəffaf PNG nəticəsini storage-da saxla.

### 5. Ödəniş və sifariş statuslarını tamamlamaq

1. Stripe hesabı və canlı secret key yarat.
2. Ödənişdən əvvəl backend-də Checkout sessiyası yarat.
3. Stripe webhook əlavə edib `paid`, `failed`, `refunded` statuslarını serverdə yenilə.
4. Mağazaya yeni sifariş bildirişi, ləğv və geri qaytarma axınlarını əlavə et.

### 6. Çatdırılmanı real xidmətə bağlamaq

1. İlk mərhələdə admin panelindən şəhər və tarif cədvəli idarə et.
2. Sonra yerli kuryer şirkəti API-si seç və inteqrasiya et.
3. Ünvanın xəritə/geocoding yoxlamasını əlavə et.
4. Sifariş statusları və izləmə nömrəsini alıcıya göstər.

### 7. Mağaza kabineti və idarəetmə paneli

1. Mağaza sahibinin məhsul əlavə etmə, redaktə və stok dəyişmə ekranını qur.
2. Mağaza məlumatlarının təsdiqi və moderator statusunu əlavə et.
3. Sifarişlər, satışlar və əsas analitika səhifəsini əlavə et.
4. Email/SMS bildirişlərini mağaza və alıcı üçün aktivləşdir.

### 8. Təhlükəsizlik və istehsala hazırlıq

1. OTP və sifariş endpoint-lərinə rate limit əlavə et.
2. Bütün input-ları yoxla, fayl formatı və ölçüsünü məhdudlaşdır.
3. Secret-ləri yalnız Render Environment/secret manager-də saxla.
4. Privacy policy, istifadə şərtləri, qaytarma və çatdırılma qaydalarını yaz.
5. Custom domain, HTTPS, error logging, uptime monitor və backup qur.

## Hazırkı MVP məhdudiyyətləri

- Render Free servisi istifadə olunmadıqda yata bilər; ilk sorğu gecikə bilər.
- JSON database və lokal upload qovluğu demo/keçid mərhələsi üçündür; servis yenidən başladıqda qalıcı storage zəmanəti yoxdur.
- `DEV_OTP=true` yalnız test üçündür.
- Real email/SMS, qalıcı database, qalıcı image CDN, canlı ödəniş webhook-u, kuryer API-si və admin paneli növbəti mərhələlərdir.
