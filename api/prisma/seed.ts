// Jeu de données de démo.
//   1 édition · 3 jours · 5 créneaux/jour · 9 missions publiques + 2 sensibles
//   135 MissionSlot · 130 codes d'invitation · 3 admins · ~40 bénévoles
// Lancer :  npx prisma db seed   (ou : docker compose exec api npx prisma db seed)

import { PrismaClient } from '@prisma/client';
import type { Mission, TimeSlot, MissionSlot } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const prisma = new PrismaClient();

const hashCode = (code: string) =>
  createHash('sha256').update(code).digest('hex');

const SLOTS = [
  ['08:30', '10:00'],
  ['10:00', '12:00'],
  ['12:00', '14:00'],
  ['14:00', '16:00'],
  ['16:00', '18:00'],
];

const DAYS = [
  ['Vendredi 14 mai 2027', '2027-05-14'],
  ['Samedi 15 mai 2027', '2027-05-15'],
  ['Dimanche 16 mai 2027', '2027-05-16'],
];

const PUBLIC_MISSIONS = [
  'Accueil exposants',
  'Vestiaires',
  'Point Info',
  'Masterclass / Conférences',
  'Loges danseurs',
  'Logistique (Niveau 0 et -2)',
  'Scène principale',
  'Stand JayDance',
  'Village Danses du Monde',
];
const SENSITIVE_MISSIONS = ['Billetterie', 'Caisse'];

const FIRST_NAMES = ['Camille', 'Léa', 'Hugo', 'Nina', 'Louis', 'Jade', 'Tom', 'Manon', 'Enzo', 'Chloé', 'Nathan', 'Sarah', 'Lucas', 'Emma', 'Théo', 'Inès'];
const LAST_NAMES = ['Martin', 'Bernard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Michel', 'Garcia', 'Roux', 'Fontaine'];
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

