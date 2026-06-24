# KuryeCrm — Faz 4 Raporu

**Tarih:** 2026-06-23  
**Faz:** 4 — Avans, restoran cari, gelir-gider ve ödeme takibi  
**Durum:** ✅ Tamamlandı; kod, derleme ve veritabanı migration durumu doğrulandı.

## 1. Faz 4'te Yapılan İşler

- Kurye avanslarının eklenmesi, düzenlenmesi, filtrelenmesi ve iptal/aktif edilmesi sağlandı.
- Onaylı vardiyalardan kurye hak edişi ve restoran hizmet bedeli hesaplandı.
- Restoran fatura ve ödeme kayıtları ile otomatik fatura durumu takibi eklendi.
- Restoran cari bakiyesi `aktif faturalar - aktif ödemeler` olarak hesaplandı.
- Bağımsız manuel gelir/gider kayıt sistemi eklendi.
- Admin, restoran ve kurye için Faz 4 finans ekranları oluşturuldu.
- Rol kontrolleri ve restoran/kurye sahiplik kontrolleri backend seviyesinde uygulandı.
- Gece yarısını geçen vardiyalar (ör. `22:00–02:00`) dört saat olarak hesaplanacak şekilde ortak zaman yardımcısı güncellendi.

## 2. Prisma Modelleri ve Migration

Eklenen enum'lar:

- `AdvanceStatus`: `ACTIVE`, `CANCELLED`
- `FinanceTransactionType`: `INCOME`, `EXPENSE`
- `FinanceTransactionStatus`: `ACTIVE`, `CANCELLED`
- `InvoiceStatus`: `UNPAID`, `PARTIAL`, `PAID`, `CANCELLED`
- `PaymentStatus`: `ACTIVE`, `CANCELLED`

Eklenen modeller:

- `CourierAdvance`
- `RestaurantInvoice`
- `RestaurantPayment`
- `FinanceTransaction`

Migration: `20260623131158_add_finance`

Doğrulama sırasında `prisma validate` başarılı oldu ve `prisma migrate status`, veritabanının üç migration ile güncel olduğunu gösterdi.

## 3. Backend Endpointleri

Admin:

- `GET/POST /admin/advances`
- `GET/PATCH /admin/advances/:id`
- `PATCH /admin/advances/:id/status`
- `GET /admin/couriers/:id/account-summary`
- `GET/POST /admin/restaurant-invoices`
- `GET/PATCH /admin/restaurant-invoices/:id`
- `PATCH /admin/restaurant-invoices/:id/status`
- `GET/POST /admin/restaurant-payments`
- `GET/PATCH /admin/restaurant-payments/:id`
- `PATCH /admin/restaurant-payments/:id/status`
- `GET /admin/restaurants/:id/account-summary`
- `GET /admin/restaurant-accounts`
- `GET/POST /admin/finance-transactions`
- `GET/PATCH /admin/finance-transactions/:id`
- `PATCH /admin/finance-transactions/:id/status`

Restoran:

- `GET /restaurant/account-summary`
- `GET /restaurant/invoices`
- `GET /restaurant/payments`

Kurye:

- `GET /courier/account-summary`
- `GET /courier/advances`

## 4. Frontend Sayfaları

- `/admin/advances` — Avans listesi, filtreler ve kayıt yönetimi
- `/admin/couriers/:id/account` — Kurye hesap özeti
- `/admin/restaurant-accounts` — Restoran cari listesi ve detay yönetimi
- `/admin/finance-transactions` — Gelir/gider kayıt yönetimi
- `/restaurant/account` — Restoranın kendi cari durumu
- `/courier/account` — Kuryenin kendi hak ediş durumu

Admin menüsüne **Avanslar**, **Restoran Cari** ve **Gelir / Gider**; restoran menüsüne **Cari Durumum**; kurye menüsüne **Hakedişim** bağlantıları eklendi. Para değerleri ortak Türk Lirası formatlayıcısıyla gösteriliyor.

## 5. Kurye Avans Sistemi

Admin kurye, tarih, tutar ve isteğe bağlı not ile avans oluşturabilir; kaydı düzenleyebilir ve durumunu `ACTIVE/CANCELLED` değiştirebilir. Liste kurye, tarih aralığı ve durum ile filtrelenebilir. Yalnızca `ACTIVE` avanslar hak edişten düşülür.

## 6. Kurye Hak Ediş Hesabı

Hesaba yalnızca şu şartların tamamını sağlayan vardiyalar girer:

- `status = COMPLETED`
- `confirmationStatus = ADMIN_APPROVED`
- `approvedStartTime` ve `approvedEndTime` dolu

Her vardiya için:

`çalışma saati × courierHourlyRateSnapshot = vardiya hak edişi`

`toplam hak ediş - aktif avanslar = kalan ödenecek tutar`

Kurye özetinde restoranın saatlik ücreti veya sistem kârı açığa çıkarılmaz.

## 7. Restoran Fatura Sistemi

Admin fatura ekleyebilir, düzenleyebilir ve iptal edebilir. Tutar pozitif olmalıdır; dönem bitişi dönem başlangıcından önce olamaz. Yeni fatura `UNPAID` başlar. Fatura tutarı veya bağlı ödemeler değiştiğinde durum yeniden hesaplanır.

