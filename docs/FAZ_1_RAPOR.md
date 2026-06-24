# KuryeCrm — Faz 1 Raporu

> Bu doküman, Faz 1'de yapılan her şeyi içerir. Projeye Codex (veya başka bir
> geliştirici/araç) ile devam edilecekse, **önce bu dosya okunmalıdır.** Hangi
> dosyaların oluşturulduğu, mimari kararlar, çalıştırma adımları ve Faz 2'ye
> nereden devam edileceği burada anlatılmıştır.

**Tarih:** 2026-06-23
**Faz:** 1 — Temel altyapı (DB bağlantısı, login, rol bazlı panel iskeleti)
**Durum:** ✅ Tamamlandı ve uçtan uca test edildi.

---

## 1. Faz 1'de Yapılan İşler

Faz 1 kapsamında **sadece temel altyapı** kuruldu. Operasyonel özellikler
(vardiya, avans, cari, gelir-gider, raporlama) **bilinçli olarak yapılmadı** —
bunlar sonraki fazlara aittir.

Yapılanlar:

1. ✅ Monorepo benzeri klasör yapısı kuruldu (`backend/`, `frontend/`, `docs/`).
2. ✅ Backend: **NestJS + TypeScript** kuruldu.
3. ✅ **PostgreSQL + Prisma** bağlantısı kuruldu ve test edildi.
4. ✅ Prisma şeması oluşturuldu: `User`, `Restaurant`, `Courier`, `Role` enum.
5. ✅ İlk migration üretildi ve uygulandı (`20260623122426_init`).
6. ✅ **Rol bazlı kullanıcı sistemi** (ADMIN / RESTAURANT / COURIER).
7. ✅ **JWT login** sistemi (`@nestjs/jwt` + `passport-jwt`).
8. ✅ Şifreler **bcrypt** ile hash'lendi (cost 10).
9. ✅ Backend tarafında **Role Guard** ile API seviyesinde yetkilendirme.
10. ✅ Auth endpoint'leri: `POST /auth/login`, `GET /auth/me`.
11. ✅ Panel endpoint'leri: `GET /admin/dashboard`, `GET /restaurant/dashboard`,
    `GET /courier/dashboard`.
12. ✅ Frontend: **React + TypeScript + Vite + Tailwind CSS**.
13. ✅ Login sayfası + role göre otomatik yönlendirme.
14. ✅ Üç ayrı panel (Admin / Restoran / Kurye) — kurumsal, temiz, mobil uyumlu.
15. ✅ Frontend route guard'ları (yetkisiz role kendi paneline yönlendirilir).
16. ✅ Local seed data (3 kullanıcı).
17. ✅ `set-local-env.bat` ve `set-production-env.bat` ortam geçiş scriptleri.
18. ✅ `.env` yapısı (local / production ayrımı) + `.gitignore` güvenliği.
19. ✅ Bu rapor dosyası.

### Test edilen başarı kriterleri (hepsi geçti)

| Kriter | Sonuç |
|---|---|
| Local PostgreSQL bağlantısı | ✅ `KuryeCrm` veritabanına bağlanıldı |
| Prisma migrate | ✅ `migrate dev --name init` başarılı |
| Seed kullanıcılar | ✅ 3 kullanıcı oluşturuldu |
| Login + JWT token | ✅ Token dönüyor |
| `/auth/me` | ✅ Giriş yapan kullanıcıyı döndürüyor |
| Admin → `/admin/dashboard` | ✅ HTTP 200 |
| Restoran → `/admin/dashboard` | ✅ HTTP 403 (engellendi) |
| Kurye → `/admin/dashboard` | ✅ HTTP 403 (engellendi) |
| Kurye → `/restaurant/dashboard` | ✅ HTTP 403 (engellendi) |
| Token'sız istek | ✅ HTTP 401 |
| Yanlış şifre | ✅ HTTP 401 |
| `set-local-env.bat` | ✅ Local env aktif ediliyor |
| `set-production-env.bat` | ✅ Production placeholder env aktif ediliyor |

---

## 2. Klasör / Dosya Yapısı

