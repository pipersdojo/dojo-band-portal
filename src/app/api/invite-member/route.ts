import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { sendInviteEmail } from './sendInviteEmail';
import { getBandName } from './getBandName';

export async function POST(req: NextRequest) {
  const { email, bandId } = await req.json();
  if (!email || !bandId) {
    return NextResponse.json({ error: "Missing email or bandId" }, { status: 400 });
  }

  // Use the service role key from environment variables (never expose to client)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check for existing pending invite
  const { data: existing, error: existingError } = await supabase
    .from("invitations")
    .select("id")
    .eq("email", email)
    .eq("band_id", bandId)
    .eq("claimed", false)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Invite already sent to this email for this band." }, { status: 400 });
  }

  // Fetch band user limit
  const { data: bandData, error: bandError } = await supabase
    .from('bands')
    .select('user_limit')
    .eq('id', bandId)
    .maybeSingle();
  if (bandError || !bandData) {
    return NextResponse.json({ error: 'Could not fetch band user limit.' }, { status: 400 });
  }
  const userLimit = bandData.user_limit;

  // Count active members
  const { count: memberCount } = await supabase
    .from('band_members')
    .select('*', { count: 'exact', head: true })
    .eq('band_id', bandId);

  // Count pending invites
  const { count: pendingInviteCount } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('band_id', bandId)
    .eq('claimed', false);

  const total = (memberCount || 0) + (pendingInviteCount || 0);
  if (total >= userLimit) {
    return NextResponse.json({ error: 'Band is at maximum user capacity for your plan.' }, { status: 400 });
  }

  // Generate a unique token for the invite
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days

  // Insert invite
  const { error: insertError } = await supabase
    .from("invitations")
    .insert([{
      email,
      band_id: bandId,
      role: "member",
      token,
      expires_at: expiresAt,
      claimed: false
    }]);
  if (insertError) {
    return NextResponse.json({ error: `DB insert error: ${insertError.message}` }, { status: 400 });
  }

  // Fetch band name for email
  const bandName = await getBandName(bandId);
  const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;

  try {
    await sendInviteEmail({
      to: email,
      bandName: bandName || 'a band',
      inviteLink
    });
  } catch (err) {
    return NextResponse.json({ error: 'Invite created, but failed to send email.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
