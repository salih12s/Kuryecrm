# KuryeCrm — Faz 3 Raporu

> Devam edecek geliştirici/araç (ör. Codex) önce sırasıyla
> [FAZ_1_RAPOR.md](FAZ_1_RAPOR.md), [FAZ_2_RAPOR.md](FAZ_2_RAPOR.md) ve bu
> dosyayı okumalıdır. Faz 1 (auth/JWT/rol/panel/Prisma/env) ve Faz 2 (admin
> restoran/kurye CRUD) yapıları **korunarak** üzerine inşa edilmiştir.

**Tarih:** 2026-06-23
**Faz:** 3 — Vardiya sistemi, kurye atama, saat bildirimi/uyuşmazlık, admin onayı
**Durum:** ✅ Tamamlandı ve uçtan uca test edildi.

**Proje yol haritası:** Faz 1 (altyapı) · Faz 2 (restoran/kurye yönetimi) ·
**Faz 3 (vardiya)** · Faz 4 (avans, cari, gelir-gider, ödeme) · Faz 5 (raporlar,
dashboard, son düzenlemeler).

---

## 1. Faz 3'te Yapılan İşler

1. ✅ `Shift` modeli + `ShiftStatus` ve `ShiftConfirmationStatus` enumları, ilişkiler ve migration.
2. ✅ Admin vardiya oluşturma; her vardiyaya **bir restoran + bir kurye** atanır.
3. ✅ Vardiya tarih, planlanan başlangıç/bitiş + **ekstra mesai** (opsiyonel çift) içerir.
4. ✅ Oluşturmada restoran ve kurye **saatlik ücretleri snapshot** olarak kaydedilir
   (`restaurantHourlyRateSnapshot`, `courierHourlyRateSnapshot`). Sonradan profil
   ücreti değişse bile eski vardiya hesabı bozulmaz.
5. ✅ Sadece **aktif** restoran/kurye atanabilir; pasif olan reddedilir (400).
6. ✅ Restoran kendi panelinden **sadece kendi** vardiyalarını görür.
7. ✅ Kurye kendi panelinden **sadece kendine atanmış** vardiyaları görür.
8. ✅ Restoran ve kurye **başlangıç/çıkış saati bildirir** (report-time).
9. ✅ Bildirilen saatler eşleşirse `MATCHED`, farklıysa `DISPUTED` (+ status `DISPUTED`).
10. ✅ Admin uyuşmazlıkları görür, **nihai/onaylı** başlangıç-bitiş saatini girer.
11. ✅ Admin onayı → `confirmationStatus = ADMIN_APPROVED`, `status = COMPLETED`.
12. ✅ Vardiya detayında basit hesap (yalnızca onaylı saat varsa): çalışma saati,
    restoran geliri, kurye maliyeti, brüt fark. Onay yoksa hesap gösterilmez.
13. ✅ Rol bazlı **guard + sahiplik** kontrolü (URL ile başkasının vardiyasına erişim engellenir).
14. ✅ Frontend: admin **Vardiyalar**, restoran/kurye **Vardiyalarım** sayfaları + nav linkleri.
15. ✅ Seed'e örnek bir planlı vardiya eklendi (mevcut seed bozulmadan).
16. ✅ Bu rapor.

**Faz 1/2 modelleri (`User`, `Restaurant`, `Courier`) bozulmadı.** Login, rol ve
CRUD sistemleri çalışmaya devam ediyor.

---

## 2. Eklenen Prisma Modelleri ve Migration

**Migration:** `prisma/migrations/20260623125115_add_shift/` (`migrate dev --name add_shift`).
`npx prisma generate` çalıştırıldı.

**Yeni enumlar:**
```prisma
enum ShiftStatus { PLANNED IN_PROGRESS COMPLETED CANCELLED DISPUTED }
enum ShiftConfirmationStatus {
  WAITING RESTAURANT_SUBMITTED COURIER_SUBMITTED MATCHED DISPUTED ADMIN_APPROVED
}
```

