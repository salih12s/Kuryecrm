# Yeni Roller: Muhasebe, Pazarlamacı, Gözlemci + Vardiya Kalıcı Silme

## 1. Muhasebe rolü (`MUHASEBE`)
- Admin, `Kullanıcılar` sayfasından kullanıcı adı+şifre ile bir Muhasebe hesabı oluşturur.
- Giriş yapınca **sadece** `Restoran Cari` ekranını görür (`/admin/restaurant-accounts`) — başka hiçbir
  admin sayfası menüde görünmez ve backend'de de erişilemez (`RolesGuard`).
- Bu ekranda tüm restoranların hizmet bedeli / ödenen / kalan borç özetini görür, restoran detayına
  girip **fatura oluşturabilir, düzenleyebilir, iptal edebilir** ve ödeme kaydedebilir — yani haftalık
  faturayı doğrudan sistemden kesebilir. Yetkisi `admin/restaurant-invoices`, `admin/restaurant-payments`
  ve `admin/restaurant-accounts` uçlarıyla sınırlıdır; `FinanceWriteGuard` bu rolü Admin gibi her zaman
  yazabilir kabul eder.

## 2. Pazarlamacı rolü (`PAZARLAMACI`)
- Admin, aynı şekilde kullanıcı adı+şifre ile bir Pazarlamacı hesabı oluşturur.
- Kendine ait tek sayfalık bir panele düşer (`/pazarlama`): ziyaret ettiği yeri, tarihi, sonucu
  (Olumlu/Olumsuz) girer. **Olumluysa** kaç kişilik operasyon olduğu, **olumsuzsa** nedeni zorunludur
  (backend `MarketingService` bu kuralı sunucu tarafında da doğrular).
- Kayıtlar `marketing_visits` tablosunda tutulur ve bir tablo halinde listelenir (tarih/sonuç filtreli).
- Bir pazarlamacı **yalnızca kendi girdiği kayıtları** görür/düzenler/siler — `pazarlama/visits` uçları
  her zaman `userId`'ye göre filtrelenir, başka bir pazarlamacının kaydına erişim 403/404 döner.
- Admin, `Pazarlama → Görüşme Kayıtları` (`/admin/marketing`) sayfasından **tüm pazarlamacıların**
  kayıtlarını pazarlamacıya göre filtreleyerek görebilir ve gerekirse silebilir.

## 3. Gözlemci rolü (`GOZLEMCI`) — kısıtlı admin
- Admin panelindeki **her şeyi** (Operasyon, Onaylar, Raporlar, Finans, Stok, Pazarlama, Kullanıcılar,
  Ayarlar dahil) tam admin gibi görür, fakat **hiçbir yazma işlemi yapamaz**: oluşturma, düzenleme, durum
  değiştirme, silme — hepsi backend'de reddedilir (`ReadOnlyGuard` GET dışı her isteği bu rol için
  engeller; finans/stok uçlarında zaten var olan `FinanceWriteGuard` da aynı şekilde reddeder).
- Bu, mevcut **Ortak (Partner)** rolünden farklı ve ayrı bir roldür — Partner'ın kapsamı (Finans+Stok+
  Rapor, salt-okur/ayarlanabilir) hiç değiştirilmedi. Gözlemci sadece belirli kişiler için düşünülen,
  daha geniş görünürlüklü ama tamamen salt-okunur bir rol.
- Arayüzde bazı sayfalarda (özellikle Restoran Cari) düzenleme butonları Gözlemci için gizlenir; geri
  kalan sayfalarda buton görünür kalabilir ama sunucu her yazma isteğini reddeder (net "yetkiniz yok"
  hatası döner). İstenirse ileride buton gizleme her sayfaya da eklenebilir.

## 4. Vardiya kalıcı silme
- Admin, `Vardiyalar` sayfasında bir kayıt satırının işlemler menüsünden artık **"Kalıcı Sil"**
  seçeneğini kullanabilir (mevcut "İptal Et" farklı bir şeydir — sadece durumu `CANCELLED` yapar ve
  kaydı tutar). Kalıcı Sil, `DELETE /admin/shifts/:id` ile satırı ve ilişkili segment/GPS konum
  kayıtlarını veritabanından tamamen kaldırır; geri alınamaz, bu yüzden onay penceresi vardır.
- Bu işlem yalnızca **Admin**'e açıktır (Kurye Şefi ve Gözlemci yapamaz).

## Rol/sayfa erişim özeti
| Rol | Görebildiği admin sayfaları | Yazabilir mi? |
|---|---|---|
| Admin | Hepsi | Evet |
| Kurye Şefi | Operasyon (vardiya/restoran/kurye/harita) | Evet (kendi kapsamında) |
| Ortak (Partner) | Finans + Stok + Rapor | Ayara bağlı |
| **Muhasebe** | **Sadece Restoran Cari** | **Evet (sadece o ekran)** |
| **Pazarlamacı** | **Sadece kendi Görüşme Kayıtları paneli** | **Evet (sadece kendi kayıtları)** |
| **Gözlemci** | **Hepsi (Admin ile aynı)** | **Hayır (tamamen salt-okur)** |

## Veri modeli
`Role` enum'a `MUHASEBE`, `PAZARLAMACI`, `GOZLEMCI` eklendi. Yeni `MarketingVisit` modeli
(`marketing_visits` tablosu): `userId`, `visitDate`, `placeName`, `contactName?`, `phone?`,
`result` (`POSITIVE`/`NEGATIVE`), `operationSize?`, `negativeReason?`, `note?`. Migration:
`20260712110747_add_muhasebe_pazarlama_gozlemci_roles`.

## Doğrulama
Üç yeni rol için test kullanıcısı oluşturulup giriş yapıldı ve uçlar curl ile denendi:
Muhasebe'nin sadece Restoran Cari uçlarına yazabildiği, vardiya/finans-işlemleri uçlarından 403 aldığı;
Gözlemci'nin her GET'e 200, her POST/PATCH/DELETE'e 403 aldığı; Pazarlamacı'nın olumlu/olumsuz zorunlu
alan doğrulamasının çalıştığı ve başka bir kullanıcının kaydına erişemediği; vardiya kalıcı silmenin
kaydı gerçekten kaldırdığı ve Gözlemci'nin bunu yapamadığı doğrulandı. Backend (`tsc`, `nest build`) ve
frontend (`tsc -b`, `vite build`) temiz derlendi.
