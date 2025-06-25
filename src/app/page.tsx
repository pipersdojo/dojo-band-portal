"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AuthForm from "./components/AuthForm";
import UserLogger from "./components/UserLogger";

interface Band {
  id: string;
  name: string;
  role?: string; // Add role to Band
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getUserAndBands = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        // Fetch all bands where user is a member, including role
        const { data: bandMemberships, error: bandMembershipsError } = await supabase
          .from("band_members")
          .select("band:bands(id, name), role")
          .eq("user_id", user.id);
        if (bandMembershipsError) {
          setError(bandMembershipsError.message);
        } else {
          // Map role into bands
          const bandsList = (bandMemberships || [])
            .map((bm: any) => ({ ...bm.band, role: bm.role }))
            .filter((b: any) => b && b.id && b.name);
          setBands(bandsList);
        }
      }
      setLoading(false);
    };
    getUserAndBands();
  }, []);

  if (loading) return <div className="py-16 text-center">Loading...</div>;

  if (!user) {
    // Logged out: show marketing/info and login/signup
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-4xl font-bold mb-6">Dojo University Band Portal</h1>
        <div className="flex justify-center gap-4 mb-8">
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700"
            onClick={() => router.push("/login")}
          >
            Log In
          </button>
        </div>
        <div className="bg-gray-50 p-6 rounded shadow text-left">
          <h2 className="text-xl font-semibold mb-2">What is this?</h2>
          <p className="mb-2">
            The Dojo University Band Portal is a secure platform for pipe band leaders and members to manage their band online.
          </p>
          <ul className="list-disc ml-6 mb-2">
            <li>Band leaders can invite and manage members</li>
            <li>Members can join bands and update their profiles</li>
            <li>All data is securely managed with Supabase</li>
          </ul>
          <p>Get started by logging in or creating a new band!</p>
        </div>
      </div>
    );
  }

  // Logged in: show dashboard with bands
  return (
    <>
      <UserLogger />
      <div className="max-w-2xl mx-auto py-16">
        <h1 className="text-3xl font-bold mb-6">Welcome, {user.email}!</h1>
        <h2 className="text-xl font-semibold mb-4">Your Bands</h2>
        {bands.length === 0 ? (
          <p>You are not a member of any bands yet.</p>
        ) : (
          <ul className="space-y-2">
            {bands.map((band) => (
              <li key={band.id} className="border rounded p-4 flex items-center justify-between gap-4">
                <a href={`/band/${band.id}`} className="font-semibold text-blue-700 hover:underline">{band.name}</a>
                <div className="flex gap-2">
                  <a href={`/band/${band.id}`} className="text-gray-700 hover:underline">View</a>
                  {band.role === 'admin' && (
                    <a href={`/admin/dashboard?band=${band.id}`} className="text-blue-600 hover:underline">Manage</a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}