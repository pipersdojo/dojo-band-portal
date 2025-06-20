"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setMessage("Check your email for a confirmation link.");
    setLoading(false);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else {
      setMessage("Signed in!");
      // After successful login, upsert user profile with band_id from localStorage (if present)
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData?.user) {
        const user = userData.user;
        const band_id = localStorage.getItem("pending_band_id") || null;
        const full_name = user.user_metadata?.full_name || null;
        if (band_id) {
          const upsertPayload = [{
            id: user.id,
            email: user.email,
            full_name,
            band_id,
            role: "member",
            created_at: new Date().toISOString(),
          }];
          console.log("[Login] Upserting user profile:", upsertPayload);
          const { error: dbError } = await supabase.from("users").upsert(upsertPayload);
          if (dbError) {
            setError(dbError.message);
          } else {
            // Remove band_id from localStorage after use
            localStorage.removeItem("pending_band_id");
          }
        }
      }
    }
    setLoading(false);
  }

  return (
    <div className="max-w-xs mx-auto mt-8 p-4 border rounded">
      <form>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="block w-full mb-2 p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="block w-full mb-2 p-2 border rounded"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSignIn}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={loading}
            type="button"
          >
            Sign In
          </button>
          <button
            onClick={handleSignUp}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={loading}
            type="button"
          >
            Sign Up
          </button>
        </div>
        {error && <p className="text-red-600 mt-2">{error}</p>}
        {message && <p className="text-green-600 mt-2">{message}</p>}
      </form>
    </div>
  );
}
