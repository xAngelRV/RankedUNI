const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const prisma = new PrismaClient();

// Inicializar Gemini (Añadir GEMINI_API_KEY en backend/.env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'placeholder_key');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function generateEditorial(questionUrl, correctAnswer) {
  try {
    const prompt = `Eres un profesor de la academia preuniversitaria UNI. Aquí tienes la URL de una imagen con un problema matemático/científico y su respuesta correcta es la clave ${correctAnswer}. Explica paso a paso de forma muy breve cómo llegar a esa solución. URL: ${questionUrl}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error generando explicación IA:", error);
    return "La explicación detallada de esta pregunta está temporalmente no disponible.";
  }
}

function calculateElo(ratingA, ratingB, actualScoreA) {
  const K = 32;
  const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return Math.round(ratingA + K * (actualScoreA - expectedScoreA));
}

async function processMatchEnd(player1, player2, scoreP1) {
  try {
    const user1 = await prisma.user.findUnique({ where: { id: player1.id } });
    const user2 = await prisma.user.findUnique({ where: { id: player2.id } });

    if (!user1 || !user2) throw new Error("Users not found in DB");

    const newElo1 = calculateElo(user1.elo, user2.elo, scoreP1);
    const newElo2 = calculateElo(user2.elo, user1.elo, 1 - scoreP1);

    const eloChange1 = newElo1 - user1.elo;
    const eloChange2 = newElo2 - user2.elo;

    await prisma.$transaction([
      prisma.user.update({ where: { id: user1.id }, data: { elo: newElo1 } }),
      prisma.user.update({ where: { id: user2.id }, data: { elo: newElo2 } })
    ]);

    return {
      [player1.socketId]: { eloChange: eloChange1 },
      [player2.socketId]: { eloChange: eloChange2 }
    };
  } catch (error) {
    console.error("Error in processMatchEnd:", error);
    return {
      [player1.socketId]: { eloChange: 0 },
      [player2.socketId]: { eloChange: 0 }
    };
  }
}

const app = express();
app.use(cors({
  origin: ['https://ranked-uni.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// --- ENDPOINTS REST ---

// 1. Obtener perfil por UID de Supabase
app.get('/api/users/profile/:uid', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabase_uid: req.params.uid }
    });
    if (user) {
      return res.json({ exists: true, user });
    }
    return res.json({ exists: false });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Verificar disponibilidad de Nickname
app.get('/api/users/check-nickname/:nickname', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.nickname }
    });
    return res.json({ available: !user });
  } catch (error) {
    console.error('Error checking nickname:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Sincronizar (Crear) usuario después del Onboarding
app.post('/api/users/sync', async (req, res) => {
  try {
    const { supabase_uid, username, first_name, last_name, email } = req.body;

    // Verificar si ya existe el uid para evitar duplicados
    const existing = await prisma.user.findUnique({ where: { supabase_uid } });
    if (existing) return res.status(400).json({ error: 'User already synced' });

    const newUser = await prisma.user.create({
      data: {
        supabase_uid,
        username,
        first_name,
        last_name,
        email,
        elo_rating: 0,
        role: 'ESTANDAR'
      }
    });

    res.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Error syncing user' });
  }
});

// 4. Listar todos los usuarios (Admin)
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        first_name: true,
        last_name: true,
        role: true,
        elo_rating: true,
      },
      orderBy: { id: 'asc' }
    });
    res.json({ users });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// 5. Actualizar rol de usuario (Admin)
app.put('/api/admin/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const userId = parseInt(req.params.id, 10);

    if (!['ESTANDAR', 'PREMIUM', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Error updating role' });
  }
});

// --- SOCKET.IO ---

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://ranked-uni.vercel.app', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const GAME_MODES = {
  ranked: { maxRounds: 3, timer: 120, requirePremium: false, useAI: false },
  blitz: { maxRounds: 1, timer: 60, requirePremium: false, useAI: false },
  premium: { maxRounds: 3, timer: 90, requirePremium: true, useAI: true }
};

// Variables en memoria para el matchmaking (MVP)
let queues = {};
let activeMatches = {}; // roomName -> matchState

io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Evento para buscar partida
  socket.on('find_match', async (userData) => {
    console.log(`Usuario ${userData?.username || socket.id} buscando partida...`);
    const modeId = userData.modeId || 'blitz';
    const topic = userData.topic || 'Aptitud Académica';
    const modeConfig = GAME_MODES[modeId] || GAME_MODES.ranked;

    if (modeConfig.requirePremium && userData.role !== 'PREMIUM') {
      socket.emit('auth_error', { message: 'Esta modalidad requiere una suscripción PREMIUM.' });
      return;
    }

    const queueName = `${modeId}_${topic}`;
    if (!queues[queueName]) queues[queueName] = [];

    // Si ya hay alguien esperando, los emparejamos
    if (queues[queueName].length > 0) {
      const opponent = queues[queueName].pop();

      // Creamos una sala única para estos dos jugadores
      const roomName = `match_${opponent.socketId}_${socket.id}`;
      socket.join(roomName);

      // El oponente ya estaba conectado, lo metemos a la sala
      const opponentSocket = io.sockets.sockets.get(opponent.socketId);
      if (opponentSocket) {
        opponentSocket.join(roomName);
      }

      console.log(`Partida encontrada! Sala: ${roomName}`);

      // Obtener pregunta
      let question;
      if (modeConfig.useAI) {
        // MOCK LLM
        question = {
          id: 'premium-mock-' + Date.now(),
          statement: "Resuelve la siguiente ecuación: $2x + 5 = 15$",
          options: ["2", "5", "10", "15", "20"],
          correctOption: "5",
          course: "Álgebra Inédita",
          estimated_time_seconds: modeConfig.timer
        };
      } else {
        try {
          const whereClause = modeId === 'blitz' ? {} : {
            OR: [
              { course: topic },
              { category: topic }
            ]
          };
          const questionsCount = await prisma.question.count({ where: whereClause });
          if (questionsCount > 0) {
            const skip = Math.floor(Math.random() * questionsCount);
            question = await prisma.question.findFirst({ where: whereClause, skip });
          }
        } catch (e) {
          console.error("Error al obtener la pregunta de la BD:", e);
        }
      }

      if (!question) {
        question = {
          id: 'fallback-1',
          category: 'Matemática',
          course: 'Álgebra',
          statement: 'Resuelve la siguiente ecuación: $2x + 5 = 15$. ¿Cuál es el valor de $x$?',
          options: ['2', '3', '5', '10', '15'],
          correctOption: '5',
          eloDifficulty: 1200
        };
      }

      question.estimated_time_seconds = modeConfig.timer;

      // Guardar el estado de la partida
      activeMatches[roomName] = {
        roomName,
        modeId,
        topic,
        maxRounds: modeConfig.maxRounds,
        currentRound: 1,
        question: question,
        players: [
          { ...opponent, score: 0, answer: null, time: null },
          { ...userData, socketId: socket.id, score: 0, answer: null, time: null }
        ]
      };

      // Emitimos a la sala que la partida comenzó
      io.to(roomName).emit('match_start', {
        room: roomName,
        players: [opponent, { ...userData, socketId: socket.id }],
        question: question,
        mode: modeId,
        maxRounds: activeMatches[roomName].maxRounds,
        currentRound: 1,
        timer: modeConfig.timer
      });

    } else {
      // Si no hay nadie, este jugador espera
      queues[queueName].push({ ...userData, socketId: socket.id });
      socket.emit('waiting_for_match');
    }
  });

  socket.on('submit_answer', async ({ roomName, answer, timeRemaining }) => {
    const match = activeMatches[roomName];
    if (!match) return;

    const player = match.players.find(p => p.socketId === socket.id);
    if (!player || player.answer !== null) return; // Ya respondió

    player.answer = answer;
    player.timeRemaining = timeRemaining;

    // Verificar si ambos respondieron (o si es Muerte Súbita, si alguien se equivocó/acertó)
    const opponent = match.players.find(p => p.socketId !== socket.id);

    if (match.modeId === 'blitz') {
      // Duelo rápido: Muerte súbita mejorada
      const isCorrect = answer !== null && answer === (match.question.correctOption || match.question.correct_answer);
      const estimatedTime = match.question.estimated_time_seconds || 60;
      const timeTaken = estimatedTime - timeRemaining;

      if (isCorrect) {
        // Gana inmediatamente
        player.score = 1;
        const aiExplanation = await generateEditorial(match.question.imageUrl || match.question.image_url, match.question.correctOption || match.question.correct_answer);

        const dbResults = await processMatchEnd(player, opponent, 1);
        dbResults[player.socketId].reason = 'Respondiste correctamente primero';
        dbResults[opponent.socketId].reason = 'Tu oponente respondió correctamente primero';

        io.to(roomName).emit('match_end', {
          winner: player.socketId,
          match,
          correctAnswer: match.question.correctOption || match.question.correct_answer,
          timeTaken,
          aiExplanation,
          results: dbResults
        });
        delete activeMatches[roomName];
      } else {
        // Respondió mal o se le acabó el tiempo
        if (opponent.answer !== null) {
          // El rival también había respondido (y obligatoriamente mal, porque si hubiera respondido bien ya habría ganado y la sala se habría borrado)
          // Empate
          const aiExplanation = await generateEditorial(match.question.imageUrl || match.question.image_url, match.question.correctOption || match.question.correct_answer);

          const dbResults = await processMatchEnd(player, opponent, 0.5);
          dbResults[player.socketId].reason = 'Ambos respondieron incorrectamente';
          dbResults[opponent.socketId].reason = 'Ambos respondieron incorrectamente';

          io.to(roomName).emit('match_end', {
            winner: 'tie',
            match,
            correctAnswer: match.question.correctOption || match.question.correct_answer,
            timeTaken,
            aiExplanation,
            results: dbResults
          });
          delete activeMatches[roomName];
        } else {
          // El rival todavía no responde
          io.to(player.socketId).emit('lock_screen', { message: 'Respuesta incorrecta. Esperando al rival...' });
          io.to(opponent.socketId).emit('opponent_failed', { message: 'Tu rival se equivocó. ¡Aprovecha tu tiempo!' });
        }
      }
    } else {
      // Mejor de 3 (Ranked por áreas)
      if (player.answer !== null && opponent.answer !== null) {
        // Ambos respondieron
        const p1Correct = player.answer === (match.question.correctOption || match.question.correct_answer);
        const p2Correct = opponent.answer === (match.question.correctOption || match.question.correct_answer);

        let roundWinner = null;
        if (p1Correct && !p2Correct) {
          player.score += 1;
          roundWinner = player.socketId;
        } else if (!p1Correct && p2Correct) {
          opponent.score += 1;
          roundWinner = opponent.socketId;
        } else if (p1Correct && p2Correct) {
          // Ambos correctos, gana el que respondió más rápido (mayor timeRemaining)
          if (player.timeRemaining > opponent.timeRemaining) {
            player.score += 1;
            roundWinner = player.socketId;
          } else if (opponent.timeRemaining > player.timeRemaining) {
            opponent.score += 1;
            roundWinner = opponent.socketId;
          } else {
            // Empate perfecto
            roundWinner = 'tie';
          }
        } else {
          // Ambos incorrectos
          roundWinner = 'tie';
        }

        io.to(roomName).emit('round_result', { roundWinner, match });

        // Comprobar fin de partida
        const roundsToWin = Math.ceil(match.maxRounds / 2);
        if (player.score === roundsToWin || opponent.score === roundsToWin || match.currentRound === match.maxRounds) {
          let matchWinner = null;
          if (player.score > opponent.score) matchWinner = player.socketId;
          else if (opponent.score > player.score) matchWinner = opponent.socketId;
          else matchWinner = 'tie';

          const aiExplanation = await generateEditorial(match.question.imageUrl || match.question.image_url, match.question.correctOption || match.question.correct_answer);

          let scoreP1 = 0.5;
          if (matchWinner === player.socketId) scoreP1 = 1;
          else if (matchWinner === opponent.socketId) scoreP1 = 0;

          const dbResults = await processMatchEnd(player, opponent, scoreP1);
          dbResults[player.socketId].reason = scoreP1 === 1 ? 'Ganaste la partida' : (scoreP1 === 0 ? 'Perdiste la partida' : 'Empate');
          dbResults[opponent.socketId].reason = scoreP1 === 0 ? 'Ganaste la partida' : (scoreP1 === 1 ? 'Perdiste la partida' : 'Empate');

          setTimeout(() => {
            io.to(roomName).emit('match_end', {
              winner: matchWinner,
              match,
              aiExplanation,
              results: dbResults
            });
            delete activeMatches[roomName];
          }, 3000);
        } else {
          // Siguiente ronda
          match.currentRound += 1;
          player.answer = null;
          opponent.answer = null;

          setTimeout(async () => {
            let nextQuestion;
            if (GAME_MODES[match.modeId]?.useAI) {
              nextQuestion = {
                id: 'premium-mock-' + Date.now(),
                statement: "Resuelve la siguiente ecuación: $2x + 5 = 15$",
                options: ["2", "5", "10", "15", "20"],
                correctOption: "5",
                course: "Álgebra Inédita",
                estimated_time_seconds: GAME_MODES[match.modeId].timer
              };
            } else {
              try {
                const whereClause = {
                  OR: [
                    { course: match.topic },
                    { category: match.topic }
                  ]
                };
                const qCount = await prisma.question.count({ where: whereClause });
                if (qCount > 0) {
                  const skip = Math.floor(Math.random() * qCount);
                  nextQuestion = await prisma.question.findFirst({ where: whereClause, skip });
                }
              } catch (e) {
                console.error(e);
              }
            }
            if (!nextQuestion) nextQuestion = match.question; // fallback
            nextQuestion.estimated_time_seconds = GAME_MODES[match.modeId]?.timer || 60;
            match.question = nextQuestion;

            io.to(roomName).emit('next_round', { currentRound: match.currentRound, question: nextQuestion, timer: nextQuestion.estimated_time_seconds });
          }, 3000);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    // Quitar de la cola si estaba esperando
    Object.keys(queues).forEach(mode => {
      queues[mode] = queues[mode].filter(p => p.socketId !== socket.id);
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor de RankedUNI corriendo en el puerto ${PORT}`);
});
