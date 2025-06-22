"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function UserNav() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
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
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-2 ml-auto">
        <a
          href="/profile"
          className="text-gray-700 text-sm hover:underline"
        >
          {user.email}
        </a>
        <button
          className="text-blue-600 hover:underline text-sm"
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>
    );
  }
  return (
    <a
      href="/login"
      className="ml-auto text-blue-600 hover:underline text-sm"
    >
      Log In
    </a>
  );
}
