# KuryeCrm — Faz 2 Raporu

> Bu doküman Faz 2'de yapılan her şeyi içerir. Devam edecek geliştirici/araç
> (ör. Codex) önce [FAZ_1_RAPOR.md](FAZ_1_RAPOR.md) ardından bu dosyayı
> okumalıdır. Faz 1 altyapısı (auth, JWT, rol guard, panel iskeleti, Prisma,
> env yapısı) **korunarak** üzerine inşa edilmiştir.

**Tarih:** 2026-06-23
**Faz:** 2 — Admin panelinden Restoran & Kurye yönetimi (gerçek CRUD)
**Durum:** ✅ Tamamlandı ve uçtan uca test edildi.

---

## 1. Faz 2'de Yapılan İşler

Faz 2'nin amacı: Admin panelindeki "Restoranlar" ve "Kuryeler" sayfalarını
**gerçek CRUD** yapısına çevirmek. Restoran/kurye oluşturulurken otomatik olarak
ilgili **User** hesabı da açılır, böylece bu kullanıcılar kendi e-posta/şifresiyle
login olabilir.

Yapılanlar:

1. ✅ Backend'de **Restoran yönetimi** endpoint'leri (liste, detay, ekleme,
   düzenleme, aktif/pasif).
2. ✅ Backend'de **Kurye yönetimi** endpoint'leri (liste, detay, ekleme,
   düzenleme, aktif/pasif).
3. ✅ Restoran/kurye oluşturulurken **User + profil** tek transaction'da
   oluşturulur (`role = RESTAURANT` / `role = COURIER`).
4. ✅ Şifreler **bcrypt** ile hash'lenir (cost 10). Düz şifre saklanmaz.
5. ✅ **E-posta unique** kontrolü; çakışmada anlamlı `409` mesajı döner.
6. ✅ **Hard delete YOK** — sadece aktif/pasif (soft) sistemi.
7. ✅ Aktif/pasif değişince hem profil (`Restaurant`/`Courier`) hem bağlı
   `User.isActive` **senkron** güncellenir → pasif kullanıcı **login olamaz**.
8. ✅ Düzenlemede şifre **opsiyonel** — boş bırakılırsa değişmez, doluysa yeniden
   hash'lenir.
9. ✅ Tüm yönetim endpoint'leri **JWT + `@Roles(ADMIN)`** ile korunur;
   RESTAURANT/COURIER **403** alır.
10. ✅ Frontend: Admin sidebar menüsüne **Dashboard / Restoranlar / Kuryeler**
    linkleri (gerçek route navigasyonu).
11. ✅ Frontend: **Restoranlar** sayfası — tablo, arama, aktif/pasif filtre,
    modal form (ekle/düzenle), aktif/pasif butonu.
12. ✅ Frontend: **Kuryeler** sayfası — aynı yetenekler.
13. ✅ Saatlik ücret backend'de **Decimal**, frontend'de **TL** formatında
    gösterilir (`Intl.NumberFormat('tr-TR')`).
14. ✅ Bu rapor (`docs/FAZ_2_RAPOR.md`).

**Veritabanı:** Yeni model EKLENMEDİ. Mevcut `User`, `Restaurant`, `Courier`
ilişkileri korundu; yeni migration gerekmedi.

---

## 2. Eklenen Backend Endpoint'leri

Tümü `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)` ile korunur.

### Restoran yönetimi
| Method | Yol | Açıklama |
|---|---|---|
| `GET`   | `/admin/restaurants` | Listele (query: `search`, `status`) |
| `GET`   | `/admin/restaurants/:id` | Tek restoran detayı |
| `POST`  | `/admin/restaurants` | Yeni restoran + User oluştur |
| `PATCH` | `/admin/restaurants/:id` | Restoran + User güncelle |
| `PATCH` | `/admin/restaurants/:id/status` | Aktif/pasif yap |

### Kurye yönetimi
| Method | Yol | Açıklama |
|---|---|---|
| `GET`   | `/admin/couriers` | Listele (query: `search`, `status`) |
| `GET`   | `/admin/couriers/:id` | Tek kurye detayı |
| `POST`  | `/admin/couriers` | Yeni kurye + User oluştur |
| `PATCH` | `/admin/couriers/:id` | Kurye + User güncelle |
| `PATCH` | `/admin/couriers/:id/status` | Aktif/pasif yap |

**Liste query parametreleri:**
- `search` → ad / yetkili / telefon / e-posta içinde arama (case-insensitive).
- `status` → `active` | `passive` | `all` (varsayılan: hepsi).

**Yanıt formatı (örnek restoran):**
```json
{
  "id": "uuid",
  "name": "Pizza Plus",
  "authorizedPerson": "Ali Veli",
  "phone": "05551112233",
  "address": "Test Mah.",
  "hourlyRate": "150.5",
  "isActive": true,
  "email": "pizzaplus@kuryecrm.local",
  "userId": "uuid",
  "createdAt": "...",
  "updatedAt": "..."
}
```
> Not: `passwordHash` yanıtlarda **asla** dönmez.

---

