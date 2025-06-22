"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EnrollPage() {
  const [bandName, setBandName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("You must be logged in to create a band.");
      setLoading(false);
      return;
    }
    // Create band
    const { data: band, error: bandError } = await supabase
      .from("bands")
      .insert({ name: bandName })
      .select()
      .single();
    if (bandError || !band) {
      setError(bandError?.message || "Failed to create band.");
      setLoading(false);
      return;
    }
    // Add creator to band_members as admin
    const { error: bandMemberError } = await supabase
      .from("band_members")
      .insert({ band_id: band.id, user_id: user.id, role: "admin" });
    if (bandMemberError) {
      setError(bandMemberError.message);
      setLoading(false);
      return;
    }
    // Redirect to dashboard
    router.push("/dashboard");
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Create a New Band</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bandName" className="block mb-1 font-medium">Band Name</label>
          <input
            id="bandName"
            type="text"
            className="w-full border rounded px-3 py-2"
            value={bandName}
            onChange={e => setBandName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 w-full"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Band"}
        </button>
      </form>
    </div>
  );
}
