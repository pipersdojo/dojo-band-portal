import { restrictAccess, getRestrictionReasonMessage } from '@/lib/restrictAccess';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function PublicLessonsAccessGuard({ bandId, children }: { bandId: string, children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [band, setBand] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [restriction, setRestriction] = useState<ReturnType<typeof restrictAccess> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }
        setUserId(user.id);
        const { data: bandData, error: bandError } = await supabase
          .from('bands')
          .select('id, user_limit, subscription_status, current_period_end')
          .eq('id', bandId)
          .single();
        if (bandError) {
          setError(bandError.message);
          setLoading(false);
          return;
        }
        setBand(bandData);
        const { data: membersData, error: membersError } = await supabase
          .from('band_members')
          .select('user_id, role')
          .eq('band_id', bandId);
        if (membersError) {
          setError(membersError.message);
          setLoading(false);
          return;
        }
        setMembers(membersData || []);
        setRestriction(restrictAccess({ userId: user.id, band: bandData, members: membersData || [] }));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    };
    if (bandId) fetchAll();
  }, [bandId]);

  if (loading) return <div className="py-16 text-center">Loading...</div>;
  if (error) return <div className="py-16 text-center text-red-600">{error}</div>;
  if (!band) return <div className="py-16 text-center">Band not found.</div>;
  if (restriction?.isRestricted) {
    return (
      <div className="py-16 text-center text-red-600">
        {getRestrictionReasonMessage(restriction.restrictionReason)}
      </div>
    );
  }
  return <>{children}</>;
}
