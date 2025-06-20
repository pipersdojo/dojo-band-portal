import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, bandId } = await req.json();

  // Use the service role key from environment variables (never expose to client)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Invite the user (this always sends an invite email)
  let userId: string | undefined = undefined;
  const { data: user, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
  if (user?.user?.id) {
    userId = user.user.id;
  } else if (inviteError && inviteError.message === "User already registered") {
    // Fetch all users and find the one with the matching email
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (listError || !userList?.users?.length) {
      return NextResponse.json({ error: "User already registered but not found in auth.users." }, { status: 400 });
    }
    const found = userList.users.find((u: any) => u.email === email);
    if (!found) {
      return NextResponse.json({ error: "User already registered but not found in auth.users." }, { status: 400 });
    }
    userId = found.id;
  } else if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Could not determine user ID." }, { status: 400 });
  }

  // 2. Update the user's row in the users table with bandId and role
  const { error: updateError } = await supabase
    .from("users")
    .update({ band_id: bandId, role: "member" })
    .eq("id", userId);
  if (updateError) {
    return NextResponse.json({ error: `DB update error: ${updateError.message}` }, { status: 400 });
  }

  return NextResponse.json({ success: true, userId, bandId });
}