```
KuryeCrm/
├── set-local-env.bat              # Local .env dosyalarını aktif eder
├── set-production-env.bat         # Production .env dosyalarını aktif eder
├── .gitignore                     # .env ve secret dosyaları git'ten korur
│
├── docs/
│   └── FAZ_1_RAPOR.md             # (bu dosya)
│
├── backend/                       # NestJS API
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── nest-cli.json
│   ├── .env.example               # Commit edilebilir şablon
│   ├── .env.local                 # Local secret (git ignore)
│   ├── .env.production            # Production placeholder (git ignore)
│   ├── .env                       # Aktif ortam (bat ile üretilir, git ignore)
│   ├── prisma/
│   │   ├── schema.prisma          # Veritabanı şeması
│   │   ├── seed.ts                # Local seed kullanıcılar
│   │   └── migrations/            # Üretilen SQL migration'lar
│   │       └── 20260623122426_init/
│   └── src/
│       ├── main.ts                # Bootstrap (CORS, ValidationPipe, port)
│       ├── app.module.ts          # Kök modül
│       ├── app.controller.ts      # GET /health
│       ├── prisma/
│       │   ├── prisma.module.ts   # @Global Prisma modülü
│       │   └── prisma.service.ts  # PrismaClient yaşam döngüsü
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts # POST /auth/login, GET /auth/me
│       │   ├── auth.service.ts    # bcrypt + JWT imzalama
│       │   ├── dto/login.dto.ts   # class-validator ile doğrulama
│       │   ├── strategies/jwt.strategy.ts   # JWT doğrulama + DB kontrolü
│       │   ├── guards/jwt-auth.guard.ts     # Bearer token guard
│       │   ├── guards/roles.guard.ts        # @Roles() rol kontrolü
│       │   └── decorators/
│       │       ├── roles.decorator.ts       # @Roles(Role.ADMIN)
│       │       └── current-user.decorator.ts# @CurrentUser()
│       ├── admin/
│       │   ├── admin.module.ts
│       │   ├── admin.controller.ts # GET /admin/dashboard  (@Roles ADMIN)
│       │   └── admin.service.ts
│       ├── restaurant/
│       │   ├── restaurant.module.ts
│       │   ├── restaurant.controller.ts # GET /restaurant/dashboard (RESTAURANT)
│       │   └── restaurant.service.ts    # Veriyi kendi restoranına kısıtlar
│       └── courier/
│           ├── courier.module.ts
│           ├── courier.controller.ts    # GET /courier/dashboard (COURIER)
│           └── courier.service.ts       # Veriyi kendi kaydına kısıtlar
│
└── frontend/                      # React + Vite + Tailwind
    ├── package.json
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── postcss.config.js
    ├── tailwind.config.js         # Tema renkleri burada tanımlı
    ├── .env.example
    ├── .env.local                 # VITE_API_URL=http://localhost:3000
    ├── .env.production            # Production placeholder (git ignore)
    ├── .env                       # Aktif ortam (bat ile üretilir, git ignore)
    └── src/
        ├── main.tsx               # BrowserRouter + AuthProvider
        ├── App.tsx                # Route tanımları + role yönlendirme
        ├── index.css              # Tailwind direktifleri
        ├── vite-env.d.ts
        ├── types/index.ts         # Role, User tipleri + ROLE_HOME haritası
        ├── lib/api.ts             # axios instance + JWT interceptor
        ├── context/AuthContext.tsx# Oturum state'i (login/logout/me)
        ├── components/
        │   ├── ProtectedRoute.tsx # Frontend route guard
        │   ├── DashboardLayout.tsx# Sidebar + header iskeleti
        │   └── StatCard.tsx       # Kart bileşeni
        └── pages/
            ├── LoginPage.tsx
            ├── AdminPage.tsx
            ├── RestaurantPage.tsx
            └── CourierPage.tsx
```

---

## 3. Backend Endpoint'leri

| Method | Yol | Erişim | Açıklama |
|---|---|---|---|
| `GET`  | `/health` | Herkes | Sağlık kontrolü |
| `POST` | `/auth/login` | Herkes | E-posta + şifre ile giriş, JWT döner |
| `GET`  | `/auth/me` | Giriş yapan herkes | Token sahibinin profilini döner |
| `GET`  | `/admin/dashboard` | **ADMIN** | Sistem geneli özet sayılar |
| `GET`  | `/restaurant/dashboard` | **RESTAURANT** | Sadece kendi restoran bilgisi |
| `GET`  | `/courier/dashboard` | **COURIER** | Sadece kendi kurye bilgisi |

### Yetkilendirme mantığı (önemli)

- **JWT doğrulama:** `JwtAuthGuard` (`passport-jwt`) Bearer token'ı doğrular.
  `JwtStrategy.validate()` her istekte kullanıcıyı **DB'den tekrar kontrol eder**
  — pasif veya silinmiş hesap geçerli token'la bile erişemez.
- **Rol kontrolü:** `RolesGuard`, controller üzerindeki `@Roles(...)`
  metadata'sını okur. Rol uymazsa **403 Forbidden** döner.
- Panel controller'ları sınıf seviyesinde
  `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.X)` ile korunur.
- **Veri izolasyonu:** Restoran ve kurye servisleri veriyi `userId` üzerinden
  filtreler; bir restoran/kurye başka birinin verisini **göremez**.
- Yetkilendirme **sadece menü gizleme değildir** — API seviyesinde zorlanır.

