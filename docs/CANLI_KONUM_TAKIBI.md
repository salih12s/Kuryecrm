# Canlı Konum Takibi & Restoran Konumu

## Restoran konumu (sabit)
- Restoran ekleme/düzenleme ekranında harita (Leaflet + OpenStreetMap) üzerinden pin
  seçilerek **enlem/boylam** ve **konum notu** kaydedilir.
- Alanlar: `latitude`, `longitude`, `locationNote` (`restaurants` tablosu, hepsi opsiyonel).
- Konum, restoran listesinde "Konum: Tanımlı" olarak ve canlı haritada pin olarak görünür.

## Kurye canlı takibi
- Konum **yalnızca aktif vardiya** sırasında gönderilir. Backend, kuryenin bugüne ait,
  iptal/tamamlanmamış ve saat penceresi içindeki vardiyasını "aktif" sayar
  (`tracking.service.ts → activeShift`). Aktif vardiya yoksa `POST /courier/location` 403 döner —
  yani vardiya dışında konum **alınmaz/saklanmaz**.
- Kurye paneli açıkken `useCourierTracking` hook'u `GET /courier/tracking-status` ile takip
  durumunu sorar; aktifse `navigator.geolocation.watchPosition` ile konumu izler ve ayarlanan
  aralıkta (varsayılan 20 sn) `POST /courier/location` ile gönderir.
- Her ping: enlem, boylam, hız, doğruluk, cihaz/bağlantı durumu, cihaz zamanı (`recordedAt`) ve
  sunucu zamanı (`createdAt`) ile `courier_locations` tablosuna yazılır (rapor/rota için geçmiş).
- Canlı harita (`/admin/live-map`, yalnız **Admin** ve **Kurye Şefi**): aktif kuryeler, son konum,
  "X sn/dk önce", çevrim içi/dışı (offline eşiği), geç başlama ve ek mesai bilgisiyle gösterilir.

## Ayarlar
`Admin → Sistem → Ayarlar` (`/admin/settings`, yalnız Admin):
- `courier_location_interval_seconds` — konum gönderim aralığı (varsayılan 20 sn).
- `courier_offline_threshold_seconds` — bu süreden eski konum "çevrim dışı" sayılır (varsayılan 90 sn).
- `partners_can_edit_finance` — Ortaklar rolünün finansal kayıtları düzenleyip düzenleyemeyeceği.

## Bilinen sınır: tarayıcı tamamen kapalıyken
Web tarayıcıları, sayfa/sekme **tamamen kapatıldığında** GPS okuyamaz ve istek gönderemez.
Bu durumda kuryeden ping gelmez ve panel onu eşik süresi sonrası **"çevrim dışı / konum alınamıyor"**
olarak gösterir (beklenen davranış). Hook, sekme açıkken (arka planda/ekran kilitliyken mümkün
olduğunca) takibe devam eder ve geçici ağ kopmalarında son pingi tekrar dener.

Gerçek **arka plan** konum takibi (uygulama kapalıyken bile) yalnızca native/hybrid bir mobil
uygulama (ör. Capacitor + background geolocation) ile mümkündür ve bu web projesinin kapsamı
dışındadır.

## Roller özeti
- **Admin**: her şey + Ayarlar + Bekleyen Onaylar + Canlı Harita.
- **Kurye Şefi**: yalnız operasyon (vardiya, restoran, kurye, **Canlı Harita**). Finans/Rapor yok.
- **Ortaklar (Partner)**: yalnız Finans + finansal Raporlar. Operasyon/harita/ayar/kullanıcı yönetimi yok.
  Finansta düzenleme yetkisi `partners_can_edit_finance` ayarına bağlıdır (varsayılan kapalı → salt-okur).
