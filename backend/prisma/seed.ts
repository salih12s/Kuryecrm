/**
 * KuryeCrm - Local seed data (Phase 1).
 * Creates one ADMIN, one RESTAURANT and one COURIER user with profiles.
 * Safe to re-run: uses upsert keyed on email.
 *
 * Run with: npm run seed  (or: npx prisma db seed)
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin12345', 10);
  const restaurantPassword = await bcrypt.hash('Restoran12345', 10);
  const courierPassword = await bcrypt.hash('Kurye12345', 10);

  // ---- ADMIN ----
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kuryecrm.local' },
    update: { passwordHash: adminPassword, role: Role.ADMIN, isActive: true },
    create: {
      name: 'Sistem Yöneticisi',
      email: 'admin@kuryecrm.local',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // Useful after a clean reset: keep only the mandatory admin account so all
  // restaurants, couriers and operational data can be created from the UI.
  if (process.env.ADMIN_ONLY === 'true') {
    console.log('Admin-only seed completed:');
    console.log('  ADMIN      ->', admin.email, '/ Admin12345');
    return;
  }

  // ---- RESTAURANT ----
  const restaurantUser = await prisma.user.upsert({
    where: { email: 'restoran@kuryecrm.local' },
    update: { passwordHash: restaurantPassword, role: Role.RESTAURANT, isActive: true },
    create: {
      name: 'Örnek Restoran',
      email: 'restoran@kuryecrm.local',
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
      hourlyRate: 120.0,
      isActive: true,
    },
  });

  // ---- COURIER ----
  const courierUser = await prisma.user.upsert({
    where: { email: 'kurye@kuryecrm.local' },
    update: { passwordHash: courierPassword, role: Role.COURIER, isActive: true },
    create: {
      name: 'Örnek Kurye',
      email: 'kurye@kuryecrm.local',
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
      hourlyRate: 90.0,
      isActive: true,
    },
  });

  // ---- Example SHIFT (Phase 3) ----
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
  console.log('  ADMIN      ->', admin.email, '/ Admin12345');
  console.log('  RESTAURANT ->', restaurantUser.email, '/ Restoran12345');
  console.log('  COURIER    ->', courierUser.email, '/ Kurye12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
