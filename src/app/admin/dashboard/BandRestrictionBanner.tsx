import { restrictAccess, getRestrictionReasonMessage } from '@/lib/restrictAccess';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function BandRestrictionBanner({ bandId, userLimit, members, invites }: {
  bandId: string;
  userLimit: number | undefined;
  members: any[];
  invites: any[];
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [band, setBand] = useState<any>(null);
  const [restriction, setRestriction] = useState<ReturnType<typeof restrictAccess> | null>(null);

  useEffect(() => {
    const fetchUserAndBand = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      // Fetch band info for restriction logic
      const { data: bandData } = await supabase
        .from('bands')
        .select('id, user_limit, subscription_status, current_period_end')
        .eq('id', bandId)
        .single();
      setBand(bandData);
      // Compose band members for restriction logic
      const memberList = members.map((m: any) => ({
        user_id: m.user?.id,
        role: m.role,
      }));
      // Only count unclaimed invites as potential members
      const inviteCount = invites.filter((inv: any) => !inv.claimed).length;
      // Add dummy members for invites to simulate overage
      for (let i = 0; i < inviteCount; i++) {
        memberList.push({ user_id: `invite-${i}`, role: 'member' });
      }
      if (user && bandData) {
        setRestriction(restrictAccess({ userId: user.id, band: bandData, members: memberList }));
      }
    };
    if (bandId && userLimit !== undefined) fetchUserAndBand();
  }, [bandId, userLimit, members, invites]);

  if (!restriction) return null;
  if (restriction.isRestricted || restriction.showAdminAlert) {
    return (
      <div className={
        restriction.isRestricted
          ? 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4'
          : 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4'
      }>
        {getRestrictionReasonMessage(restriction.restrictionReason)}
      </div>
    );
  }
  return null;
}
