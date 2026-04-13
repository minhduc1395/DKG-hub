import { supabase } from './src/lib/supabaseClient';

async function check() {
  const { data, error } = await supabase.from('tasks').select('*').limit(1);
  if (error) {
    console.error('Error fetching tasks:', JSON.stringify(error, null, 2));
  } else {
    console.log('Task data:', JSON.stringify(data, null, 2));
  }
}
check();
