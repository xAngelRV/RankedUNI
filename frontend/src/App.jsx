import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Dashboard from './components/Dashboard';
import DuelArena from './components/DuelArena';
import Landing from './components/Landing';
import Onboarding from './components/Onboarding';
import AdminPanel from './components/AdminPanel';
import { supabase } from './supabaseClient';
import { BrainCircuit } from 'lucide-react';

console.log("Conectando al backend en: ", import.meta.env.VITE_BACKEND_URL);
const socket = io(import.meta.env.VITE_BACKEND_URL, { withCredentials: true });

// PrivateRoute verifica si hay sesión de Supabase
const PrivateRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center text-white"><div className="w-12 h-12 border-4 border-brand-blue border-t-brand-gold rounded-full animate-spin mb-4"></div><p>Verificando sesión...</p></div>;
  if (!session) return <Navigate to="/" />;
  return React.cloneElement(children, { session });
};

function GameApp({ session }) {
  const navigate = useNavigate();
  const [appState, setAppState] = useState('dashboard'); // 'dashboard', 'waiting', 'playing', 'game_over'
  const [matchData, setMatchData] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (session) {
      // Verificar sincronización
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/profile/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (!data.exists) {
            navigate('/onboarding');
          } else {
            setUser({
              ...data.user,
              avatar_url: session.user.user_metadata?.avatar_url
            });
          }
        })
        .catch(err => console.error(err));
    }
  }, [session, navigate]);

  useEffect(() => {
    if (!user) return; // Solo suscribirse si el usuario está listo

    socket.on('connect', () => {
      console.log('Conectado al servidor de Socket.io');
    });

    socket.on('waiting_for_match', () => {
      setAppState('waiting');
    });

    socket.on('match_start', (data) => {
      const opponent = data.players.find(p => p.socketId !== socket.id);
      setMatchData({
        room: data.room,
        question: data.question,
        opponent: opponent,
        mode: data.mode,
        maxRounds: data.maxRounds,
        currentRound: data.currentRound,
        scores: { me: 0, opponent: 0 },
        roundWinner: null
      });
      setAppState('playing');
    });

    socket.on('round_result', (data) => {
      setMatchData(prev => {
        if (!prev) return prev;
        const newScores = { ...prev.scores };
        if (data.roundWinner === socket.id) newScores.me += 1;
        else if (data.roundWinner !== 'tie') newScores.opponent += 1;
        
        return {
          ...prev,
          scores: newScores,
          roundWinner: data.roundWinner,
          showRoundResult: true
        };
      });
    });

    socket.on('next_round', (data) => {
      setMatchData(prev => ({
        ...prev,
        currentRound: data.currentRound,
        question: data.question,
        showRoundResult: false,
        roundWinner: null
      }));
    });

    socket.on('match_end', (data) => {
      setMatchData(prev => ({
        ...prev,
        matchWinner: data.winner,
        appState: 'game_over',
        correctAnswer: data.correctAnswer,
        timeTaken: data.timeTaken,
        aiExplanation: data.aiExplanation,
        myResult: data.results?.[socket.id]
      }));
      setAppState('game_over');
      setShowAI(false);
    });

    socket.on('lock_screen', (data) => {
      setMatchData(prev => ({
        ...prev,
        isLocked: true,
        lockMessage: data.message
      }));
    });

    socket.on('opponent_failed', (data) => {
      setMatchData(prev => ({
        ...prev,
        opponentFailed: true,
        opponentFailedMessage: data.message
      }));
    });

    return () => {
      socket.off('connect');
      socket.off('waiting_for_match');
      socket.off('match_start');
      socket.off('round_result');
      socket.off('next_round');
      socket.off('match_end');
      socket.off('lock_screen');
      socket.off('opponent_failed');
    };
  }, [user]);

  const handleFindMatch = (payload) => {
    socket.emit('find_match', { ...user, modeId: payload.modeId, topic: payload.topic });
    setAppState('waiting');
  };

  useEffect(() => {
    socket.on('auth_error', (data) => {
      alert(data.message);
      setAppState('dashboard');
    });
    return () => socket.off('auth_error');
  }, []);

  const handleAnswerSubmit = (answer, timeRemaining) => {
    socket.emit('submit_answer', {
      roomName: matchData.room,
      answer,
      timeRemaining
    });
  };

  const handleReturnToDashboard = () => {
    // Recargar perfil para actualizar ELO
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/profile/${session.user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.exists) {
          setUser({
            ...data.user,
            avatar_url: session.user.user_metadata?.avatar_url
          });
        }
      });
    setAppState('dashboard');
    setMatchData(null);
  };

  if (!user) return <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center text-white"><div className="w-12 h-12 border-4 border-brand-blue border-t-brand-gold rounded-full animate-spin mb-4"></div><p>Cargando perfil...</p></div>;

  return (
    <div className="w-full min-h-screen bg-brand-dark text-brand-light font-sans">
      {appState === 'dashboard' && (
        <Dashboard user={user} onFindMatch={handleFindMatch} />
      )}
      
      {appState === 'waiting' && (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="w-16 h-16 border-4 border-brand-blue border-t-brand-gold rounded-full animate-spin mb-8"></div>
          <h2 className="text-2xl font-bold text-brand-light">Buscando Oponente...</h2>
          <p className="text-gray-400 mt-2">Calculando ELO y emparejamiento</p>
        </div>
      )}

      {appState === 'playing' && matchData && (
        <DuelArena matchData={matchData} onAnswerSubmit={handleAnswerSubmit} currentSocketId={socket.id} />
      )}

      {appState === 'game_over' && matchData && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <div className="bg-brand-darker border border-brand-blue/30 rounded-2xl p-10 flex flex-col items-center shadow-lg shadow-brand-blue/10 max-w-lg w-full text-center">
            <h2 className="text-4xl font-bold mb-4">
              {matchData.matchWinner === socket.id ? (
                <span className="text-green-500">¡VICTORIA!</span>
              ) : matchData.matchWinner === 'tie' ? (
                <span className="text-gray-400">¡EMPATE!</span>
              ) : (
                <span className="text-red-500">DERROTA</span>
              )}
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              Modo: <span className="font-semibold text-brand-gold">{matchData.mode === 'global' ? 'Aptitud Académica' : 'Mejor de 3 (' + matchData.mode + ')'}</span>
            </p>
            
            {matchData.mode === 'global' ? (
              <div className="flex flex-col items-center w-full mb-8 mt-2 bg-brand-dark rounded-xl p-6 border border-brand-blue/20">
                <div className={`text-5xl font-black mb-2 ${matchData.myResult?.eloChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {matchData.myResult?.eloChange > 0 ? '+' : ''}{matchData.myResult?.eloChange || 0} ELO
                </div>
                <p className="text-gray-300 text-lg italic mb-4">"{matchData.myResult?.reason}"</p>
                
                <div className="w-full h-px bg-brand-blue/20 my-2"></div>
                
                <div className="text-brand-gold mt-2 font-medium">
                  La respuesta correcta era la: <span className="font-black text-xl ml-1">{matchData.correctAnswer}</span>
                </div>
                {matchData.timeTaken && (
                  <div className="text-gray-500 text-sm mt-2 flex items-center gap-1 justify-center">
                    ⏱️ Tiempo: {matchData.timeTaken}s
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-between w-full mb-8 px-8">
                <div className="flex flex-col items-center">
                  <span className="text-gray-400">Tú</span>
                  <span className="text-4xl font-bold">{matchData.scores?.me || 0}</span>
                </div>
                <div className="text-3xl text-gray-600 font-light flex items-center">-</div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-400">{matchData.opponent?.username}</span>
                  <span className="text-4xl font-bold">{matchData.scores?.opponent || 0}</span>
                </div>
              </div>
            )}

            {matchData.aiExplanation && (
              <div className="w-full mt-4 flex flex-col items-center">
                <button 
                  onClick={() => setShowAI(!showAI)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-bold hover:opacity-90 transition-opacity mb-4"
                >
                  <BrainCircuit size={18} /> ✨ Ver Solución con IA (Premium)
                </button>
                
                {showAI && (
                  <div className="w-full bg-brand-dark border border-purple-500/30 p-4 rounded-xl text-left text-sm text-gray-300 shadow-inner mb-6 max-h-64 overflow-y-auto custom-scrollbar">
                    <p className="font-semibold text-purple-400 mb-2 border-b border-purple-500/20 pb-2">Solución generada por Gemini:</p>
                    <div className="whitespace-pre-wrap">{matchData.aiExplanation}</div>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={handleReturnToDashboard}
              className="px-6 py-4 bg-brand-gold text-brand-dark rounded-xl hover:bg-white font-bold transition-all w-full text-lg shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-[1.02]"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><GameApp /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminApp /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

function AdminApp({ session }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/profile/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (!data.exists) {
            navigate('/onboarding');
          } else if (data.user.role !== 'ADMIN') {
            navigate('/dashboard');
          } else {
            setUser({
              ...data.user,
              avatar_url: session.user.user_metadata?.avatar_url
            });
            setLoading(false);
          }
        })
        .catch(err => {
          console.error(err);
          navigate('/dashboard');
        });
    }
  }, [session, navigate]);

  if (loading || !user) return <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center text-white"><div className="w-12 h-12 border-4 border-brand-blue border-t-brand-gold rounded-full animate-spin mb-4"></div><p>Verificando permisos...</p></div>;

  return <AdminPanel user={user} />;
}