async function main() {
  console.log('Nettoyage…');
  await prisma.auditLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.missionSlot.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.day.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.invitationCode.deleteMany();
  await prisma.volunteerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.edition.deleteMany();

  // --- Édition ---
  const edition = await prisma.edition.create({
    data: {
      name: 'Salon de la Danse — Angers 2027',
      startDate: new Date('2027-05-14'),
      endDate: new Date('2027-05-16'),
      // Fenêtre ouverte pendant le développement (englobe aujourd'hui) ;
      // l'admin la resserrera pour l'édition réelle.
      registrationOpensAt: new Date('2026-06-01'),
      registrationClosesAt: new Date('2027-05-13'),
      minSlots: 1,
      maxSlots: 3,
      orangeThresholdPct: 25,
    },
  });

  // --- Missions ---
  const missions: Mission[] = [];
  for (const name of PUBLIC_MISSIONS) {
    missions.push(await prisma.mission.create({
      data: { editionId: edition.id, name, isPublic: true, defaultCapacity: 4 },
    }));
  }
  for (const name of SENSITIVE_MISSIONS) {
    await prisma.mission.create({
      data: { editionId: edition.id, name, isPublic: false, defaultCapacity: 2 },
    });
  }

  // --- Jours, créneaux, créneaux réservables ---
  const allTimeSlots: TimeSlot[] = [];
  for (const [label, iso] of DAYS) {
    const day = await prisma.day.create({
      data: { editionId: edition.id, label, date: new Date(iso) },
    });
    for (let i = 0; i < SLOTS.length; i++) {
      const ts = await prisma.timeSlot.create({
        data: { dayId: day.id, indexInDay: i, startTime: SLOTS[i][0], endTime: SLOTS[i][1] },
      });
      allTimeSlots.push(ts);
      for (const mission of missions) {
        await prisma.missionSlot.create({
          data: { missionId: mission.id, timeSlotId: ts.id, capacity: mission.defaultCapacity },
        });
      }
    }
  }
  console.log(`${missions.length} missions publiques × ${allTimeSlots.length} créneaux = ${missions.length * allTimeSlots.length} créneaux réservables`);

  // Les codes d'invitation sont désormais nominatifs : chaque bénévole est
  // créé via son code (consommé), et quelques codes de test restent disponibles.

  // --- Admins ---
  const adminPass = await argon2.hash('Admin2027!');
  for (const email of ['admin@salon-danse.fr', 'orga@salon-danse.fr', 'staff@salon-danse.fr']) {
    await prisma.user.create({
      data: { email, passwordHash: adminPass, role: 'ADMIN' },
    });
  }

  // --- Bénévoles fictifs ---
  const volunteerPass = await argon2.hash('Benevole2027!');
  const capacityLeft = new Map<string, number>();
  const missionSlots = await prisma.missionSlot.findMany();
  for (const ms of missionSlots) capacityLeft.set(ms.id, ms.capacity);
  const slotsByTime = new Map<string, MissionSlot[]>();
  for (const ms of missionSlots) {
    const arr = slotsByTime.get(ms.timeSlotId) ?? [];
    arr.push(ms);
    slotsByTime.set(ms.timeSlotId, arr);
  }

  let validatedCount = 0;
  for (let i = 0; i < 40; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const user = await prisma.user.create({
      data: {
        email: `${first}.${last}.${i}@example.com`.toLowerCase(),
        passwordHash: volunteerPass,
        role: 'VOLUNTEER',
      },
    });
    const isMinor = Math.random() < 0.1;
    const willValidate = Math.random() < 0.5;
    const profile = await prisma.volunteerProfile.create({
      data: {
        userId: user.id,
        editionId: edition.id,
        firstName: first,
        lastName: last,
        phone: '06' + Math.floor(10000000 + Math.random() * 89999999),
        isMinor,
        validationStatus: isMinor ? 'PENDING' : 'VALIDATED',
        planningStatus: willValidate ? 'VALIDATED' : 'DRAFT',
        planningValidatedAt: willValidate ? new Date() : null,
      },
    });
    if (willValidate) validatedCount++;

    // Ce compte a été créé via un code d'invitation nominatif (désormais consommé).
    const code = randomBytes(4).toString('hex').toUpperCase();
    await prisma.invitationCode.create({
      data: {
        editionId: edition.id,
        email: user.email,
        codeHash: hashCode(code),
        plainCode: code,
        status: 'CONSUMED',
        consumedById: profile.id,
        consumedAt: new Date(),
      },
    });

    // 1 à 3 créneaux sur des tranches horaires distinctes (respecte la contrainte)
    const nbSlots = 1 + Math.floor(Math.random() * 3);
    const shuffled = [...allTimeSlots].sort(() => Math.random() - 0.5).slice(0, nbSlots);
    for (const ts of shuffled) {
      const candidates = (slotsByTime.get(ts.id) ?? []).filter((ms) => (capacityLeft.get(ms.id) ?? 0) > 0);
      if (candidates.length === 0) continue;
      const ms = pick(candidates);
      await prisma.booking.create({
        data: {
          volunteerProfileId: profile.id,
          missionSlotId: ms.id,
          timeSlotId: ts.id,
          status: willValidate ? 'VALIDATED' : 'DRAFT',
        },
      });
      capacityLeft.set(ms.id, (capacityLeft.get(ms.id) ?? 1) - 1);
    }
  }

  // --- Compte bénévole de démo (accès complet : photo + planning validé) ---
  const demoEmail = 'benevole@salon-danse.fr';
  const demoUser = await prisma.user.create({
    data: { email: demoEmail, passwordHash: volunteerPass, role: 'VOLUNTEER' },
  });
  const demoKey = 'profiles/demo-benevole.jpg';
  const demoProfile = await prisma.volunteerProfile.create({
    data: {
      userId: demoUser.id,
      editionId: edition.id,
      firstName: 'Camille',
      lastName: 'Démo',
      phone: '0600000000',
      isMinor: false,
      validationStatus: 'VALIDATED',
      planningStatus: 'VALIDATED',
      planningValidatedAt: new Date(),
      photoKey: demoKey,
    },
  });
  const demoVolCode = randomBytes(4).toString('hex').toUpperCase();
  await prisma.invitationCode.create({
    data: {
      editionId: edition.id,
      email: demoEmail,
      codeHash: hashCode(demoVolCode),
      plainCode: demoVolCode,
      status: 'CONSUMED',
      consumedById: demoProfile.id,
      consumedAt: new Date(),
    },
  });
  for (const ts of [...allTimeSlots].sort(() => Math.random() - 0.5).slice(0, 2)) {
    const candidates = (slotsByTime.get(ts.id) ?? []).filter((ms) => (capacityLeft.get(ms.id) ?? 0) > 0);
    if (!candidates.length) continue;
    const ms = pick(candidates);
    await prisma.booking.create({
      data: { volunteerProfileId: demoProfile.id, missionSlotId: ms.id, timeSlotId: ts.id, status: 'VALIDATED' },
    });
    capacityLeft.set(ms.id, (capacityLeft.get(ms.id) ?? 1) - 1);
  }
  // Photo de démo (best-effort : nécessite MinIO joignable)
  try {
    const s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
      forcePathStyle: true,
    });
    const img = await sharp({
      create: { width: 600, height: 600, channels: 3, background: { r: 122, g: 41, b: 30 } },
    })
      .jpeg()
      .toBuffer();
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET || 'photos',
        Key: demoKey,
        Body: img,
        ContentType: 'image/jpeg',
      }),
    );
  } catch (e) {
    console.warn('Photo de démo non uploadée (MinIO injoignable ?) :', (e as Error).message);
  }

  // --- Codes de test disponibles (pour tester l'inscription) ---
  const demoCodes: { email: string; code: string }[] = [];
  for (let i = 1; i <= 5; i++) {
    const email = `nouveau.benevole${i}@example.com`;
    const code = randomBytes(4).toString('hex').toUpperCase();
    demoCodes.push({ email, code });
    await prisma.invitationCode.create({
      data: { editionId: edition.id, email, codeHash: hashCode(code), plainCode: code },
    });
  }

  console.log('\n===== DONNÉES DE DÉMO =====');
  console.log('Admin           :  admin@salon-danse.fr    /  Admin2027!');
  console.log('Bénévole (démo) :  benevole@salon-danse.fr /  Benevole2027!  (photo + planning validé)');
  console.log('40 bénévoles créés (via code d\'invitation consommé), dont', validatedCount, 'planning validé.');
  console.log('Codes d\'invitation de test disponibles (email -> code) :');
  for (const d of demoCodes) console.log('  ', d.email, '->', d.code);
  console.log('===========================\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
