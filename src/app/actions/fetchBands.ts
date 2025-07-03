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

  // Insert new band (no owner_id)
  const { data, error } = await supabase.from('bands').insert([
    { name }
  ]).select().single();
  if (error) return { error: error.message };

  // Add user to band_members as admin
  await supabase.from('band_members').insert([
    { band_id: data.id, user_id: user.id, role: 'admin' }
  ]);

  return { band: data };
}

export async function debugInsertBand(name: string) {
  const { data, error } = await supabase.from('bands').insert([{ name }]).select().single();
  console.log('Insert result:', { data, error });
  return { data, error };
}

export async function deleteBand(bandId: string) {
  // 1. Delete all band_lessons for this band
  const { error: blErr } = await supabase.from('band_lessons').delete().eq('band_id', bandId);
  if (blErr) return { error: 'band_lessons: ' + blErr.message };

  // 2. Delete all lessons for this band
  const { error: lessonsErr } = await supabase.from('lessons').delete().eq('band_id', bandId);
  if (lessonsErr) return { error: 'lessons: ' + lessonsErr.message };

  // 3. Delete all invitations for this band
  const { error: invErr } = await supabase.from('invitations').delete().eq('band_id', bandId);
  if (invErr) return { error: 'invitations: ' + invErr.message };

  // 4. Delete all custom_requests for this band
  const { error: crErr } = await supabase.from('custom_requests').delete().eq('band_id', bandId);
  if (crErr) return { error: 'custom_requests: ' + crErr.message };

  // 5. Find all folder IDs for this band
  const { data: folders, error: foldersFetchErr } = await supabase.from('folders').select('id').eq('band_id', bandId);
  if (foldersFetchErr) return { error: 'folders fetch: ' + foldersFetchErr.message };
  const folderIds = folders?.map(f => f.id) || [];

  // 6. Delete all folder_lessons for these folders, one by one
  for (const folderId of folderIds) {
    const { error: flErr } = await supabase.from('folder_lessons').delete().eq('folder_id', folderId);
    if (flErr) return { error: `folder_lessons (folder_id: ${folderId}): ` + flErr.message };
  }

  // 7. Delete all folders for this band, one by one
  for (const folderId of folderIds) {
    const { error: foldersErr } = await supabase.from('folders').delete().eq('id', folderId);
    if (foldersErr) return { error: `folders (id: ${folderId}): ` + foldersErr.message };
  }

  // 8. Finally, delete the band (before deleting band_members)
  const { error } = await supabase.from('bands').delete().eq('id', bandId);
  if (error) return { error: 'bands: ' + error.message };

  // 9. Delete all band_members for this band
  const { error: bmErr } = await supabase.from('band_members').delete().eq('band_id', bandId);
  if (bmErr) return { error: 'band_members: ' + bmErr.message };

  return { success: true };
}
