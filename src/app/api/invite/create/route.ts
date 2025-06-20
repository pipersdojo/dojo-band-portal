import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";

// Only allow POST
export async function POST(req: NextRequest) {
  // TODO: Add admin authentication/authorization check here
  const { email, band_id, role } = await req.json();
  if (!email || !band_id || !role) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Generate a secure random token
  const token = randomUUID();

  // Store the invitation in the invitations table
  const { error } = await supabase.from("invitations").insert([
    {
      email,
      band_id,
      role,
      token,
      status: "pending",
    },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build the invite link
  const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/accept-invite?token=${token}`;

  // TODO: Send inviteLink via email to the user (or return it for manual send)

  return NextResponse.json({ inviteLink });
}
