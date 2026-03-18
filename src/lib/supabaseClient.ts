import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isPlaceholder = (val: string | undefined) => 
  !val || val === 'YOUR_SUPABASE_URL' || val === 'YOUR_SUPABASE_ANON_KEY' || val.includes('MY_');

if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
  console.error('Supabase configuration is missing or using placeholder values. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
