"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthForm from "@/app/components/AuthForm";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("Validating invite...");
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function validateInvite() {
      if (!token) {
        setError("Missing invite token.");
        setStatus("");
        return;
      }
      // Fetch invite from Supabase
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .single();
      if (error || !data) {
        setError("Invalid or expired invite token.");
        setStatus("");
        return;
      }
      if (data.status !== "pending") {
        setError("This invite has already been used or revoked.");
        setStatus("");
        return;
      }
      setInvite(data);
      setStatus("");
    }
    validateInvite();
    // Check if user is logged in
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
  }, [token]);

  async function claimInvite() {
    if (!user || !invite) return;
    if (user.email !== invite.email) {
      setError("You must log in with the invited email address.");
      return;
    }
    console.log("[Invite] Attempting to update user:", {
      userId: user.id,
      band_id: invite.band_id,
      role: invite.role,
    });
    // Update user profile with band_id and role
    const { data: updateData, error: dbError } = await supabase.from("users")
      .update({
        band_id: invite.band_id,
        role: invite.role,
      })
      .eq("id", user.id)
      .select();
    console.log("[Invite] Update response:", { updateData, dbError });
    if (dbError) {
      console.error("[Invite] Error updating user:", dbError);
      setError(dbError.message);
      return;
    }
    if (!updateData || updateData.length === 0) {
      setError("No user row was updated. Check if the user exists and RLS allows the update.");
      return;
    }
    // Mark invite as used
    const { error: inviteError } = await supabase
      .from("invitations")
      .update({ status: "used", used_at: new Date().toISOString() })
      .eq("id", invite.id);
    if (inviteError) {
      console.error("[Invite] Error updating invitation:", inviteError);
      setError(inviteError.message);
      return;
    }
    setStatus("Invite accepted! You have joined the band.");
    setTimeout(() => router.push("/"), 3000);
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 border rounded">
      <h1 className="text-xl font-bold mb-4">Accept Band Invitation</h1>
      {status && <p className="mb-4">{status}</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {invite && !error && (
        <div>
          <p>
            You have been invited to join band <b>{invite.band_id}</b> as a{" "}
            <b>{invite.role}</b> with email <b>{invite.email}</b>.
          </p>
          {!user ? (
            <>
              <p>
                Please log in or sign up with this email to accept the
                invitation.
              </p>
              <AuthForm />
            </>
          ) : (
            <>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
                onClick={claimInvite}
              >
                Accept Invite
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
