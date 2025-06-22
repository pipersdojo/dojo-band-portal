"use client";

import Image from "next/image";
import { fetchBands } from "./actions/fetchBands";
import { useEffect, useState } from "react";
import AuthForm from "./components/AuthForm";
import { useRouter } from "next/navigation";

export default function Home() {
  const [bands, setBands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchBands()
      .then((data) => setBands(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
        <button
          className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700"
          onClick={() => router.push("/enroll")}
        >
          Create a Band
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
        <p>
          Get started by logging in or creating a new band!
        </p>
      </div>
    </div>
  );
}
// create supabase client