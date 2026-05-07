const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

const BASE_URL = "https://ziboanpnqrzwdzelmwkf.supabase.co/storage/v1/object/public/banco_preguntas";

function obtenerCategoria(curso) {
    const ciencias = ['Fisica', 'Quimica'];
    // Añadidos más cursos por si acaso
    const mates = ['Algebra', 'Aritmetica', 'Geometria', 'Trigonometria'];

    if (ciencias.includes(curso)) return 'Ciencias';
    if (mates.includes(curso)) return 'Matematicas';
    return 'Humanidades'; // RM, RV, Letras, etc.
}

async function main() {
    const rawData = fs.readFileSync('./preguntas_nuevas.json', 'utf8');
    const preguntas = JSON.parse(rawData);

    console.log(`⏳ Encontradas ${preguntas.length} preguntas. Iniciando subida...`);

    for (const p of preguntas) {
        const categoria = obtenerCategoria(p.curso);

        // 1. Nos aseguramos de que el archivo termine en .png (por si te olvidaste de ponerlo en el JSON)
        const nombreArchivo = p.archivo.endsWith('.png') ? p.archivo : `${p.archivo}.png`;

        // 2. Armamos la ruta correcta incluyendo la Categoría en el medio
        const linkImagen = `${BASE_URL}/${categoria}/${p.curso}/${nombreArchivo}`;

        await prisma.question.create({
            data: {
                category: categoria,
                course: p.curso,
                statement: "Pregunta de Admisión UNI",
                imageUrl: linkImagen, // Aquí va el link ya corregido
                options: ["A", "B", "C", "D", "E"],
                correctOption: p.clave,
                eloDifficulty: 1200
            }
        });
        console.log(`✅ Guardada: ${categoria} > ${p.curso} > ${nombreArchivo}`);
    }

    console.log("🎉 ¡Subida completada con enlaces corregidos!");
}

main()
    .catch(e => console.error("❌ Error:", e))
    .finally(async () => await prisma.$disconnect());