# KuryeCrm — Faz 5 Raporu

**Tarih:** 2026-06-23  
**Faz:** 5 — Dashboard, raporlar ve final düzenlemeler  
**Durum:** ✅ Tamamlandı ve HTTP seviyesinde doğrulandı.

## 1. Faz 5'te Yapılan İşler

- Admin dashboard gerçek operasyon ve finans verilerine bağlandı.
- Gün sonu, tarih aralığı, restoran ve kurye raporları eklendi.
- Operasyonel kâr ile nakit/kasa hesabı birbirinden ayrıldı.
- Son yedi gün ve taraf bazlı dağılımlar, ek bağımlılık olmadan hafif CSS çubuk grafikleriyle gösterildi.
- Raporlara yazdırma ve CSV dışa aktarma eklendi.
- Tarih aralığı doğrulaması, loading/boş veri/hata durumları ve mobil tablo taşması ele alındı.
- Yeni Prisma modeli veya migration gerekmedi; Faz 3/4 verileri kullanıldı.

## 2. Eklenen Backend Endpointleri

Tüm endpointler `JwtAuthGuard + RolesGuard + ADMIN` rolüyle korunur:

- `GET /admin/reports/dashboard`
- `GET /admin/reports/daily?date=YYYY-MM-DD`
- `GET /admin/reports/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /admin/reports/restaurants?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /admin/reports/couriers?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Uygulama: `backend/src/reports/` (`reports.module.ts`, `reports.controller.ts`, `reports.service.ts`, `dto/report-query.dto.ts`).

## 3. Eklenen Frontend Sayfaları

- `/admin` — gerçek verili dashboard
- `/admin/reports/daily` — gün sonu raporu
- `/admin/reports/range` — haftalık/aylık veya özel tarih aralığı raporu
- `/admin/reports/restaurants` — restoran bazlı rapor
- `/admin/reports/couriers` — kurye bazlı rapor

Admin sidebar bu sayfalarla güncellendi. Ortak rapor kartı, grafik, aksiyon, CSV ve API yardımcıları eklendi.

## 4. Dashboard Hesaplama Mantığı

Bugün için yalnızca `COMPLETED + ADMIN_APPROVED` ve onaylı saatleri dolu vardiyalar alınır. Çalışma saati, hizmet bedeli, kurye hak edişi, brüt fark, manuel gelir/gider, tahsilat, avans, net kâr ve kasa hareketi gösterilir.

Global kartlarda açık restoran bakiyesi, kurye kalan ödemesi, aktif restoran/kurye sayısı ve bekleyen/uyuşmaz vardiyalar bulunur. Son yedi günlük net kâr ve çalışma saati kırılımı ayrıca döner.

## 5. Gün Sonu Raporu

Seçilen günün özetleri, restoran ve kurye kırılımları, onaylı vardiyaları, gelir/gider hareketleri, restoran ödemeleri ve kurye avansları tek raporda gösterilir. Vardiya listesi CSV olarak indirilebilir ve sayfa yazdırılabilir.

## 6. Haftalık/Aylık Rapor

Özel başlangıç/bitiş tarihi ve Bugün, Bu Hafta, Bu Ay, Geçen Ay hızlı filtreleri sunulur. Toplam özetlere ek olarak gün gün, restoran bazlı ve kurye bazlı kırılımlar gösterilir. Boş günler sıfır değerle dönerek grafik zaman çizgisini korur.

## 7. Restoran Raporu

Her restoran için dönem içindeki vardiya sayısı, çalışma saati, hizmet bedeli, fatura, ödeme, kalan bakiye ve son ödeme tarihi gösterilir. Arama, tarih filtresi, CSV ve yazdırma mevcuttur.

## 8. Kurye Raporu

Her kurye için dönem içindeki vardiya sayısı, çalışma saati, hak ediş, aktif avans, kalan ödeme ve son avans tarihi gösterilir. Arama, tarih filtresi, CSV, yazdırma ve hesap detayına bağlantı mevcuttur.

## 9. Operasyonel Kâr ve Kasa Ayrımı

Operasyonel net kâr:

`restoran hizmet bedeli - kurye hak edişi + manuel gelir - manuel gider`

Kasa hareketi:

`restoran tahsilatı + manuel gelir - aktif kurye avansı - manuel gider`

Fatura, tahsil edilmeden kasaya girmez. Avans operasyonel kârda ikinci kez gider yazılmaz; hak edişten düşülen erken ödeme olarak yalnızca kasa hareketinde yer alır.

## 10. Grafik ve Export Yapısı

Yeni grafik paketi eklenmedi. Responsive CSS çubukları kullanıldı; bundle ve bakım maliyeti düşük tutuldu. `window.print()` ile yazdırma, UTF-8 BOM ve noktalı virgül ayrımlı CSV ile Excel uyumlu dışa aktarma sağlandı:

- Gün sonu vardiyaları CSV
- Tarih aralığı günlük kırılımı CSV
- Restoran raporu CSV
- Kurye raporu CSV

## 11. Rol Bazlı Güvenlik

- Rapor endpointleri sadece `ADMIN` rolüne açıktır.
- Restoran ve kurye finans endpointleri Faz 4'teki gibi JWT kullanıcısına bağlı profili backend'de çözer; istemciden profil id kabul etmez.
- Restoran/kurye kendi verisinde kurye maliyeti, restoran geliri veya sistem kârı gibi yasaklı alanları göremez.
- Frontend route korumasına ek olarak asıl güvenlik backend guard'larındadır.

## 12. Test Edilen Senaryolar

- ✅ Backend production build
- ✅ Frontend TypeScript + Vite production build
- ✅ Dashboard endpointi admin token ile HTTP 200
- ✅ Günlük rapor endpointi HTTP 200
- ✅ Aralık raporu endpointi HTTP 200
- ✅ Restoran raporu endpointi HTTP 200
- ✅ Kurye raporu endpointi HTTP 200
- ✅ Restoran token ile admin raporuna erişim HTTP 403
- ✅ Gece yarısını geçen vardiyalar ortak `durationHours` ile destekleniyor
- ✅ Sadece tamamlanmış ve admin onaylı vardiyalar finans hesabına giriyor
- ✅ Build sırasında eski modüllerde TypeScript regresyonu oluşmadı

## 13. Bilinen Eksikler / Öneriler

- Grafikler bilinçli olarak hafif CSS görselleştirmeleridir; ileri analitik gerektiğinde erişilebilir bir chart kütüphanesi eklenebilir.
- Büyük veri hacminde rapor sorgularına sayfalama, materialized view veya önbellek eklenebilir.
- CSV yanında sunucu taraflı XLSX/PDF çıktısı ileride eklenebilir.
- Production öncesi gerçekçi veri setiyle finans mutabakatı, tarayıcı/mobil görsel test ve otomatik e2e test paketi önerilir.
