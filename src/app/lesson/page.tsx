"use client";
import { supabase } from "@/lib/supabase";
import { LessonAccessGuard } from "./LessonAccessGuard";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LessonPage() {
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("id");
  const bandId = searchParams.get("band");
  const [soundsliceId, setSoundsliceId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Always log the logged in user's info for debugging
    const logUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("[DEBUG] Logged in user:", user);
    };
    logUser();
    // Fetch the lesson to get the soundsliceId (assuming lessonId is the lesson's id)
    const fetchLesson = async () => {
      if (!lessonId) return;
      const { data, error } = await supabase
        .from("lessons")
        .select("soundslice_id")
        .eq("id", lessonId)
        .single();
      setSoundsliceId(data?.soundslice_id || lessonId); // fallback to lessonId if not set
    };
    fetchLesson();
    // Fetch user id for embed
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, [lessonId]);

  if (!lessonId)
    return <div className="py-16 text-center text-red-600">No lesson specified.</div>;

  // Restrict access if bandId is present
  if (bandId) {
    return (
      <LessonAccessGuard bandId={bandId}>
        <div className="max-w-2xl mx-auto py-8">
          <a href={`/band/${bandId}`} className="text-blue-600 underline mb-4 inline-block">
            ← Back to Band Page
          </a>
          <h1 className="text-2xl font-bold mb-4">Lesson</h1>
          {soundsliceId ? (
            <>
              <div className="mb-2 text-xs text-gray-500 break-all">
                Embed URL:{" "}
                <code>{`https://www.soundslice.com/slices/${soundsliceId}/embed/?u=${userId || '...'}`}</code>
              </div>
              <iframe
                title="Soundslice Embed"
                src={`https://www.soundslice.com/slices/${soundsliceId}/embed/?u=${userId || ''}`}
                width="100%"
                height="500"
                frameBorder="0"
                allowFullScreen
              ></iframe>
            </>
          ) : (
            <div>Loading lesson...</div>
          )}
        </div>
      </LessonAccessGuard>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Lesson</h1>
      {soundsliceId ? (
        <>
          <div className="mb-2 text-xs text-gray-500 break-all">
            Embed URL:{" "}
            <code>{`https://www.soundslice.com/slices/${soundsliceId}/embed/?u=${userId || '...'}`}</code>
          </div>
          <iframe
            title="Soundslice Embed"
            src={`https://www.soundslice.com/slices/${soundsliceId}/embed/?u=${userId || ''}`}
            width="100%"
            height="500"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        </>
      ) : (
        <div>Loading lesson...</div>
      )}
    </div>
  );
}
