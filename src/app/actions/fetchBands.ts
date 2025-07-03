import { supabase } from '@/lib/supabase';
import { getUser } from '@/lib/supabase'; // If you have a helper to get the current user

export async function fetchBands() {
  const { data, error } = await supabase.from('bands').select('*');
  if (error) throw error;
  return data;
}

export async function createBand(name: string) {
  // Get current user (assumes you have a helper or use supabase.auth)
  const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return { error: 'Not authenticated' };

  // Insert new band, set current user as admin
  const { data, error } = await supabase.from('bands').insert([
    { name, owner_id: user.id }
  ]).select().single();
  if (error) return { error: error.message };

  // Optionally, add user to band_members as admin
  await supabase.from('band_members').insert([
    { band_id: data.id, user_id: user.id, role: 'admin' }
  ]);

  return { band: data };
}
