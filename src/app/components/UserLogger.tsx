"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function UserLogger() {
  useEffect(() => {
    const logUser = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("[DEBUG] Error fetching auth user:", userError);
        return;
      }
      console.log("[DEBUG] Auth user:", user);
      if (!user) return;
      // Fetch band memberships
      const { data: bandMemberships, error: bandMembershipsError } = await supabase
        .from("band_members")
        .select("band:bands(id, name), role")
        .eq("user_id", user.id);
      if (bandMembershipsError) {
        console.error("[DEBUG] Error fetching band memberships:", bandMembershipsError);
      } else {
        console.log("[DEBUG] Band memberships:", bandMemberships);
      }
      // Optionally, fetch more user-related info here
    };
    logUser();
  }, []);
  return null;
}