## 3. Eklenen / Güncellenen Frontend Sayfaları

### Yeni sayfalar
| Yol | Bileşen | Erişim |
|---|---|---|
| `/admin/restaurants` | `pages/admin/RestaurantsPage.tsx` | Sadece ADMIN |
| `/admin/couriers` | `pages/admin/CouriersPage.tsx` | Sadece ADMIN |

Her iki sayfada:
- Tablo listeleme + boş/yükleniyor durumları
- Arama kutusu (250ms debounce)
- Aktif / Pasif / Tümü filtresi
- "Yeni ... Ekle" butonu → modal form
- Satır başına "Düzenle" ve "Pasife Al / Aktif Et" butonları
- Modal form hem ekleme hem düzenleme için; düzenlemede şifre opsiyonel
- Backend hata mesajları (409 / 400 / validation dizileri) forma yansıtılır

**Restoran tablo sütunları:** Restoran adı · Yetkili kişi · Telefon · Saatlik
ücret (TL) · Durum · İşlemler

**Kurye tablo sütunları:** Kurye adı · Telefon · Saatlik ücret (TL) · Durum ·
İşlemler

### Sidebar menüsü
Admin panelinde ortak sidebar artık gerçek route linkleri içerir:
**Dashboard** (`/admin`) · **Restoranlar** (`/admin/restaurants`) ·
**Kuryeler** (`/admin/couriers`). Aktif route otomatik vurgulanır (turuncu).

---

## 4. Güncellenen / Eklenen Dosyalar

**Backend (eklenen):**
```
backend/src/admin/dto/create-restaurant.dto.ts
backend/src/admin/dto/update-restaurant.dto.ts
backend/src/admin/dto/create-courier.dto.ts
backend/src/admin/dto/update-courier.dto.ts
backend/src/admin/dto/update-status.dto.ts
backend/src/admin/dto/list-query.dto.ts
backend/src/admin/restaurants/admin-restaurants.controller.ts
backend/src/admin/restaurants/admin-restaurants.service.ts
backend/src/admin/couriers/admin-couriers.controller.ts
backend/src/admin/couriers/admin-couriers.service.ts
```
**Backend (güncellenen):**
```
backend/src/admin/admin.module.ts   # yeni controller + service kaydı
```

**Frontend (eklenen):**
```
frontend/src/pages/admin/RestaurantsPage.tsx
frontend/src/pages/admin/CouriersPage.tsx
frontend/src/components/admin/AdminLayout.tsx
frontend/src/components/admin/ListToolbar.tsx
frontend/src/components/admin/StatusBadge.tsx
frontend/src/components/admin/Field.tsx
frontend/src/components/Modal.tsx
frontend/src/lib/adminApi.ts
frontend/src/lib/format.ts
```
**Frontend (güncellenen):**
```
frontend/src/components/DashboardLayout.tsx   # NavLink ile route navigasyonu
frontend/src/pages/AdminPage.tsx              # AdminLayout kullanımı
frontend/src/pages/RestaurantPage.tsx         # navItem.to
frontend/src/pages/CourierPage.tsx            # navItem.to
frontend/src/types/index.ts                   # AdminRestaurant, AdminCourier, StatusFilter
frontend/src/App.tsx                          # /admin/restaurants, /admin/couriers route'ları
```

---

## 5. Kullanılan DTO Yapıları

**CreateRestaurantDto:** `name*`, `authorizedPerson*`, `phone*`, `address?`,
`hourlyRate*` (≥0), `email*` (email), `password*` (min 6), `isActive?`.

**UpdateRestaurantDto:** Hepsi opsiyonel. `password?` (boş → değişmez),
`email?` (değişirse unique kontrol), `hourlyRate?` (≥0).

**CreateCourierDto:** `name*`, `phone*`, `hourlyRate*` (≥0), `email*`,
`password*` (min 6), `isActive?`.

**UpdateCourierDto:** Hepsi opsiyonel (restoran ile aynı mantık).

**UpdateStatusDto:** `isActive` (boolean, zorunlu).

**ListQueryDto:** `search?`, `status?` (`active|passive|all`).

