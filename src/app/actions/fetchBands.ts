import { supabase } from '@/lib/supabase';

export async function fetchBands() {
  const { data, error } = await supabase.from('bands').select('*');
  if (error) throw error;
  return data;
}
