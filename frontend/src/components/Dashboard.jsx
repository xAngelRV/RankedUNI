import React, { useState } from 'react';
import { Trophy, Swords, User, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

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
  const eloProgress = Math.min((user.elo_rating / 1000) * 100, 100);

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

          <div className="w-24 h-24 bg-brand-blue/50 rounded-full flex items-center justify-center mb-4 ring-4 ring-brand-gold/20 overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-brand-light" />
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-wide text-white">{user.username}</h2>
          
          {user.role === 'PREMIUM' && (
            <span className="px-3 py-1 mt-2 bg-brand-gold/20 text-brand-gold border border-brand-gold/50 text-xs font-bold rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(212,175,55,0.3)]">
              Premium
            </span>
          )}
          {user.role === 'ESTANDAR' && (
            <span className="px-3 py-1 mt-2 bg-gray-700/50 text-gray-300 border border-gray-600 text-xs font-semibold rounded-full uppercase tracking-wider">
              Estándar
            </span>
          )}
          {user.role === 'ADMIN' && (
            <span className="px-3 py-1 mt-2 bg-red-500/20 text-red-500 border border-red-500/50 text-xs font-bold rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.3)]">
              Admin
            </span>
          )}
          
          <div className="mt-8 w-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Rango ELO</span>
              <span className="text-brand-gold font-bold">{user.elo_rating}</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-blue to-brand-gold transition-all duration-1000"
                style={{ width: `${eloProgress}%` }}
              ></div>
            </div>
            <div className="text-right text-xs text-gray-500 mt-1">Siguiente Liga: 1000 ELO</div>
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
