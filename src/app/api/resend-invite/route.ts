import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendInviteEmail } from '../invite-member/sendInviteEmail';
import { getBandName } from '../invite-member/getBandName';

export async function POST(req: NextRequest) {
  const { inviteId } = await req.json();
  if (!inviteId) {
    return NextResponse.json({ error: "Missing inviteId" }, { status: 400 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  // Fetch invite
  const { data: invite, error: fetchError } = await supabase
    .from("invitations")
    .select("id, email, band_id, token, claimed")
    .eq("id", inviteId)
    .maybeSingle();
  if (fetchError || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.claimed) {
    return NextResponse.json({ error: "Invite already claimed" }, { status: 400 });
  }
  const bandName = await getBandName(invite.band_id);
  const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/accept-invite?token=${invite.token}`;
  try {
    await sendInviteEmail({
      to: invite.email,
      bandName: bandName || 'a band',
      inviteLink
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to resend invite email.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