---

## 4. Frontend Sayfaları

| Yol | Bileşen | Erişim |
|---|---|---|
| `/login` | `LoginPage` | Herkes |
| `/admin` | `AdminPage` | Sadece ADMIN |
| `/restaurant` | `RestaurantPage` | Sadece RESTAURANT |
| `/courier` | `CourierPage` | Sadece COURIER |
| `/` ve bilinmeyen yollar | `RootRedirect` | Role göre yönlendirir |

- Login sonrası kullanıcı rolüne göre otomatik yönlendirilir
  (`ROLE_HOME`: ADMIN→`/admin`, RESTAURANT→`/restaurant`, COURIER→`/courier`).
- `ProtectedRoute`: giriş yoksa `/login`'e, yanlış roldeyse kendi paneline atar.
- **Not:** Frontend guard sadece kullanıcı deneyimi içindir; gerçek güvenlik
  backend'deki role guard'lardadır.

### Tasarım

- Sol sidebar: koyu lacivert (`#0F172A`).
- Ana butonlar / vurgular: turuncu (`#F97316`).
- Sayfa arka planı: açık gri (`#F8FAFC`), kartlar beyaz.
- Mobil uyumlu (sidebar küçük ekranda toggle ile açılır).
- Tema renkleri `frontend/tailwind.config.js` içinde tanımlıdır.

---

## 5. Prisma Modelleri

`backend/prisma/schema.prisma`:

```prisma
enum Role {
  ADMIN
  RESTAURANT
  COURIER
}

model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  restaurant   Restaurant?   // 1-1 ilişki
  courier      Courier?      // 1-1 ilişki
  @@map("users")
}

model Restaurant {
  id               String   @id @default(uuid())
  userId           String   @unique
  name             String
  authorizedPerson String
  phone            String
  address          String
  hourlyRate       Decimal  @default(0) @db.Decimal(10, 2)
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("restaurants")
}

model Courier {
  id         String   @id @default(uuid())
  userId     String   @unique
  name       String
  phone      String
  hourlyRate Decimal  @default(0) @db.Decimal(10, 2)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("couriers")
}
```

- `Restaurant` ve `Courier`, `User` ile **1-1** ilişkilidir (`userId @unique`).
  Restoran ve kurye kendi hesabıyla login olur.
- Tablolar `@@map` ile çoğul/snake-case adlandırılır (`users`, `restaurants`,
  `couriers`).

---

## 6. Ortam (Env) Yapısı

Local ve production **ayrı** dosyalarda tutulur. Aktif ortam her zaman `.env`
dosyasıdır ve `.bat` scriptleriyle üretilir.

### Backend

| Dosya | Amaç | Git'e gider mi? |
|---|---|---|
| `backend/.env.example` | Şablon (gerçek secret yok) | ✅ Evet |
| `backend/.env.local` | Local secret'lar | ❌ Hayır |
| `backend/.env.production` | Production placeholder | ❌ Hayır |
| `backend/.env` | Aktif ortam (kopyalanır) | ❌ Hayır |

**`backend/.env.local` içeriği:**
```
DATABASE_URL="postgresql://postgres:12345@localhost:5432/KuryeCrm?schema=public"
JWT_SECRET="local_kuryecrm_secret"
JWT_EXPIRES_IN="1d"
NODE_ENV="development"
APP_ENV="local"
PORT=3000
```

**`backend/.env.production`** şu an sadece **placeholder** içerir
(`CHANGE_ME_...`). Production bilgileri verildiğinde bu dosya doldurulacak.
Production env **asla local DB'ye bağlanmaz** ve **git'e commit edilmez.**

### Frontend

| Dosya | Amaç |
|---|---|
| `frontend/.env.local` | `VITE_API_URL="http://localhost:3000"` |
| `frontend/.env.production` | `VITE_API_URL="https://CHANGE_ME_..."` |
| `frontend/.env` | Aktif ortam (kopyalanır) |

### Güvenlik

`.gitignore` tüm `.env`, `.env.local`, `.env.production` dosyalarını hariç
tutar. Sadece `*.env.example` şablonları commit edilir. **Production secret'lar
hiçbir zaman git'e girmez.**

---

## 7. `set-local-env.bat` ve `set-production-env.bat` Nasıl Çalışır?

İki script de proje kök dizinindedir ve aktif `.env` dosyasını üretir.

- **`set-local-env.bat`**
  - `backend/.env.local`  → `backend/.env` olarak kopyalar.
  - `frontend/.env.local` → `frontend/.env` olarak kopyalar.
  - Local PostgreSQL'e bağlanan ortamı aktif eder.

- **`set-production-env.bat`**
  - `backend/.env.production`  → `backend/.env`
  - `frontend/.env.production` → `frontend/.env`
  - Production ortamını aktif eder (önce placeholder'lar gerçek değerlerle
    doldurulmalıdır).

