import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Seed categories
  const categories = [
    { name: 'Food & Dining', icon: '🍕', color: '#FF5722' },
    { name: 'Transport', icon: '🚗', color: '#2196F3' },
    { name: 'Rent & Housing', icon: '🏠', color: '#4CAF50' },
    { name: 'Entertainment', icon: '🎬', color: '#9C27B0' },
    { name: 'Healthcare', icon: '💊', color: '#F44336' },
    { name: 'Shopping', icon: '🛍️', color: '#FF9800' },
    { name: 'Education', icon: '📚', color: '#00BCD4' },
    { name: 'Utilities', icon: '💡', color: '#607D8B' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  // Seed admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@budget.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@budget.com',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  // Seed demo user
  const userPassword = await bcrypt.hash('User123!', 12);
  await prisma.user.upsert({
    where: { email: 'demo@budget.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@budget.com',
      password: userPassword,
    },
  });

  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
