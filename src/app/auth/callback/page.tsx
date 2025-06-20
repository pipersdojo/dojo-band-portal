"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Processing...");
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    async function handleSession() {
      const type = searchParams.get("type");
      const access_token = searchParams.get("access_token");
      const code = searchParams.get("code");

      // Only call exchangeCodeForSession for OAuth/magic link (when code param is present)
      if (code) {
        setStatus("Processing authentication...");
        if (typeof supabase.auth.exchangeCodeForSession === "function") {
          const url = typeof window !== "undefined" ? window.location.href : "";
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);
          if (exchangeError) {
            setError(exchangeError.message);
            setStatus("Could not exchange code for session.");
            return;
          }
        }
      }
      // Show reset form for recovery only (when type === 'recovery' and access_token is present)
      if (type === "recovery" && access_token) {
        setShowReset(true);
        setStatus("Please set a new password.");
      } else if ((type === "signup" || !type) && access_token) {
        // Email confirmation flow
        setShowReset(false);
        setStatus("Email confirmed! Please log in with your password to finish setup.");
        // Optionally, redirect to login after a short delay:
        setTimeout(() => router.push("/login?email=" + encodeURIComponent(searchParams.get("email") || "")), 3000);
      } else if (type === "magiclink" && (access_token || code)) {
        setStatus("Logging you in...");
        supabase.auth.getUser().then(async ({ data, error }) => {
          if (error) setError(error.message);
          else {
            // After successful login or password reset, upsert user in users table
            async function upsertUserProfile() {
              const { data: userData, error: userError } = await supabase.auth.getUser();
              if (userError || !userData?.user) {
                setError(userError?.message || "Could not get user info after login.");
                return;
              }
              const user = userData.user;
              const band_id = user.user_metadata?.band_id || null;
              const full_name = user.user_metadata?.full_name || null;
              const upsertPayload = [{
                id: user.id,
                email: user.email,
                full_name,
                band_id,
                role: "member",
                created_at: new Date().toISOString(),
              }];
              console.log("[Callback] Upserting user profile:", upsertPayload);
              const { error: dbError } = await supabase.from("users").upsert(upsertPayload);
              if (dbError) {
                setError(dbError.message);
              }
            }
            await upsertUserProfile();
            router.push("/");
          }
        });
      } else if (!access_token && !code) {
        setStatus("Invalid or expired link.");
      }
    }
    handleSession();
  }, [searchParams, router]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Resetting password...");
    setError(null);
    const access_token = searchParams.get("access_token");
    if (!access_token) {
      setError("Missing access token.");
      return;
    }
    // Set the session before updating the password
    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token: "" });
    if (sessionError) {
      setError(sessionError.message);
      setStatus("Could not set session.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setError(error.message);
      return;
    }
    setStatus("Password reset! Please log in with your new password to finish setup.");
    // Redirect to login page after a short delay
    setTimeout(() => router.push("/login?email=" + encodeURIComponent(searchParams.get("email") || "")), 2500);
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 border rounded">
      <h1 className="text-xl font-bold mb-4">Authentication Callback</h1>
      <p className="mb-4">{status}</p>
      {showReset && (
        <form onSubmit={handleReset}>
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="block w-full mb-2 p-2 border rounded"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Set New Password
          </button>
        </form>
      )}
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}
