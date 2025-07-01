import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

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

  // Generate a unique token for the invite
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days

  // Insert invite
  const { error: insertError } = await supabase
    .from("invitations")
    .insert({
      email,
      band_id: bandId,
      role: "member",
      token,
      expires_at: expiresAt,
      claimed: false
    });
  if (insertError) {
    return NextResponse.json({ error: `DB insert error: ${insertError.message}` }, { status: 400 });
  }

  // (Optional) Send email here using your email provider

  return NextResponse.json({ success: true });
}
