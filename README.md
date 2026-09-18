# Yerli marketplace MVP

Yerli Azərbaycandakı mağazaların məhsullarını bir kataloqda təqdim edən, mobil-first marketplace prototipidir. Bu MVP-də mağaza sahibi profil yarada, məhsul şəklini AI Studio axınından keçirə, məhsul məlumatlarını daxil edib yayımlaya bilər. Alıcılar axtarış və birgə filtrlərlə məhsul tapır, detallara baxır və səbətə əlavə edir.

## Lokal işə salma

Layihə statik fayllardan ibarətdir və əlavə paket tələb etmir.

```text
node work/server.mjs
```

Sonra `http://127.0.0.1:4173` ünvanını aç.

## Məlumat və mühit dəyişənləri

MVP brauzer `localStorage`-ından istifadə edir. Server, verilənlər bazası, giriş sistemi və ayrıca mühit dəyişəni tələb olunmur. `yerli_products`, `yerli_cart`, `yerli_store` və `yerli_favorites` açarları ilə saxlanan məlumatlar yalnız həmin brauzerdə qalır.

## AI Studio

Hazırkı demo brauzerdə işləyən şəkil emalı pipeline-ıdır: orijinal fayl ayrıca saxlanılır, nəticə isə neytral fonda yerləşdirilmiş ikinci şəkil kimi yaradılır. Real istifadədə bu modulun `makeStudioImage` funksiyası background-removal API-si ilə əvəzlənə bilər. Arxa fonun silinməsi üçün remove.bg kimi ixtisaslaşmış servis və ya OpenAI Images API image edit axını seçilə bilər; remove.bg məhsul obyektinin maskalanması üçün sadə API, OpenAI isə daha çevik generativ düzəliş imkanı verir.

## Bilinən məhdudiyyətlər

- Giriş, email/SMS OTP və mağaza məlumatları hələ serverdə deyil; demo lokal brauzer yaddaşındadır.
- Sifariş göndərilməsi MVP-də mağazaya telefon əlaqəsi üçün sadə forma kimi modelləşdirilib; ödəniş və çatdırılma inteqrasiyası əlavə edilməlidir.
- Məhsul şəkilləri hazırda brauzerdə emal olunur və real background-removal servisi ilə əvəzlənməlidir.
- Şəkil kataloqunda nümunə məhsullar Unsplash şəkillərindən istifadə edir; istehsalda mağazaların öz storage/CDN-i qoşulmalıdır.
