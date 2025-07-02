"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import FolderList from "@/app/components/FolderList";
import LessonList from "@/app/components/LessonList";
import UserLogger from "../../components/UserLogger";
import { BandAccessGuard } from './BandAccessGuard';

export default function BandViewPage() {
  const params = useParams();
  const bandId = params?.id as string;
  const [band, setBand] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [folderLessons, setFolderLessons] = useState<{[folderId: string]: any[]}>({});

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
        console.error('[DEBUG] bandError:', bandError);
        return;
      }
      setBand(bandData);
      console.log('[DEBUG] bandData:', bandData);
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("band_members")
        .select("role, user:users(id, email, full_name)")
        .eq("band_id", bandId);
      if (membersError) {
        setError(membersError.message);
        console.error('[DEBUG] membersError:', membersError);
      } else {
        setMembers((membersData || []).map((m: any) => ({
          role: m.role,
          user: Array.isArray(m.user) ? m.user[0] : m.user
        })));
        console.log('[DEBUG] membersData:', membersData);
      }
      // Fetch current user and their role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userMember = (membersData || []).find((m: any) => {
          const u = Array.isArray(m.user) ? m.user[0] : m.user;
          return u && u.id === user.id;
        });
        setUserRole(userMember?.role || null);
        console.log('[DEBUG] userRole:', userMember?.role || null);
      }
      // Fetch folders
      const fetchFoldersAndLessons = async () => {
        const { data: foldersData, error: foldersError } = await supabase
          .from("folders")
          .select("id, name")
          .eq("band_id", bandId);
        if (foldersError) {
          console.error('[DEBUG] foldersError:', foldersError);
        }
        setFolders(foldersData || []);
        console.log('[DEBUG] foldersData:', foldersData);
        // For each folder, fetch lessons (must be in both band_lessons and folder_lessons)
        const folderLessonsMap: {[folderId: string]: any[]} = {};
        for (const folder of foldersData || []) {
          const { data: folderLessonLinks, error: folderLessonsError } = await supabase
            .from("folder_lessons")
            .select("lesson_id")
            .eq("folder_id", folder.id);
          if (folderLessonsError) {
            console.error(`[DEBUG] folderLessonsError for folder ${folder.id}:`, folderLessonsError);
          }
          const folderLessonIds = (folderLessonLinks || []).map((l: any) => l.lesson_id);
          if (folderLessonIds.length === 0) {
            folderLessonsMap[folder.id] = [];
            continue;
          }
          const { data: bandLessonLinks, error: bandLessonsError } = await supabase
            .from("band_lessons")
            .select("lesson_id")
            .eq("band_id", bandId);
          if (bandLessonsError) {
            console.error(`[DEBUG] bandLessonsError for band ${bandId}:`, bandLessonsError);
          }
          const bandLessonIds = (bandLessonLinks || []).map((l: any) => l.lesson_id);
          const lessonIds = folderLessonIds.filter(id => bandLessonIds.includes(id));
          if (lessonIds.length === 0) {
            folderLessonsMap[folder.id] = [];
            continue;
          }
          const { data: lessonsData, error: lessonsError } = await supabase
            .from("lessons")
            .select("id, title, is_public")
            .in("id", lessonIds);
          if (lessonsError) {
            console.error(`[DEBUG] lessonsError for folder ${folder.id}:`, lessonsError);
          }
          folderLessonsMap[folder.id] = lessonsData || [];
          console.log(`[DEBUG] lessonsData for folder ${folder.id}:`, lessonsData);
        }
        setFolderLessons(folderLessonsMap);
        console.log('[DEBUG] folderLessonsMap:', folderLessonsMap);
      };
      if (bandId) fetchFoldersAndLessons();
      setLoading(false);
    };
    if (bandId) fetchBand();
  }, [bandId, selectedFolder]);

  const handleAddLesson = async (lesson: any) => {
    // Add lesson to band_lessons
    await supabase.from("band_lessons").insert({ band_id: bandId, lesson_id: lesson.id });
    // Refresh lessons
    setSelectedFolder(null); // reset folder filter
    // Optionally, you could refetch lessons here or trigger useEffect
  };

  if (loading) return <div className="py-16 text-center">Loading...</div>;
  if (error) return <div className="py-16 text-center text-red-600">{error}</div>;
  if (!band) return <div className="py-16 text-center">Band not found.</div>;

  return (
    <BandAccessGuard>
      <UserLogger />
      <div className="max-w-2xl mx-auto py-16">
        {/* Navigation links */}
        <div className="mb-4 flex gap-4 items-center">
          <a href="/" className="text-blue-600 underline">&lt;-- Return</a>
          {userRole === 'admin' && (
            <a href={`/admin/dashboard?band=${band.id}`} className="text-blue-600 underline">Manage Band</a>
          )}
        </div>
        <h1 className="text-3xl font-bold mb-4">{band.name}</h1>
        <p className="mb-4 text-gray-600">Band ID: {band.id}</p>
        {/* Only show Members section for admins */}
        {userRole === 'admin' && (
          <>
            <h2 className="text-xl font-semibold mb-2">Members</h2>
            <ul className="mb-8">
              {members.map((m, i) => (
                <li key={i} className="mb-1">
                  {m.user?.full_name || m.user?.email} <span className="text-xs text-gray-500">({m.role})</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="bg-gray-50 p-4 rounded shadow mb-6">
          <h2 className="text-lg font-semibold mb-2">Folders</h2>
          <ul>
            {folders.map(folder => (
              <li key={folder.id} className="mb-2">
                <button
                  className="text-blue-600 underline"
                  onClick={() => setExpandedFolder(expandedFolder === folder.id ? null : folder.id)}
                >
                  {folder.name}
                </button>
                {expandedFolder === folder.id && (
                  <ul className="ml-4 mt-2">
                    {folderLessons[folder.id]?.length === 0 && <li className="text-gray-400 text-sm">No lessons in this folder.</li>}
                    {folderLessons[folder.id]?.map(lesson => (
                      <li key={lesson.id}>
                        <a href={`/lesson?id=${lesson.id}&band=${bandId}`} className="text-green-700 underline">{lesson.title}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          {userRole === 'admin' && (
            <div className="mt-4">
              <a href={`/public-lessons-library?band=${bandId}`} className="text-blue-600 underline">
                Customize Library (Add/Remove Public Lessons)
              </a>
            </div>
          )}
        </div>
      </div>
    </BandAccessGuard>
  );
}
