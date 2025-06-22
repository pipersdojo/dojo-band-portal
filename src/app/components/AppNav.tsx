"use client";
import { useEffect, useState } from "react";
import UserNav from "./UserNav";

export default function AppNav() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <nav className="bg-gray-100 py-4 px-6 flex gap-6 mb-8 items-center">
      <a href="/" className="font-semibold">
        Home
      </a>
      <div className="flex-1" />
      <UserNav />
    </nav>
  );
}
