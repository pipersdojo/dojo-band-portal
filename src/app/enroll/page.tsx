"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EnrollPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bandId = searchParams.get("band") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [bandCode, setBandCode] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    setError(null);
    if (!bandCode) {
      setError("Please enter a band code.");
      return;
    }
    // 1. Look up band by code
    const { data: bandData, error: bandError } = await supabase
      .from("bands")
      .select("id")
      .eq("code", bandCode)
      .single();
    if (bandError || !bandData) {
      setError("Invalid band code. Please check with your band admin.");
      return;
    }
    // 2. Sign up the user
    const signUpPayload = {
      email,
      password,
      options: {
        data: { full_name: fullName },
        redirectTo: "http://localhost:3000/auth/callback"
      }
    };
    const { data, error: signUpError } = await supabase.auth.signUp(signUpPayload);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // 3. Store bandId in localStorage for use after login
    localStorage.setItem("pending_band_id", bandData.id);
    setStatus("Account created! Please check your email to confirm and log in.");
    setEmail("");
    setPassword("");
    setFullName("");
    setBandCode("");
    setTimeout(() => router.push("/"), 4000);
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 border rounded">
      <h1 className="text-xl font-bold mb-4">Create Your Band Member Account</h1>
      <form onSubmit={handleEnroll}>
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          className="block w-full mb-2 p-2 border rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="block w-full mb-2 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="block w-full mb-2 p-2 border rounded"
          required
        />
        <input
          type="text"
          placeholder="Band Code"
          value={bandCode}
          onChange={e => setBandCode(e.target.value)}
          className="block w-full mb-2 p-2 border rounded"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create Account
        </button>
      </form>
      {error && <p className="text-red-600 mt-2">{error}</p>}
      {status && <p className="text-green-600 mt-2">{status}</p>}
    </div>
  );
}
