/**
 * KuryeCrm - Local seed data.
 * Creates an ADMIN, a KURYE_SEFI, a RESTAURANT and a COURIER user with profiles.
 * Safe to re-run: uses upsert keyed on username.
 *
 * Run with: npm run seed  (or: npx prisma db seed)
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin12345', 10);

  // ---- ADMIN ----
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPassword, role: Role.ADMIN, isActive: true },
    create: {
      name: 'Sistem Yöneticisi',
      username: 'admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // A clean test database starts with exactly one account. Kurye Şefi,
  // partners, restaurants and couriers are then created from the UI.
  if (process.env.ADMIN_ONLY === 'true') {
    console.log('Admin-only seed completed:');
    console.log('  ADMIN      ->', admin.username, '/ Admin12345');
    return;
  }

  const sefPassword = await bcrypt.hash('Sef12345', 10);
  const partnerPassword = await bcrypt.hash('Ortak12345', 10);
  const restaurantPassword = await bcrypt.hash('Restoran12345', 10);
  const courierPassword = await bcrypt.hash('Kurye12345', 10);

  // ---- KURYE ŞEFİ ----
  const sef = await prisma.user.upsert({
    where: { username: 'sef' },
    update: { passwordHash: sefPassword, role: Role.KURYE_SEFI, isActive: true },
    create: {
      name: 'Kurye Şefi',
      username: 'sef',
      passwordHash: sefPassword,
      role: Role.KURYE_SEFI,
      isActive: true,
    },
  });

  // ---- ORTAKLAR (Partner) ----
  const partner = await prisma.user.upsert({
    where: { username: 'ortak' },
    update: { passwordHash: partnerPassword, role: Role.PARTNER, isActive: true },
    create: {
      name: 'Ortak Kullanıcı',
      username: 'ortak',
      passwordHash: partnerPassword,
      role: Role.PARTNER,
      isActive: true,
    },
  });

  // ---- RESTAURANT ----
  const restaurantUser = await prisma.user.upsert({
    where: { username: 'restoran' },
    update: { passwordHash: restaurantPassword, role: Role.RESTAURANT, isActive: true },
    create: {
      name: 'Örnek Restoran',
      username: 'restoran',
      passwordHash: restaurantPassword,
      role: Role.RESTAURANT,
      isActive: true,
    },
  });

  await prisma.restaurant.upsert({
    where: { userId: restaurantUser.id },
    update: {},
    create: {
      userId: restaurantUser.id,
      name: 'Örnek Restoran',
      authorizedPerson: 'Ahmet Yılmaz',
      phone: '0555 000 00 01',
      address: 'Atatürk Cad. No:1, İstanbul',
      latitude: 41.0082,
      longitude: 28.9784,
      locationNote: 'Ana giriş, cadde üzeri.',
      hourlyRate: 120.0,
      isActive: true,
    },
  });

  // ---- COURIER ----
  const courierUser = await prisma.user.upsert({
    where: { username: 'kurye' },
    update: { passwordHash: courierPassword, role: Role.COURIER, isActive: true },
    create: {
      name: 'Örnek Kurye',
      username: 'kurye',
      passwordHash: courierPassword,
      role: Role.COURIER,
      isActive: true,
    },
  });

  const seedCourier = await prisma.courier.upsert({
    where: { userId: courierUser.id },
    update: {},
    create: {
      userId: courierUser.id,
      name: 'Mehmet Demir',
      phone: '0555 000 00 02',
      plate: '34 KRY 100',
      hourlyRate: 90.0,
      isActive: true,
    },
  });

  // ---- Example SHIFT ----
  // A planned shift for tomorrow between the seed restaurant and courier.
  const seedRestaurant = await prisma.restaurant.findUnique({
    where: { userId: restaurantUser.id },
  });

  if (seedRestaurant) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().slice(0, 10); // YYYY-MM-DD

    const exists = await prisma.shift.findFirst({
      where: { restaurantId: seedRestaurant.id, courierId: seedCourier.id, date },
    });

    if (!exists) {
      await prisma.shift.create({
        data: {
          restaurantId: seedRestaurant.id,
          courierId: seedCourier.id,
          date,
          plannedStartTime: '10:00',
          plannedEndTime: '18:00',
          // Snapshots taken from current profile rates.
          restaurantHourlyRateSnapshot: seedRestaurant.hourlyRate,
          courierHourlyRateSnapshot: seedCourier.hourlyRate,
          status: 'PLANNED',
          confirmationStatus: 'WAITING',
          note: 'Örnek planlı vardiya (seed).',
        },
      });
      console.log('  SHIFT      -> örnek vardiya oluşturuldu (', date, '10:00-18:00 )');
    }
  }

  console.log('Seed completed:');
  console.log('  ADMIN      ->', admin.username, '/ Admin12345');
  console.log('  KURYE ŞEFİ ->', sef.username, '/ Sef12345');
  console.log('  ORTAK      ->', partner.username, '/ Ortak12345');
  console.log('  RESTAURANT ->', restaurantUser.username, '/ Restoran12345');
  console.log('  COURIER    ->', courierUser.username, '/ Kurye12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
