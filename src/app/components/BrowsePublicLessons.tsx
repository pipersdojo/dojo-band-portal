import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BrowsePublicLessons({ bandId, onAdd, isAdmin = false }: { bandId: string, onAdd: (lesson: any) => void, isAdmin?: boolean }) {
  const [publicLessons, setPublicLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicLessons = async () => {
      setLoading(true);
      setError(null);
      // Fetch public lessons not already added to this band
      const { data: addedLessons } = await supabase
        .from("band_lessons")
        .select("lesson_id")
        .eq("band_id", bandId);
      const addedIds = (addedLessons || []).map((l: any) => l.lesson_id);
      let query = supabase
        .from("lessons")
        .select("id, title")
        .eq("is_public", true);
      if (addedIds.length > 0) {
        query = query.not("id", "in", `(${addedIds.join(",")})`);
      }
      const { data, error } = await query;
      if (error) setError(error.message);
      setPublicLessons(data || []);
      setLoading(false);
    };
    fetchPublicLessons();
  }, [bandId]);

  if (loading) return <div>Loading public lessons...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="mb-4">
      <h4 className="font-semibold mb-2">Browse Public Lessons</h4>
      {publicLessons.length === 0 ? (
        <div className="text-gray-400 text-sm">No public lessons available.</div>
      ) : (
        <ul>
          {publicLessons.map(lesson => (
            <li key={lesson.id} className="mb-1 flex justify-between items-center">
              <span>{lesson.title}</span>
              {isAdmin && <button className="ml-2 text-blue-600 text-xs" onClick={() => onAdd(lesson)}>Add</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
