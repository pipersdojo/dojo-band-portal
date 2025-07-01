"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthForm from "@/app/components/AuthForm";
import UserLogger from "../components/UserLogger";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("Validating invite...");
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
      if (data.claimed) {
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

  // Listen for auth state changes to catch session after email verification
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user || null);
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Auto-claim invite if user is authenticated and matches invite email
  useEffect(() => {
    if (invite && user && user.email === invite.email && !error && status === "") {
      setStatus("Accepting invite...");
      claimInvite();
    }
  }, [invite, user]);

  async function claimInvite() {
    if (!user || !invite) return;
    if (user.email !== invite.email) {
      setError("You must log in with the invited email address.");
      return;
    }
    console.log("[Invite] Attempting to add band member:", {
      userId: user.id,
      band_id: invite.band_id,
      role: invite.role,
    });
    // Insert into band_members
    const { data: insertData, error: dbError } = await supabase.from("band_members")
      .insert({
        user_id: user.id,
        band_id: invite.band_id,
        role: invite.role,
      })
      .select();
    console.log("[Invite] Insert response:", { insertData, dbError });
    if (dbError) {
      console.error("[Invite] Error adding band member:", dbError);
      setError(dbError.message);
      return;
    }
    if (!insertData || insertData.length === 0) {
      setError("No band member row was inserted. Check if the user exists and RLS allows the insert.");
      return;
    }
    // Mark invite as used
    const { error: inviteError } = await supabase
      .from("invitations")
      .update({ claimed: true, used_at: new Date().toISOString() })
      .eq("id", invite.id);
    if (inviteError) {
      console.error("[Invite] Error updating invitation:", inviteError);
      setError(inviteError.message);
      return;
    }
    setStatus("Invite accepted! You have joined the band.");
    setTimeout(async () => {
      await supabase.auth.refreshSession();
      window.location.reload(); // Force full reload to ensure new membership is reflected
    }, 1500);
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password,
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthError(null);
      // Refresh user state
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    }
    setAuthLoading(false);
  }

  return (
    <>
      <UserLogger />
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
                <p className="mt-4 text-yellow-700">
                  No account found for <b>{invite.email}</b>. Please sign up to accept this invitation.
                </p>
                <AuthForm forceEmail={invite.email} />
              </>
            ) : user.email === invite.email ? (
              status === "Accepting invite..." ? (
                <p className="mt-4 text-blue-600">Accepting invite...</p>
              ) : null
            ) : (
              <p className="mt-4 text-red-600">
                You are logged in as <b>{user.email}</b>. Please log out and log in with <b>{invite.email}</b> to accept this invitation.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
