import { createClient } from '@supabase/supabase-js';

// NOTA: Asegúrate de agregar estas variables en tu archivo frontend/.env
// VITE_SUPABASE_URL="tu_url_de_supabase"
// VITE_SUPABASE_ANON_KEY="tu_anon_key_de_supabase"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Inicializamos el cliente de Supabase
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key');
