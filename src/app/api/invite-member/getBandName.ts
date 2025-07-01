import { createClient } from '@supabase/supabase-js';

export async function getBandName(bandId: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await supabase
    .from('bands')
    .select('name')
    .eq('id', bandId)
    .maybeSingle();
  if (error || !data) return null;
  return data.name;
}
