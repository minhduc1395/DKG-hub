import { supabase } from './src/lib/supabaseClient';

async function test() {
  const { data, error } = await supabase.from('documents').select('*').limit(1);
  console.log(error ? error : 'Success');
}
test();
