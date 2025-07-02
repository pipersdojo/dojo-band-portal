import { restrictAccess, getRestrictionReasonMessage } from '@/lib/restrictAccess';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

export function BandAccessGuard({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const bandId = params?.id as string;
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
        console.log('[BandAccessGuard] Current user:', user);
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
        console.log('[BandAccessGuard] Band data:', bandData, 'Error:', bandError);
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
        console.log('[BandAccessGuard] Members data:', membersData, 'Error:', membersError);
        if (membersError) {
          setError(membersError.message);
          setLoading(false);
          return;
        }
        // Fetch unclaimed invites for this band
        const { data: invitesData, error: invitesError } = await supabase
          .from('invitations')
          .select('id, claimed')
          .eq('band_id', bandId);
        console.log('[BandAccessGuard] Invites data:', invitesData, 'Error:', invitesError);
        console.log('[BandAccessGuard] Raw membersData:', membersData, 'length:', membersData?.length);
        console.log('[BandAccessGuard] Raw invitesData:', invitesData, 'length:', invitesData?.length);
        // Combine members and unclaimed invites as virtual members
        const unclaimedInvites = (invitesData || []).filter((inv: any) => !inv.claimed);
        console.log('[BandAccessGuard] Unclaimed invites:', unclaimedInvites, 'length:', unclaimedInvites.length);
        const combinedMembers = [
          ...(membersData || []),
          ...unclaimedInvites.map((inv: any, i: number) => ({ user_id: `invite-${i}`, role: 'member' }))
        ];
        console.log('[BandAccessGuard] Combined members (members + unclaimed invites):', combinedMembers, 'length:', combinedMembers.length);
        setMembers(combinedMembers);
        const restrictionResult = restrictAccess({ userId: user.id, band: bandData, members: combinedMembers });
        setRestriction(restrictionResult);
        console.log('[BandAccessGuard] Restriction result:', restrictionResult);
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
  return (
    <>
      {restriction?.showAdminAlert && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          {getRestrictionReasonMessage(restriction.restrictionReason)}
        </div>
      )}
      {children}
    </>
  );
}