**Kullanım:** Proje kökünde çift tıklayarak veya terminalden:
```
.\set-local-env.bat
.\set-production-env.bat
```
Script çalıştıktan sonra backend yeniden başlatılmalıdır (env yeniden okunur).

---

## 8. Local Projeyi Çalıştırma Adımları

Ön koşullar: Node.js 18+, çalışan PostgreSQL (localhost:5432), `KuryeCrm`
veritabanı erişimi (`postgres` / `12345`).

```powershell
# 0) Proje kökünde local ortamı aktif et
.\set-local-env.bat

# 1) Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev          # ilk kez: şemayı uygular (migrate dev --name init)
npm run seed                    # seed kullanıcıları oluşturur
npm run start:dev               # http://localhost:3000

# 2) Frontend (ayrı bir terminalde)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Tarayıcıdan `http://localhost:5173` açılır, seed kullanıcılardan biriyle giriş
yapılır ve kullanıcı rolüne göre ilgili panele yönlendirilir.

**Yararlı komutlar:**
- `npm run start:dev` (backend) — watch modunda çalışır.
- `npm run prisma:studio` (backend) — Prisma Studio ile DB'yi görüntüler.
- `npm run build` (her iki tarafta) — production derlemesi.

---

## 9. Seed Kullanıcı Bilgileri (sadece local geliştirme)

| Rol | E-posta | Şifre |
|---|---|---|
| ADMIN | `admin@kuryecrm.local` | `Admin12345` |
| RESTAURANT | `restoran@kuryecrm.local` | `Restoran12345` |
| COURIER | `kurye@kuryecrm.local` | `Kurye12345` |

- Seed `upsert` kullanır → tekrar çalıştırmak güvenlidir, duplikasyon olmaz.
- Restoran ve kurye kullanıcılarının ilişkili `Restaurant` / `Courier` profili de
  seed sırasında oluşturulur.
- Bu kullanıcılar **yalnızca local** içindir; production'a taşınmamalıdır.

---

## 10. Bir Sonraki Fazda Yapılması Gerekenler (Faz 2 ve sonrası)

> Faz 1 bilinçli olarak dar tutuldu. Aşağıdakiler **Faz 1'de YAPILMADI** ve
> sonraki fazlara aittir. Codex bu listeden devam edebilir.

**Mimari olarak hazır olan zemin:**
- `Role` enum, guard'lar, `@Roles()` ve `@CurrentUser()` dekoratörleri hazır —
  yeni korumalı endpoint eklemek kolaydır.
- `PrismaModule` global'dir; yeni modüller doğrudan `PrismaService` enjekte eder.
- Yeni bir panel/özellik eklerken örnek olarak `admin/`, `restaurant/`,
  `courier/` modüllerinin yapısı kopyalanabilir.

**Faz 2+ için öneriler:**
1. **Restoran & Kurye yönetimi (Admin CRUD):** Admin'in restoran/kurye
   ekleyip-düzenleyip-pasifleştirebileceği endpoint'ler ve ekranlar.
2. **Vardiya (shift) sistemi:** Kurye giriş/çıkış saatleri, çalışılan saat
   hesabı. Yeni `Shift` modeli.
3. **Kurye avans sistemi:** Avans kayıtları, bakiye takibi. Yeni `Advance` modeli.
4. **Restoran cari sistemi:** Restoran borç/alacak hareketleri. Yeni
   `CurrentAccount` / `Transaction` modelleri.
5. **Gelir-gider modülü:** Genel muhasebe kayıtları.
6. **Raporlama:** Tarih aralığına göre özet ve dökümler, dashboard grafikleri.
7. **Teknik iyileştirmeler (opsiyonel):**
   - Refresh token / token yenileme akışı (şu an tek `accessToken`, süre 1 gün).
   - Şifre değiştirme / sıfırlama.
   - Rate limiting, audit log.
   - Otomatik testler (e2e ve unit).
   - CI/CD ve production deploy yapılandırması (production env doldurulduğunda).

---

### Notlar / Bilinen durumlar

- `npm install` sırasında bazı transitive bağımlılıklarda audit uyarıları
  görülebilir; Faz 1 fonksiyonelliğini etkilemez. İleride
  `npm audit fix` değerlendirilebilir.
- Prisma 5.22 kullanıldı; CLI "major version upgrade" bilgi mesajı verir, sorun
  değildir (Faz 1 sürüm sabitlemesi bilinçlidir).
- Backend route'larında global prefix kullanılmadı; yollar `/auth`, `/admin`,
  `/restaurant`, `/courier` şeklindedir. Frontend `VITE_API_URL` ile bu kökü
  hedefler.
