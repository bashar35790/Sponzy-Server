import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Supabase database with initial data...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Admin & Creators
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sponzy.com' },
    update: {},
    create: {
      name: 'Platform Admin',
      username: 'admin',
      email: 'admin@sponzy.com',
      password: hashedPassword,
      role: 'ADMIN',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
      isVerified: true,
      walletBalance: 500.0,
    },
  });

  const creator1 = await prisma.user.upsert({
    where: { email: 'elena@sponzy.com' },
    update: {},
    create: {
      name: 'Elena Ray',
      username: 'elenaray',
      email: 'elena@sponzy.com',
      password: hashedPassword,
      role: 'CREATOR',
      bio: 'Fashion & Visual artist. Exclusive weekly 4K sets, behind-the-scenes, and daily 1-on-1 private messaging! ✨',
      profession: 'Fashion & Visual Creator',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
      creatorMonthlyPrice: 9.99,
      isVerified: true,
      isFeatured: true,
      walletBalance: 250.0,
    },
  });

  const creator2 = await prisma.user.upsert({
    where: { email: 'alex@sponzy.com' },
    update: {},
    create: {
      name: 'Alex Rivera',
      username: 'alexrivera',
      email: 'alex@sponzy.com',
      password: hashedPassword,
      role: 'CREATOR',
      bio: 'Transform your body with custom workouts, daily meal plans & live coaching sessions.',
      profession: 'Fitness Coach & Athlete',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop&q=80',
      creatorMonthlyPrice: 14.99,
      isVerified: true,
      isFeatured: true,
      walletBalance: 120.0,
    },
  });

  // 2. Create Subscription Plans for Creator 1
  await prisma.plan.createMany({
    data: [
      {
        creatorId: creator1.id,
        name: 'Monthly VIP Access',
        interval: '1 Month',
        price: 9.99,
      },
      {
        creatorId: creator1.id,
        name: '3-Month VIP Pass (15% Off)',
        interval: '3 Months',
        price: 24.99,
      },
      {
        creatorId: creator1.id,
        name: 'Annual VIP Pass (30% Off)',
        interval: '1 Year',
        price: 79.99,
      },
    ],
    skipDuplicates: true,
  });

  // 3. Create Sample Posts
  const post1 = await prisma.post.create({
    data: {
      userId: creator1.id,
      description: 'Sunset coastal photo session from yesterday afternoon! ✨ Full resolution 4K gallery is below.',
      lockType: 'FREE',
      media: {
        create: [
          {
            type: 'IMAGE',
            url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
          },
        ],
      },
    },
  });

  const post2 = await prisma.post.create({
    data: {
      userId: creator1.id,
      description: 'Exclusive private set for my active VIP subscribers ❤️ Thank you for the support!',
      lockType: 'SUBSCRIBERS_ONLY',
      price: 0,
      media: {
        create: [
          {
            type: 'IMAGE',
            url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop&q=80',
            thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=10',
          },
        ],
      },
    },
  });

  const post3 = await prisma.post.create({
    data: {
      userId: creator2.id,
      description: 'Full 45-minute High Intensity Gym Session + Printable Workout Guide 🏋️‍♂️',
      lockType: 'PAY_PER_VIEW',
      price: 4.99,
      media: {
        create: [
          {
            type: 'IMAGE',
            url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop&q=80',
            thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&auto=format&fit=crop&q=10',
          },
        ],
      },
    },
  });

  // 4. Create Sample Digital Products in Shop
  await prisma.product.createMany({
    data: [
      {
        creatorId: creator1.id,
        name: 'Autumn Warmth Lightroom Presets (Desktop & Mobile)',
        description: 'Pack of 12 signature presets tailored for warm sunsets and golden hour portraits.',
        price: 19.99,
        isPhysical: false,
        previewUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
        fileUrl: 'https://example.com/download/presets.zip',
        salesCount: 38,
      },
      {
        creatorId: creator2.id,
        name: '12-Week Hypertrophy & Fat Loss Blueprint',
        description: 'Complete workout routine and nutrition plan for muscle growth and endurance.',
        price: 29.99,
        isPhysical: false,
        previewUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
        fileUrl: 'https://example.com/download/workout-plan.pdf',
        salesCount: 64,
      },
    ],
    skipDuplicates: true,
  });

  // 5. Create Sample Stories
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 24);

  await prisma.story.create({
    data: {
      userId: creator1.id,
      mediaUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
      caption: 'Shooting new video today! 🎬',
      expiresAt: tomorrow,
    },
  });

  // 6. Create Sample Reels
  await prisma.reel.createMany({
    data: [
      {
        userId: creator1.id,
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4',
        caption: 'Night vibes in Tokyo ✨ Neon aesthetics and midnight shoots.',
        audioTrack: 'Elena Ray • Midnight Dream',
      },
      {
        userId: creator2.id,
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-athlete-working-out-with-heavy-ropes-in-a-gym-41588-large.mp4',
        caption: 'Battle rope finisher! 5 sets of 45s 🔥',
        audioTrack: 'Workout Beats • High Energy Vol. 4',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed completed successfully!');
  console.log('👤 Admin login: admin@sponzy.com / password123');
  console.log('👤 Creator login: elena@sponzy.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
