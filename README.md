# Yerli marketplace

Yerli Azərbaycan mağazaları üçün mobil uyğun alış-veriş platformasıdır. Alıcı məhsulu, qiyməti və mağazanı bir yerdə tapır; mağaza sahibi kabinetdən profilini və məhsullarını göndərir; admin isə yeni mağaza və məhsulları təsdiqləyir.

## Canlı ünvanlar

- Sayt: <https://elnur-admin.github.io/yerli-marketplace/>
- Hazırkı backend: <https://yerli-api.onrender.com/api/health>
- GitHub repo: <https://github.com/elnur-admin/yerli-marketplace>

Frontend GitHub Pages-də, backend Render Free-də işləyir. Render Free 15 dəqiqə fəaliyyətsizlikdən sonra yatdığından ilk sorğu gec açıla bilər; lokal disk qalıcı deyil.

## Hazır olanlar

- Alıcı kataloqu, axtarış, filtr, məhsul detalı, səbət və mobil görünüş.
- Mağaza açma, məhsul əlavəetmə/redaktə/stok idarəsi və satış göstəriciləri olan mağaza kabineti.
- SQLite və `DATABASE_URL` veriləndə Postgres ilə işləyən məlumat bazası.
- Təhlükəsiz OTP: 5 dəqiqə vaxt, 5 cəhd limiti, yenidən göndərmə fasiləsi və sorğu limiti.
- Serverdə hesablanan qiymət və çatdırılma, stokun transaksiyada azalması, ləğvdə bir dəfə bərpası.
- İdempotent sifariş yaratma: təkrar sorğu eyni sifarişə bağlanır.
- Alıcı, mağaza sahibi və admin üçün server icazələri.
- Admin paneli ilə mağaza/məhsul təsdiqi və rəddi; yalnız təsdiqlənənlər alıcı kataloqunda görünür.
- Şəkil yükləməsi üçün ölçü, format və məzmun yoxlaması; şəkil təhlükəsiz WEBP formatına çevrilir.
- Hər məhsul üçün 1–8 orijinal və emal olunmuş şəkil ayrıca saxlanılır; məhsul detalında şəkillər arasında keçid var.
- Privacy, istifadə şərtləri, çatdırılma və qaytarma üçün ilkin modal mətnlər.
- Stripe Checkout və imzalı webhook üçün hazır axın. Konfiqurasiya yoxdursa kart sifarişi yaranmır.

## Qovluqlar

```text
dist/                 Frontend, dizayn və mobil görünüş
server/server.mjs     API və statik fayl serveri
server/db.mjs         SQLite/Postgres adapteri
server/providers.mjs  OTP, Stripe və şəkil adapterləri
migrations/           Məlumat bazası sxemi
test/                 İzolyasiya olunmuş backend testləri
data/                 Lokal SQLite və şəkillər; git-ə daxil edilmir
```

## Lokal işə salma

Node.js 24 tələb olunur.

```powershell
pnpm install
$env:DEMO_MODE='true'
pnpm start
```

Sonra <http://127.0.0.1:4173> ünvanını aç. Demo OTP yalnız production olmayan mühitdə işləyir və kodu test üçün API cavabına yazır; real email və SMS göndərmir.

## Production ayarları

Render Environment bölməsində ən azı bunları yaz:

```text
NODE_ENV=production
PUBLIC_URL=https://yerli-api.onrender.com
ALLOW_ORIGIN=https://elnur-admin.github.io
DATABASE_URL=postgresql://...
SEED_DEMO=false
ENABLE_CASH=true
ADMIN_IDENTIFIERS=admin@sənin-domenin.az
```

Real email üçün `RESEND_API_KEY` və `RESEND_FROM`, SMS üçün `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` əlavə edilir. Production-da bu provayderlər olmadan OTP sorğusu uğursuz olur; demo kod heç vaxt qaytarılmır.

Kartla ödəniş üçün aşağıdakılar da lazımdır:

```text
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
ENABLE_STRIPE=true
STRIPE_MERCHANT_CONFIRMED=true
```

## API

```text
GET   /api/health
GET   /api/products
GET   /api/categories
POST  /api/auth/request-otp
POST  /api/auth/verify-otp
GET   /api/auth/me
POST  /api/auth/logout
POST  /api/stores
POST  /api/media/process
POST  /api/products
GET   /api/seller/products
PATCH /api/seller/products/:id
GET   /api/seller/orders
POST  /api/orders/quote
POST  /api/orders
GET   /api/orders
GET   /api/orders/:id
PATCH /api/orders/:id
GET   /api/admin/overview
GET   /api/admin/pending
PATCH /api/admin/stores/:id
PATCH /api/admin/products/:id
POST  /api/stripe/webhook
```

## Hələ xarici addım tələb edən işlər

1. Postgres, obyekt storage və backup üçün hesabları yaratmaq və Render secret-lərini əlavə etmək.
2. Resend/Twilio göndərən identikliyini təsdiqləmək.
3. Stripe hesabı, webhook ünvanı və biznes məlumatlarını təsdiqləmək.
4. Yerli kuryer tərəfdaşını və sifariş izləmə qaydalarını seçmək.
5. Privacy policy, istifadə şərtləri, çatdırılma və qaytarma qaydalarını hüquqi olaraq təsdiqləmək.
6. Bu versiyanı GitHub/Render-ə deploy etmək.

## Yoxlama

```powershell
pnpm check
pnpm test
```

`pnpm test` ayrı server prosesləri başladır. Bəzi məhdud Windows sandbox-larında bu prosesə icazə verilmədiyi üçün test əmri `spawn EPERM` verə bilər; həmin halda API ssenariləri ayrıca lokal serverlə yoxlanmalıdır.