**Yeni model `Shift` (tablo `shifts`):**
`id, restaurantId, courierId, date, plannedStartTime, plannedEndTime,
extraStartTime?, extraEndTime?, restaurantHourlyRateSnapshot,
courierHourlyRateSnapshot, restaurantReportedStartTime?, restaurantReportedEndTime?,
courierReportedStartTime?, courierReportedEndTime?, approvedStartTime?,
approvedEndTime?, status (PLANNED), confirmationStatus (WAITING), note?, adminNote?,
createdAt, updatedAt`

**İlişkiler:** `Shift.restaurant → Restaurant`, `Shift.courier → Courier`
(`onDelete: Cascade`). `Restaurant.shifts` ve `Courier.shifts` eklendi.
`@@index` ile `restaurantId`, `courierId`, `date` indexlendi.

**Tasarım kararı — saat/tarih saklama:** `date` `"YYYY-MM-DD"`, tüm saatler
`"HH:mm"` **String** olarak tutulur. Sebep: timezone karmaşası olmadan frontend
formatlarıyla birebir uyum; sıfır dolgulu HH:mm sözlüksel (lexicographic)
karşılaştırmada da doğru sıralanır (eşitlik/“sonra” kontrolleri buna dayanır).
Ücret snapshot'ları `Decimal(10,2)`.

---

## 3. Eklenen Backend Endpoint'leri

**Admin** (`@Roles(ADMIN)`):
| Method | Yol | Açıklama |
|---|---|---|
| GET | `/admin/shifts` | Listele (filtreler: `dateFrom,dateTo,restaurantId,courierId,status`) |
| GET | `/admin/shifts/:id` | Detay |
| POST | `/admin/shifts` | Oluştur (snapshot + validasyon) |
| PATCH | `/admin/shifts/:id` | Düzenle (restoran/kurye değişirse re-snapshot) |
| PATCH | `/admin/shifts/:id/status` | Durum değiştir |
| PATCH | `/admin/shifts/:id/approve-time` | Nihai saat onayı |

**Restoran** (`@Roles(RESTAURANT)`):
| GET | `/restaurant/shifts` | Sadece kendi vardiyaları |
| GET | `/restaurant/shifts/:id` | Kendi vardiyası (değilse 403) |
| PATCH | `/restaurant/shifts/:id/report-time` | Saat bildir |

**Kurye** (`@Roles(COURIER)`):
| GET | `/courier/shifts` | Sadece kendine atanmış |
| GET | `/courier/shifts/:id` | Kendi vardiyası (değilse 403) |
| PATCH | `/courier/shifts/:id/report-time` | Saat bildir |

Hepsi `JwtAuthGuard + RolesGuard` ile korunur. Dosyalar:
`backend/src/shifts/` (`shifts.service.ts`, `admin-shifts.controller.ts`,
`restaurant-shifts.controller.ts`, `courier-shifts.controller.ts`,
`shifts.module.ts`, `dto/*`). `app.module.ts`'e `ShiftsModule` eklendi.

**Vardiya yanıtı** restoran/kurye adlarını ve onaylıysa `calculation` nesnesini içerir:
```json
{ "workHours": 8.75, "restaurantRevenue": 1050, "courierCost": 787.5, "grossDifference": 262.5 }
```
Onaylı saat yoksa `calculation: null`.

---

## 4. Eklenen Frontend Sayfaları

| Yol | Bileşen | Erişim |
|---|---|---|
| `/admin/shifts` | `pages/admin/ShiftsPage.tsx` | ADMIN |
| `/restaurant/shifts` | `pages/restaurant/RestaurantShiftsPage.tsx` | RESTAURANT |
| `/courier/shifts` | `pages/courier/CourierShiftsPage.tsx` | COURIER |

**Ortak/yardımcı yeni dosyalar:**
`components/admin/ShiftBadges.tsx` (durum + saat-kontrol rozetleri),
`components/shifts/PartyShiftsView.tsx` (restoran/kurye ortak liste + saat bildir modalı),
`components/restaurant/RestaurantLayout.tsx`, `components/courier/CourierLayout.tsx`,
`lib/shiftsApi.ts`, `lib/format.ts`'e `formatDateTR` + `timeRange`,
`types/index.ts`'e `Shift` ve enum tipleri.

