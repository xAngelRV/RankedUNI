import React, { useState } from 'react';
import { Trophy, Swords, User, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export function getRankDetails(elo) {
  if (elo < 800) return { name: "Escolar", color: "#A0A0A0", phrase: "Aún en el cole, practicando sumas.", min: 0, max: 799 };
  if (elo < 1200) return { name: "Postulante", color: "#CD7F32", phrase: "Haciendo su ciclo anual con fe.", min: 800, max: 1199 };
  if (elo < 1600) return { name: "Ciclero", color: "#C0C0C0", phrase: "Ya se conoce todos los locales de la academia.", min: 1200, max: 1599 };
  if (elo < 2000) return { name: "Marciano", color: "#FFD700", phrase: "Resuelve física mentalmente.", min: 1600, max: 1999 };
  if (elo < 2500) return { name: "Cómputo", color: "#00E5FF", phrase: "Peleando el primer puesto de la facultad.", min: 2000, max: 2499 };
  return { name: "Rector", color: "#E0115F", phrase: "Dueño de la UNI. Nivel Dios.", min: 2500, max: 5000 };
}

export default function Dashboard({ user, onFindMatch }) {
  const [modality, setModality] = useState('blitz');
  const [area, setArea] = useState('Matemática');
  const navigate = useNavigate();

  const handleStart = () => {
    if (modality === 'blitz') onFindMatch({ modeId: 'blitz', topic: 'Humanidades' });
    else if (modality === 'ranked') {
      const dbTopic = area === 'Matemática' ? 'Matematicas' : ' Ciencias';
      onFindMatch({ modeId: 'ranked', topic: dbTopic });
    }
    else if (modality === 'premium') onFindMatch({ modeId: 'premium', topic: 'IA_Gen' });
    else alert('Simulación General próximamente disponible.');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Lógica de ELO bar
  const rank = getRankDetails(user.elo_rating);
  let eloProgress = 100;
  let nextRankText = "Has alcanzado la cima del conocimiento";
  
  if (rank.name !== "Rector") {
    const range = rank.max - rank.min;
    const currentProgress = user.elo_rating - rank.min;
    eloProgress = Math.min(Math.max((currentProgress / range) * 100, 0), 100);
    const pointsNeeded = (rank.max + 1) - user.elo_rating;
    const nextRankName = getRankDetails(rank.max + 1).name;
    nextRankText = `Faltan ${pointsNeeded} puntos para ser ${nextRankName}`;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-blue/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 z-10">
        
        {/* Profile Card */}
        <div className="col-span-1 md:col-span-1 bg-brand-darker border border-brand-blue/30 rounded-2xl p-6 flex flex-col items-center shadow-lg shadow-brand-blue/10 relative">
          <button 
            onClick={handleLogout}
            className="absolute top-4 right-4 text-gray-400 hover:text-red-400 transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut size={20} />
          </button>

          <div className="w-24 h-24 bg-brand-blue/50 rounded-full flex items-center justify-center mb-4 ring-4 overflow-hidden" style={{ borderColor: `${rank.color}40` }}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-brand-light" />
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-wide text-white">{user.username}</h2>
          
          <div className="flex flex-col items-center mt-2 mb-2">
            <span className="text-lg font-black uppercase tracking-widest drop-shadow-md" style={{ color: rank.color }}>
              {rank.name}
            </span>
            <span className="text-xs italic text-gray-400 mt-1 text-center px-2">
              "{rank.phrase}"
            </span>
          </div>

          <div className="flex gap-2 mt-2">
            {user.role === 'PREMIUM' && (
              <span className="px-3 py-1 bg-brand-gold/20 text-brand-gold border border-brand-gold/50 text-xs font-bold rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                Premium
              </span>
            )}
            {user.role === 'ESTANDAR' && (
              <span className="px-3 py-1 bg-gray-700/50 text-gray-300 border border-gray-600 text-xs font-semibold rounded-full uppercase tracking-wider">
                Estándar
              </span>
            )}
            {user.role === 'ADMIN' && (
              <span className="px-3 py-1 bg-red-500/20 text-red-500 border border-red-500/50 text-xs font-bold rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                Admin
              </span>
            )}
          </div>
          
          <div className="mt-8 w-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">ELO</span>
              <span className="font-bold text-lg drop-shadow-md" style={{ color: rank.color }}>{user.elo_rating}</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden relative shadow-inner">
              <div 
                className="absolute top-0 left-0 h-full transition-all duration-1000"
                style={{ width: `${eloProgress}%`, backgroundColor: rank.color, boxShadow: `0 0 10px ${rank.color}` }}
              ></div>
            </div>
            <div className="text-center text-xs text-gray-400 mt-2 font-medium">{nextRankText}</div>
          </div>

          {user.role === 'ADMIN' && (
            <button 
              onClick={() => navigate('/admin')}
              className="mt-6 w-full py-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-400 font-bold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              🛡️ Panel de Administración
            </button>
          )}
        </div>

        {/* Main Action Area */}
        <div className="col-span-1 md:col-span-2 bg-brand-darker border border-brand-blue/30 rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden group shadow-lg shadow-brand-gold/5">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
          
          <Trophy size={64} className="text-brand-gold mb-6 opacity-80 drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
          
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2 text-center">
            Arena Competitiva
          </h1>
          <p className="text-gray-400 text-center mb-6 max-w-md">
            Enfréntate a otros estudiantes en tiempo real, resuelve problemas y sube en el ranking nacional.
          </p>

          <div className="w-full max-w-sm mb-8 space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2 font-semibold">Modalidad de Juego</label>
              <select 
                value={modality} 
                onChange={(e) => setModality(e.target.value)}
                className="w-full bg-brand-dark border border-brand-blue/50 rounded-lg p-3 text-white focus:outline-none focus:border-brand-gold transition-colors"
              >
                <option value="blitz">⚡ Blitz (Speed Run RM/RV)</option>
                <option value="ranked">🎯 Ranked por Áreas (Mejor de 3)</option>
                <option value="premium">✨ Arena Premium (IA Inédita)</option>
                <option value="simulacion">📚 Simulación General (Próximamente)</option>
              </select>
            </div>
            
            {modality === 'ranked' && (
              <div className="animate-fade-in">
                <label className="block text-gray-400 text-sm mb-2 font-semibold">Elige tu Arena</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Matemática', 'Ciencias'].map(a => (
                    <button
                      key={a}
                      onClick={() => setArea(a)}
                      className={`py-3 px-2 text-sm rounded border transition-all font-bold ${area === a ? 'bg-brand-blue/30 border-brand-gold text-brand-gold shadow-inner' : 'bg-brand-dark border-brand-blue/30 text-gray-400 hover:border-brand-blue'}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handleStart}
            disabled={modality === 'simulacion'}
            className={`group relative inline-flex items-center justify-center px-8 py-4 font-bold rounded-full overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-dark
              ${modality === 'simulacion' 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-brand-gold text-brand-dark hover:scale-105 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]'
              }`}
          >
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative flex items-center gap-2 text-lg">
              <Swords size={24} />
              {modality === 'simulacion' ? 'No Disponible' : 'Buscar Partida Ranked'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
