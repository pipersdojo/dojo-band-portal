"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function BandViewPage() {
  const params = useParams();
  const bandId = params?.id as string;
  const [band, setBand] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBand = async () => {
      setLoading(true);
      setError(null);
      // Fetch band info
      const { data: bandData, error: bandError } = await supabase
        .from("bands")
        .select("id, name, subscription_status, created_at")
        .eq("id", bandId)
        .single();
      if (bandError) {
        setError(bandError.message);
        setLoading(false);
        return;
      }
      setBand(bandData);
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("band_members")
        .select("role, user:users(id, email, full_name)")
        .eq("band_id", bandId);
      if (membersError) {
        setError(membersError.message);
      } else {
        setMembers((membersData || []).map((m: any) => ({
          role: m.role,
          user: Array.isArray(m.user) ? m.user[0] : m.user
        })));
      }
      setLoading(false);
    };
    if (bandId) fetchBand();
  }, [bandId]);

  if (loading) return <div className="py-16 text-center">Loading...</div>;
  if (error) return <div className="py-16 text-center text-red-600">{error}</div>;
  if (!band) return <div className="py-16 text-center">Band not found.</div>;

  return (
    <div className="max-w-2xl mx-auto py-16">
      <h1 className="text-3xl font-bold mb-4">{band.name}</h1>
      <p className="mb-4 text-gray-600">Band ID: {band.id}</p>
      <h2 className="text-xl font-semibold mb-2">Members</h2>
      <ul className="mb-8">
        {members.map((m, i) => (
          <li key={i} className="mb-1">
            {m.user?.full_name || m.user?.email} <span className="text-xs text-gray-500">({m.role})</span>
          </li>
        ))}
      </ul>
      {/* Placeholder for lessons and other features */}
      <div className="bg-gray-50 p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Lessons & Features</h3>
        <p>Coming soon: lessons, resources, and more for this band.</p>
      </div>
    </div>
  );
}
