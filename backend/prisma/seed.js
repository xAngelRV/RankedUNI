const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with initial questions...');

  // 1. Pregunta de Álgebra
  const q1 = await prisma.question.create({
    data: {
      category: 'Matemática',
      course: 'Álgebra',
      statement: 'Resuelve la siguiente ecuación: $2x + 5 = 15$. ¿Cuál es el valor de $x$?',
      options: ['2', '3', '5', '10', '15'],
      correctOption: '5',
      eloDifficulty: 1200,
    },
  });

  // 2. Pregunta de RM
  const q2 = await prisma.question.create({
    data: {
      category: 'Aptitud Académica',
      course: 'Razonamiento Matemático',
      statement: 'Si el ayer del pasado mañana es lunes, ¿qué día será el mañana de ayer?',
      options: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves'],
      correctOption: 'Domingo',
      eloDifficulty: 1250,
    },
  });

  // 3. Pregunta de Física
  const q3 = await prisma.question.create({
    data: {
      category: 'Ciencias',
      course: 'Física',
      statement: 'Un móvil parte del reposo con una aceleración constante de $2 m/s^2$. ¿Qué distancia habrá recorrido en 5 segundos?',
      options: ['10 m', '15 m', '20 m', '25 m', '50 m'],
      correctOption: '25 m',
      eloDifficulty: 1300,
    },
  });

  console.log('Seeding completed successfully!');
  console.log({ q1, q2, q3 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
