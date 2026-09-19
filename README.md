# Yerli marketplace

Yerli Azərbaycanın mağazalarını, məhsullarını və sifarişlərini bir server kataloqunda birləşdirən mobil-first marketplace tətbiqidir.

## Hazır olan axınlar

- Email və ya SMS OTP ilə server tərəfli hesab və 30 günlük sessiya.
- Mağaza profili və məhsullar JSON məlumat bazasında serverdə saxlanılır.
- Məhsul şəkilləri server storage-a yüklənir. `REMOVEBG_API_KEY` veriləndə remove.bg ilə real background removal işləyir.
- Sifariş checkout forması ilə serverə yazılır; şəhərə görə kuryer tarifi və çatdırılma müddəti hesablanır.
- Kart ödənişi üçün `STRIPE_SECRET_KEY` qoşulduqda Stripe Checkout sessiyası yaradılır. Açarsız halda qapıda nağd ödəniş aktivdir.
- Demo kataloq sayt görünüşü ilə eyni real məhsul fotolarını göstərir; mağazaların yeni şəkilləri server storage-a yüklənir.

## Lokal işə salma

Node.js 18+ tələb olunur.

```powershell
node work/server.mjs
```

Sonra `http://127.0.0.1:4173` ünvanını aç. Server ilk açılışda `data/db.json` və `data/uploads/` qovluqlarını yaradır.

Demo mühitində OTP provider açarı olmadan kod API cavabında `devCode` kimi qaytarılır və ekranda göstərilir. Production-da real email üçün `RESEND_API_KEY` və `RESEND_FROM`, SMS üçün `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` dəyişənlərini ver.

## Production dəyişənləri

```text
NODE_ENV=production
PUBLIC_URL=https://api.example.com
ALLOW_ORIGIN=https://elnur-admin.github.io
RESEND_API_KEY=...
RESEND_FROM=Yerli <noreply@example.com>
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+994...
REMOVEBG_API_KEY=...
STRIPE_SECRET_KEY=...
```

GitHub Pages yalnız statik interfeysi yayımlayır. Frontend-i ayrıca API serverinə bağlamaq üçün səhifəni açmazdan əvvəl `window.YERLI_API_BASE = "https://api.example.com"` dəyərini verən kiçik config script-i əlavə et və ya eyni domen altında reverse proxy istifadə et. Lokal serverdə bu dəyər boş saxlanılır və `/api/*` birbaşa işləyir.

## API xəritəsi

`GET /api/products`, `POST /api/auth/request-otp`, `POST /api/auth/verify-otp`, `GET /api/auth/me`, `POST /api/stores`, `POST /api/media/process`, `POST /api/products`, `POST /api/shipping/quote`, `POST /api/orders` və `GET /api/orders` endpoint-ləri tətbiqin əsas axınlarını təmin edir.
