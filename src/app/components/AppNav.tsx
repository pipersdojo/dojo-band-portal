"use client";
import { useEffect, useRef, useState } from "react";
import UserNav from "./UserNav";

export default function AppNav() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [bandName, setBandName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (mounted) {
          setUser(data?.user || null);
          setLoading(false);
        }
      });
      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user || null);
        }
      );
      return () => {
        mounted = false;
        listener?.subscription.unsubscribe();
      };
    });
  }, []);

  const handleCreateBand = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const { createBand } = await import("@/app/actions/fetchBands");
      const result = await createBand(bandName);
      if (result?.error) {
        setError(result.error);
      } else {
        setShowModal(false);
        setBandName("");
      }
    } catch (err: any) {
      setError("Failed to create band. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (showModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showModal]);

  return (
    <nav className="bg-gray-100 py-4 px-6 flex gap-6 mb-8 items-center">
      <a href="/" className="flex items-center gap-2 font-semibold">
        <img src="/dojoLogo.png" alt="Dojo Logo" className="h-8 w-auto" />
        Home
      </a>
      <button
        className="text-primary-600 hover:underline font-semibold"
        onClick={() => setShowModal(true)}
        aria-label="Create Band"
        type="button"
      >
        + Create Band
      </button>
      <div className="flex-1" />
      <UserNav />
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm mx-2 relative animate-fade-in">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setShowModal(false)}
              aria-label="Close"
              type="button"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4 text-primary-700">
              Create a New Band
            </h2>
            <form
              onSubmit={handleCreateBand}
              className="flex flex-col gap-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={bandName}
                onChange={(e) => setBandName(e.target.value)}
                placeholder="Band name"
                className="border rounded px-3 py-2 focus:outline-primary-500"
                required
                minLength={2}
                maxLength={50}
                disabled={creating}
              />
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              <button
                type="submit"
                className="bg-primary-600 text-white rounded py-2 font-semibold hover:bg-primary-700 transition disabled:opacity-60"
                disabled={creating || !bandName.trim()}
              >
                {creating ? "Creating..." : "Create Band"}
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
