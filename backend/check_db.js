const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const questions = await prisma.question.findMany();
  console.log("Total questions:", questions.length);
  questions.forEach(q => {
    console.log(`ID: ${q.id}`);
    console.log(`URL (old): ${q.image_url}`);
    console.log(`URL (new): ${q.imageUrl}`);
    console.log(`Statement: ${q.statement}`);
    console.log('---');
  });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