**Güncellenenler:** `components/admin/AdminLayout.tsx` (Vardiyalar linki),
`pages/RestaurantPage.tsx` & `pages/CourierPage.tsx` (yeni layout'lar),
`App.tsx` (3 yeni route).

**Nav:** Admin sidebar → **Vardiyalar**; Restoran/Kurye sidebar → **Vardiyalarım**.

**Format:** tarih `tr-TR` (`formatDateTR`), saat `HH:mm`. Rozet renkleri:
PLANNED gri, IN_PROGRESS mavi, COMPLETED yeşil, CANCELLED kırmızı, DISPUTED turuncu;
WAITING gri, *_SUBMITTED mavi, MATCHED yeşil, DISPUTED kırmızı, ADMIN_APPROVED yeşil.

---

## 5. Admin Vardiya Akışı

1. **Vardiyalar** sayfasında filtreler (tarih aralığı, restoran, kurye, durum) ve
   tablo (Tarih, Restoran, Kurye, Planlanan, Ekstra, Restoran Bild., Kurye Bild.,
   Onaylı, Durum, Saat Kontrol, İşlemler).
2. **+ Yeni Vardiya Ekle** → modal: restoran/kurye (yalnızca aktifler dropdown'da),
   tarih, planlanan saatler, ekstra saatler (ops.), not.
3. Satır işlemleri: **Düzenle**, **Saat Onayla** (modal), **Durum** (select),
   **İptal** (CANCELLED).
4. Uyuşmazlıklı vardiyalar “Uyuşmazlık Var” rozetiyle görünür.
5. **Saat Onayla** modalında restoran/kurye bildirimleri özetlenir; admin onaylı
   başlangıç/bitiş + admin notu girer → vardiya “Tamamlandı/Onaylandı” olur.

## 6. Restoran Akışı

- **Vardiyalarım** sayfasında yalnızca kendi vardiyaları (Tarih, Kurye, Planlanan,
  Ekstra, Benim Bildirdiğim, Onay Durumu, Durum).
- **Saat Bildir** modalı: başlangıç ve/veya çıkış saatini girer. En az biri zorunlu.
- Backend sahiplik kontrolü: başka restoranın vardiyasına erişim **403**.

## 7. Kurye Akışı

- Restoranla aynı; tabloda “Kurye” yerine **Restoran** sütunu. Yalnızca kendine
  atanmış vardiyalar; başka kuryenin vardiyasına erişim **403**.

---

## 8. Uyuşmazlık Kontrol Mantığı

`report-time` sonrası `deriveConfirmation` çalışır (kaynak:
`shifts.service.ts`). Bir taraf hem başlangıç hem bitiş bildirmişse “tamamlanmış”
sayılır:

- İki taraf da tamamladı **ve** başlangıç+bitiş eşit → `MATCHED`
  (daha önce DISPUTED ise `status` → `IN_PROGRESS`).
- İki taraf da tamamladı **ve** farklı → `confirmationStatus = DISPUTED`,
  `status = DISPUTED`.
- Sadece restoran → `RESTAURANT_SUBMITTED`; sadece kurye → `COURIER_SUBMITTED`;
  hiçbiri → `WAITING`.
- `ADMIN_APPROVED` olmuş bir vardiya yeni bildirimlerle **geri alınmaz** (korunur).

Admin `approve-time` ile `approvedStartTime/EndTime` girer →
`ADMIN_APPROVED` + `COMPLETED`.

---

## 9. Saatlik Ücret Snapshot Mantığı

- Oluşturma anında `Restaurant.hourlyRate → restaurantHourlyRateSnapshot`,
  `Courier.hourlyRate → courierHourlyRateSnapshot`.
- Admin düzenlemede atanan restoran/kurye **değişirse** ilgili snapshot yeniden
  alınır; sadece diğer alanlar değişirse snapshot’a dokunulmaz.
- Faz 4/5 para hesapları bu snapshot'lar ve `approvedStartTime/EndTime` üzerinden
  yapılacaktır (profil ücreti sonradan değişse de geçmiş bozulmaz).
- Faz 3 hesap (yalnızca onaylı saat varsa):
  `çalışma saati = approvedEnd − approvedStart`,
  `restoran geliri = saat × restaurantSnapshot`,
  `kurye maliyeti = saat × courierSnapshot`, `brüt fark = gelir − maliyet`.

---

## 10. Rol Bazlı Güvenlik Kontrolleri

- Admin uçları yalnız `ADMIN`, restoran uçları yalnız `RESTAURANT`, kurye uçları
  yalnız `COURIER` (`RolesGuard` + `@Roles`).
- **Sahiplik:** restoran/kurye servis metodları, `userId`'den profil id'sini
  çözüp vardiyanın `restaurantId`/`courierId` ile eşleştiğini doğrular; aksi halde
  `403`. Liste uçları zaten kendi id'sine `where` ile filtrelidir.
- Pasif kullanıcı login olamaz (Faz 1) — pasif restoran/kurye vardiyaya da atanamaz.
- Sadece menü gizleme değil; backend kesin uygular.

---

## 11. Test Edilmesi Gereken / Edilen Senaryolar

Aşağıdakiler bu fazda **canlı (HTTP) test edildi ve geçti:**

| Senaryo | Beklenen | Sonuç |
|---|---|---|
| Admin vardiya oluşturur | snapshot 120/90, PLANNED/WAITING, calc null | ✅ |
| Planlanan bitiş < başlangıç | 400 | ✅ |
| Ekstra saatlerden yalnız biri | 400 | ✅ |
| Hatalı saat formatı | 400 | ✅ |
| Pasif restoran atama | 400 | ✅ |
| Restoran + kurye aynı saati bildirir | MATCHED | ✅ |
| Tek taraf bildirir | RESTAURANT_/COURIER_SUBMITTED | ✅ |
| Farklı saat bildirimi | status & conf = DISPUTED | ✅ |
| Admin approve-time | COMPLETED + ADMIN_APPROVED + doğru calc (8.75s → 1050/787.5/262.5) | ✅ |
| Başka restoranın vardiyasına erişim/rapor | 403 | ✅ |
| Başka kuryenin vardiyasına erişim | 403 | ✅ |
| Restoran listesi sadece kendi (3) vs diğer (0) | izole | ✅ |
| RESTAURANT/COURIER → `/admin/shifts` | 403 | ✅ |
| COURIER → `/restaurant/shifts`, RESTAURANT → `/courier/shifts` | 403 | ✅ |
| Token'sız → `/admin/shifts` | 401 | ✅ |

**Frontend manuel kontrol önerisi:** admin Vardiyalar (oluştur/düzenle/durum/iptal/
saat onayla, filtreler, uyuşmazlık rozeti) → restoran & kurye Vardiyalarım (saat
bildir; eşleşme/uyuşmazlık rozetinin değişmesi) → admin onayı sonrası hesap.
Backend `nest build` ve frontend `npm run build` başarılı.

---

## 12. Faz 4'te Yapılacaklar

Faz 3'te **YAPILMADI** (Faz 4/5'e ait): avans, restoran cari hesap, gelir-gider,
fatura, ödeme takibi ve detaylı raporlama.

**Faz 4 için hazır zemin:**
- Vardiya başına `approvedStartTime/EndTime` + ücret snapshot'ları para hesabının
  sağlam temelidir; `calculation` mantığı `shifts.service.ts` içinde örnek olarak var.
- Yeni modüller için Faz 2/3 deseni (DTO + service + role-scoped controller'lar +
  sahiplik kontrolü) kopyalanabilir.
- Frontend tekrar kullanılabilir parçalar: `AdminLayout/RestaurantLayout/CourierLayout`,
  `Modal`, `Field`, `ShiftBadges`, `formatTL/formatDateTR/timeRange`, `*Api` helper'ları.

**Olası iyileştirmeler:** vardiya için onaylı saatlerin gece yarısını geçmesi
(ertesi güne sarkan vardiya) henüz desteklenmiyor — Faz 4'te ele alınabilir;
toast bildirimleri, sayfalama, alan-bazlı form hataları.

---

### Çalıştırma Hatırlatma

```powershell
.\set-local-env.bat
cd backend && npm install && npx prisma migrate dev && npm run seed && npm run start:dev   # :3000
cd frontend && npm install && npm run dev                                                  # :5173
```
Seed kullanıcılar (Faz 1) ve örnek vardiya (yarın 10:00-18:00) hazır gelir.
Admin: `admin@kuryecrm.local / Admin12345`.
