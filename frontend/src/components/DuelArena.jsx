import React, { useState, useEffect } from 'react';
import { Timer, ShieldAlert } from 'lucide-react';
import AntiCheatCanvas from './AntiCheatCanvas';

export default function DuelArena({ matchData, onAnswerSubmit, currentSocketId }) {
  const { question, opponent, currentRound, maxRounds, showRoundResult, roundWinner, scores } = matchData;
  const [timeLeft, setTimeLeft] = useState(question.estimated_time_seconds);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  useEffect(() => {
    // Reset state for new round
    setTimeLeft(question.estimated_time_seconds);
    setSelectedAnswer(null);
  }, [currentRound, question]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (!selectedAnswer) onAnswerSubmit(null, 0); // Tiempo agotado
      return;
    }
    
    // Si ya respondí o si terminó la ronda, congelar tiempo
    if (selectedAnswer || showRoundResult) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, selectedAnswer, onAnswerSubmit, showRoundResult]);

  const handleAnswerClick = (option) => {
    setSelectedAnswer(option);
    onAnswerSubmit(option, timeLeft);
  };

  const options = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="min-h-screen p-6 flex flex-col items-center bg-brand-dark">
      
      {/* Header Info */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8 bg-brand-darker p-4 rounded-xl border border-brand-blue/30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400">Oponente: <span className="font-bold text-white">{opponent?.username || 'Cargando...'}</span></div>
          <span className="text-xs px-2 py-1 bg-brand-blue/30 text-brand-blue rounded font-semibold">ELO: {opponent?.elo_rating || '---'}</span>
        </div>
        
        <div className="flex gap-6 items-center">
          {maxRounds > 1 && (
            <div className="flex gap-4 items-center bg-brand-dark px-4 py-2 rounded-lg border border-brand-blue/30">
              <div className="text-center">
                <div className="text-xs text-gray-400">Ronda</div>
                <div className="font-bold text-white">{currentRound} / {maxRounds}</div>
              </div>
              <div className="w-px h-8 bg-gray-700"></div>
              <div className="text-center">
                <div className="text-xs text-brand-gold">Tú</div>
                <div className="font-bold text-white">{scores?.me || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">Op.</div>
                <div className="font-bold text-white">{scores?.opponent || 0}</div>
              </div>
            </div>
          )}

          <div className={`flex items-center gap-2 text-xl font-bold ${timeLeft <= 10 && !selectedAnswer ? 'text-red-500 animate-pulse' : 'text-brand-gold'}`}>
            <Timer />
            {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Question Canvas Container */}
      <div className="w-full max-w-4xl mb-8 relative">
        <div className="absolute -top-3 left-4 bg-brand-dark px-2 text-xs font-bold text-brand-gold uppercase tracking-widest z-10 flex items-center gap-1">
          <ShieldAlert size={14} /> Sistema Anti-Cheat Activo
        </div>
        <AntiCheatCanvas imageUrl={question.image_url} />

        {/* Overlay for Waiting / Round Result */}
        {(selectedAnswer || showRoundResult) && (
          <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-lg border border-brand-blue/50">
            {showRoundResult ? (
              <div className="text-center animate-bounce">
                <h3 className="text-4xl font-extrabold mb-2">
                  {roundWinner === currentSocketId ? (
                    <span className="text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">¡GANASTE LA RONDA!</span>
                  ) : roundWinner === 'tie' ? (
                    <span className="text-gray-300 drop-shadow-[0_0_10px_rgba(209,213,219,0.8)]">¡EMPATE!</span>
                  ) : (
                    <span className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">PERDISTE LA RONDA</span>
                  )}
                </h3>
                <p className="text-brand-gold font-bold">Preparando siguiente pregunta...</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-brand-blue border-t-brand-gold rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-2xl font-bold text-white">Respuesta Enviada</h3>
                <p className="text-gray-400">Esperando al oponente...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Answer Buttons */}
      <div className="w-full max-w-2xl grid grid-cols-5 gap-4">
        {options.map((opt) => (
          <button
            key={opt}
            disabled={!!selectedAnswer}
            onClick={() => handleAnswerClick(opt)}
            className={`
              py-4 rounded-lg text-2xl font-bold transition-all duration-200 transform
              ${selectedAnswer === opt 
                ? 'bg-brand-gold text-brand-dark scale-95' 
                : 'bg-brand-darker text-white border border-brand-blue/40 hover:bg-brand-blue/20 hover:-translate-y-1 hover:shadow-[0_5px_15px_rgba(26,54,93,0.5)]'}
              ${selectedAnswer && selectedAnswer !== opt ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
