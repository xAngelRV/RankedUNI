import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  
  const [nickname, setNickname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [nicknameStatus, setNicknameStatus] = useState(null); // null, 'checking', 'available', 'taken'
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/');
      } else {
        setSession(session);
        if (session.user.user_metadata?.full_name) {
          const parts = session.user.user_metadata.full_name.split(' ');
          if (parts.length > 0) setFirstName(parts[0]);
          if (parts.length > 1) setLastName(parts.slice(1).join(' '));
        }
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (!nickname || nickname.length < 3) {
      setNicknameStatus(null);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setNicknameStatus('checking');
      try {
        const res = await fetch(`http://localhost:3001/api/users/check-nickname/${nickname}`);
        const data = await res.json();
        setNicknameStatus(data.available ? 'available' : 'taken');
      } catch (err) {
        console.error(err);
        setNicknameStatus(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [nickname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nicknameStatus !== 'available' || !firstName || !lastName || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        supabase_uid: session.user.id,
        email: session.user.email,
        username: nickname,
        first_name: firstName,
        last_name: lastName
      };
      
      const res = await fetch('http://localhost:3001/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        // Redirigir usando force reload o navegación si App.jsx lo maneja
        window.location.href = '/dashboard';
      } else {
        alert(data.error || 'Error al guardar el perfil');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión con el servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-brand-dark text-brand-light p-6 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="z-10 bg-brand-darker border border-brand-blue/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-3xl font-bold mb-2 text-center text-white">Completa tu perfil</h2>
        <p className="text-gray-400 text-center mb-8">Necesitamos un poco más de información antes de entrar a la arena.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nickname (Único)</label>
            <div className="relative">
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                placeholder="ej. pro_student_99"
                className="w-full bg-brand-dark border border-brand-blue/50 rounded-lg p-3 text-white focus:outline-none focus:border-brand-gold pr-10"
                required
                minLength={3}
              />
              <div className="absolute inset-y-0 right-3 flex items-center">
                {nicknameStatus === 'checking' && <Loader2 size={20} className="text-gray-400 animate-spin" />}
                {nicknameStatus === 'available' && <CheckCircle size={20} className="text-green-500" />}
                {nicknameStatus === 'taken' && <XCircle size={20} className="text-red-500" />}
              </div>
            </div>
            {nicknameStatus === 'taken' && <p className="text-red-500 text-xs mt-1">Este nickname ya está en uso.</p>}
            {nicknameStatus === 'available' && <p className="text-green-500 text-xs mt-1">Nickname disponible.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nombres</label>
            <input 
              type="text" 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-brand-dark border border-brand-blue/50 rounded-lg p-3 text-white focus:outline-none focus:border-brand-gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Apellidos</label>
            <input 
              type="text" 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-brand-dark border border-brand-blue/50 rounded-lg p-3 text-white focus:outline-none focus:border-brand-gold"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={nicknameStatus !== 'available' || isSubmitting}
            className={`w-full py-4 rounded-lg font-bold transition-all ${
              nicknameStatus === 'available' && !isSubmitting
                ? 'bg-brand-gold text-brand-dark hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Guardando...' : 'Entrar al Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
