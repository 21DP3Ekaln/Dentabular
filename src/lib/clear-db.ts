import { prisma } from './prisma';

async function clearDatabase() {
  console.log('Clearing database...');
  
  // Delete all records from tables in the correct order to respect foreign key constraints
  
  // First delete junction/child tables
  await prisma.terminiLabel.deleteMany();
  await prisma.termVersionTranslation.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.labelTranslation.deleteMany();
  await prisma.categoryTranslation.deleteMany();
  
  // Then delete parent tables
  await prisma.termVersion.deleteMany();
  await prisma.termini.deleteMany();
  await prisma.label.deleteMany();
  await prisma.category.deleteMany();
  await prisma.language.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('Database cleared successfully!');
}

clearDatabase()
  .catch(e => {
    console.error('Error clearing database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
