import React, { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate('/dashboard');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  return (
    <div className="w-full min-h-screen bg-brand-dark text-brand-light font-sans flex flex-col items-center justify-center relative overflow-hidden p-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-blue/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="z-10 flex flex-col items-center max-w-2xl text-center">
        <div className="mb-6 inline-flex items-center justify-center p-4 bg-brand-gold/10 rounded-full">
          <Swords size={48} className="text-brand-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.8)]" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-brand-gold to-yellow-200 mb-6 drop-shadow-lg">
          RankedUNI
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-300 mb-12 font-medium">
          El primer E-sport académico para ingresar a la UNI
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button 
            onClick={handleGoogleLogin}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-brand-dark bg-brand-gold rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] focus:outline-none"
          >
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative flex items-center gap-3 text-lg">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
              Registrarse
            </span>
          </button>
          
          <button 
            onClick={handleGoogleLogin}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white bg-brand-darker border border-brand-blue/50 rounded-full overflow-hidden transition-all duration-300 hover:bg-brand-blue/20 focus:outline-none"
          >
            <span className="relative flex items-center gap-3 text-lg">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
              Iniciar Sesión
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