## 8. Restoran Ödeme Sistemi

Ödeme bir restorana ve isteğe bağlı olarak o restorana ait bir faturaya bağlanabilir. Başka restorana ait faturaya ödeme bağlama backend tarafından engellenir. Ödeme ekleme, düzenleme, fatura bağlantısını değiştirme ve iptal/aktif etme işlemleri ilgili faturanın durumunu yeniden hesaplar.

## 9. Restoran Cari Bakiye Mantığı

`CANCELLED` olmayan faturaların toplamından yalnızca `ACTIVE` ödemeler çıkarılır:

`toplam aktif fatura - toplam aktif ödeme = kalan bakiye`

Örneğin 100.000 TL fatura ve 50.000 TL aktif ödeme için bakiye 50.000 TL, fatura durumu `PARTIAL` olur. Ödeme toplamı fatura tutarına eşit veya büyükse durum `PAID` olur.

Onaylı vardiyalardan hizmet bedeli ayrıca şu şekilde hesaplanır:

`çalışma saati × restaurantHourlyRateSnapshot = restoran hizmet bedeli`

## 10. Gelir-Gider Kayıt Sistemi

Admin `INCOME` veya `EXPENSE` türünde kayıt ekleyebilir, düzenleyebilir, filtreleyebilir ve iptal/aktif edebilir. Restoran ödemeleri `RestaurantPayment` tablosunda, ekstra manuel gelirler ise `FinanceTransaction` tablosunda ayrı tutulur; böylece Faz 5 raporlarında mükerrer gelir hesabı önlenebilir.

## 11. Restoran Paneli

Restoran yalnızca giriş yapan kullanıcıya bağlı restoranın faturalarını, ödemelerini, kalan borcunu ve onaylı vardiyalardan oluşan hizmet bedelini görebilir. Kurye maliyeti, platform farkı ve diğer restoranların verileri yanıta dahil edilmez.

## 12. Kurye Paneli

Kurye yalnızca giriş yapan kullanıcıya bağlı kurye kaydının onaylı çalışma saatlerini, toplam hak edişini, avanslarını ve kalan alacağını görebilir. Restoran ücreti, platform farkı ve diğer kuryelerin verileri yanıta dahil edilmez.

## 13. Rol Bazlı Güvenlik

- Admin controller'ları `ADMIN`, restoran controller'ları `RESTAURANT`, kurye controller'ları `COURIER` rolüyle korunur.
- Tüm finans controller'larında JWT ve rol guard'ları backend seviyesinde uygulanır.
- Restoran ve kurye endpoint'leri hedef kaydı istek parametresinden değil, JWT kullanıcısına bağlı profil üzerinden bulur.
- Frontend route koruması ek güvenlik ve doğru kullanıcı deneyimi sağlar; asıl yetkilendirme backend'dedir.

## 14. Doğrulama ve Test Senaryoları

23 Haziran 2026 kontrolünde:

- ✅ Backend production build başarılı (`npm run build`)
- ✅ Frontend TypeScript + Vite production build başarılı (`npm run build`)
- ✅ Prisma şeması geçerli (`prisma validate`)
- ✅ Veritabanı migration durumu güncel (`prisma migrate status`)
- ✅ Endpoint, guard, sahiplik ve hesaplama kodları kapsamla karşılaştırıldı

Canlı kullanıcı kabul testinde ayrıca şu senaryolar uygulanmalıdır:

1. Avans ekleme/düzenleme/iptal ve kalan hak ediş değişimi.
2. `22:00–02:00` onaylı vardiyanın dört saat hesaplanması.
3. Onaysız, tamamlanmamış veya saatleri eksik vardiyanın finans hesabına girmemesi.
4. 100.000 TL fatura + 50.000 TL ödeme sonucunun `PARTIAL` ve 50.000 TL bakiye vermesi.
5. Ödeme iptali/aktif edilmesi ve fatura durumunun yeniden hesaplanması.
6. Farklı restorana ait faturaya ödeme bağlama girişiminin reddedilmesi.
7. Admin endpoint'lerine restoran/kurye token'ıyla erişimin `403` dönmesi.
8. Restoran ve kuryenin yalnızca kendi finans verilerini görebilmesi.
9. Gelir/gider ekleme, düzenleme, filtreleme ve iptal işlemleri.
10. Mobil ve masaüstü ekranlarda tüm finans sayfalarının görsel kontrolü.

## 15. Faz 5'te Yapılacaklar

- Gün sonu raporu
- Haftalık ve aylık raporlar
- Dashboard finans/operasyon özetleri ve grafikler
- Restoran ödemeleri ile manuel gelirleri mükerrer saymadan net gelir-gider hesapları
- Kurye maliyeti, restoran hizmet geliri ve brüt fark analizleri
- Tarih/restoran/kurye bazlı gelişmiş filtreler
- Son kullanıcı kabul testleri, görsel düzenlemeler ve proje kapanış raporu

Faz 4 dışında kalan bu raporlama ve dashboard işleri Faz 5'e bırakılmıştır.