> `hourlyRate` `@Type(() => Number)` ile sayıya çevrilir, `@Min(0)` ile negatif
> engellenir. Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`,
> `transform`) Faz 1'de zaten aktif.

---

## 6. Restoran CRUD Akışı

- **Oluşturma:** E-posta önce normalize edilir (`toLowerCase().trim()`) ve unique
  kontrol edilir → şifre bcrypt'le hash'lenir → `prisma.user.create` içinde
  **nested** `restaurant.create` ile User + Restaurant atomik oluşturulur
  (`role = RESTAURANT`). Yarış durumunda Prisma `P2002` da `409`'a çevrilir.
- **Listeleme:** `where` filtresi (`isActive` + `OR` arama) ile sıralı
  (`createdAt desc`) döner; her satıra bağlı `user.email` eklenir.
- **Güncelleme:** Değişen alanlar `userData` / `restaurantData` olarak ayrılır.
  E-posta değişiyorsa unique kontrol (kendi userId hariç). Şifre doluysa
  hash'lenir, boşsa atlanır. İkisi `$transaction` içinde güncellenir.
- **Aktif/Pasif:** `setStatus` → `$transaction` içinde `User.isActive` ve
  `Restaurant.isActive` birlikte set edilir.

## 7. Kurye CRUD Akışı

Restoranla birebir aynı desen; tek fark alanlar (`authorizedPerson` ve `address`
yok) ve `role = COURIER`. Dosya:
`backend/src/admin/couriers/admin-couriers.service.ts`.

---

## 8. Aktif / Pasif Mantığı (Soft Delete)

- Hiçbir kayıt **silinmez**. "Pasife Al" ilgili kaydı ve **bağlı User'ı** pasife
  çeker.
- Pasif `User`, Faz 1'deki login akışında engellenir: `AuthService.login`
  `isActive=false` ise `401` döner; ayrıca `JwtStrategy.validate` her istekte
  DB'den kontrol ettiği için eldeki geçerli token bile pasif hesapta çalışmaz.
- "Aktif Et" ile kayıt ve User tekrar aktifleşir, login yeniden çalışır.
- Profil `isActive` ile `User.isActive` **her zaman senkrondur** (transaction).

---

## 9. Test Edilmesi Gereken / Edilen Senaryolar

Aşağıdakiler bu fazda **canlı (HTTP) olarak test edildi ve geçti:**

| Senaryo | Beklenen | Sonuç |
|---|---|---|
| Admin restoran ekler | 201 + kayıt | ✅ |
| Eklenen restoran kendi hesabıyla login | 200 + token | ✅ |
| Aynı e-posta ile ikinci kayıt | 409 | ✅ |
| Negatif `hourlyRate` | 400 | ✅ |
| Restoran düzenle (şifre boş) → login hâlâ çalışır | 200 | ✅ |
| Restoran pasife alınır → login | 401 | ✅ |
| Restoran tekrar aktif → login | 200 | ✅ |
| `status=passive` filtresi | sadece pasifler | ✅ |
| Admin kurye ekler | 201 + kayıt | ✅ |
| Eklenen kurye kendi hesabıyla login | 200 | ✅ |
| RESTAURANT → `GET /admin/restaurants` | 403 | ✅ |
| RESTAURANT → `POST /admin/couriers` | 403 | ✅ |
| COURIER → `GET /admin/couriers` | 403 | ✅ |
| COURIER → `GET /admin/restaurants` | 403 | ✅ |
| Token'sız → `GET /admin/restaurants` | 401 | ✅ |

**Frontend için manuel kontrol önerilir:** admin login → Restoranlar/Kuryeler
sayfaları → ekle/düzenle/pasife al/ara/filtrele; eklenen hesapla çıkış yapıp
login. (Backend derleme + tüm API testleri geçti; frontend `npm run build`
başarılı.)

> **Not (test verisi):** Test sırasında oluşturulan demo kayıtlar veritabanında
> bırakıldı: restoran `pizzaplus@kuryecrm.local` (şifre `Pizza12345`) ve kurye
> `hasan@kuryecrm.local` (şifre `Hasan12345`). Yönetim tablolarında örnek veri
> görünmesi için tutuldu; istenirse pasife alınabilir/düzenlenebilir.

---

## 10. Bir Sonraki Fazda Yapılacaklar (Faz 3+)

Bu fazda **YAPILMADI** (sonraki fazlara ait):

1. **Vardiya (shift) sistemi** — kurye giriş/çıkış, çalışılan saat. Yeni `Shift`
   modeli.
2. **Kurye avans sistemi** — `Advance` modeli, bakiye.
3. **Restoran cari hesap** — borç/alacak hareketleri.
4. **Gelir-gider modülü.**
5. **Raporlama** — tarih aralığı, dashboard grafikleri.

**Hazır zemin (Faz 3 için kolaylaştırıcılar):**
- Admin CRUD deseni (`admin/restaurants`, `admin/couriers`) yeni kaynaklar için
  birebir kopyalanabilir (DTO + service + controller + module kaydı).
- Soft-delete (aktif/pasif) deseni ve `$transaction` ile çoklu tablo güncelleme
  örnekleri mevcut.
- Frontend'de tekrar kullanılabilir bileşenler hazır: `AdminLayout`,
  `ListToolbar`, `StatusBadge`, `Modal`, `Field`, `adminApi`, `formatTL`.
- Yeni admin sayfası eklemek için: sayfa oluştur → `App.tsx`'e route → `AdminLayout`
  içindeki `ADMIN_NAV`'a link ekle.

**Olası teknik iyileştirmeler:** sayfalama (pagination), toast bildirimleri
(şu an `alert`), form alan-bazlı hata gösterimi, optimistic update.

---

### Çalıştırma Hatırlatma

```powershell
.\set-local-env.bat
cd backend && npm install && npx prisma migrate dev && npm run start:dev   # :3000
cd frontend && npm install && npm run dev                                  # :5173
```
Admin: `admin@kuryecrm.local` / `Admin12345` → `/admin` → Restoranlar / Kuryeler.
