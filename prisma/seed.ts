import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      credits: 10000,
    },
  });

  // Create test user
  const userPassword = await bcrypt.hash('test123', 10);
  await prisma.user.upsert({
    where: { username: 'test' },
    update: {},
    create: {
      username: 'test',
      password: userPassword,
      role: 'USER',
      credits: 500,
    },
  });

  // Create BASE config (required for safety check)
  await prisma.aIConfig.upsert({
    where: { name: 'BASE' },
    update: {},
    create: {
      name: 'BASE',
      displayName: '内容安全检查',
      apiKey: 'sk-xxx',
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
      creditCost: 0,
    },
  });

  // Create sample AI configs
  await prisma.aIConfig.upsert({
    where: { name: 'gpt4o-mini' },
    update: {},
    create: {
      name: 'gpt4o-mini',
      displayName: 'GPT-4o Mini (快速)',
      apiKey: 'sk-xxx',
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      creditCost: 10,
    },
  });

  await prisma.aIConfig.upsert({
    where: { name: 'gpt4o' },
    update: {},
    create: {
      name: 'gpt4o',
      displayName: 'GPT-4o (推荐)',
      apiKey: 'sk-xxx',
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      creditCost: 30,
    },
  });

  // Create sample categories
  const categories = [
    { name: 'CET4', displayName: '大学英语四级', defaultFull: 100, extraPrompt: '注重基础语法和词汇' },
    { name: 'CET6', displayName: '大学英语六级', defaultFull: 100, extraPrompt: '要求更高级的词汇和复杂句式' },
    { name: 'IELTS', displayName: '雅思', defaultFull: 9, extraPrompt: '按照雅思写作评分标准' },
    { name: 'TOEFL', displayName: '托福', defaultFull: 30, extraPrompt: '按照托福独立写作评分标准' },
    { name: 'Gaokao', displayName: '高考英语', defaultFull: 25, extraPrompt: '高考作文评分标准' },
  ];

  for (const cat of categories) {
    await prisma.categoryConfig.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
