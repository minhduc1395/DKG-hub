import { createClient } from '@supabase/supabase-js';

// Support both Vite (import.meta.env) and Node (process.env)
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env[key]) {
    return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const isPlaceholder = (val: string | undefined) => 
  !val || val === 'YOUR_SUPABASE_URL' || val === 'YOUR_SUPABASE_ANON_KEY' || val.includes('MY_');

if (isPlaceholder(supabaseUrl) || (isPlaceholder(supabaseAnonKey) && isPlaceholder(supabaseServiceKey))) {
  console.error('Supabase configuration is missing or using placeholder values. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

// Use service key if available (for server-side operations), otherwise fallback to anon key
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseServiceKey || supabaseAnonKey || 'placeholder'
);
