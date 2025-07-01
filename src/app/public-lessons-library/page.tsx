"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import UserLogger from "../components/UserLogger";

export default function PublicLessonsLibrary() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bandId = searchParams.get("band");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [publicLessons, setPublicLessons] = useState<any[]>([]);
  const [privateLessons, setPrivateLessons] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderLessons, setFolderLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      if (!bandId) {
        setError("No band specified.");
        setLoading(false);
        return;
      }
      // Fetch current user and role
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[DEBUG] Current user:', user);
      if (!user) {
        router.push("/");
        return;
      }
      const { data: memberData, error: memberError } = await supabase
        .from("band_members")
        .select("role")
        .eq("band_id", bandId)
        .eq("user_id", user.id)
        .single();
      console.log('[DEBUG] band_members result:', memberData, memberError);
      if (!memberData || memberData.role !== "admin") {
        setError("You must be an admin to access this page.");
        setLoading(false);
        return;
      }
      setUserRole("admin");
      // Fetch folders for this band
      const { data: foldersData, error: foldersError } = await supabase
        .from("folders")
        .select("id, name")
        .eq("band_id", bandId);
      console.log('[DEBUG] folders result:', foldersData, foldersError);
      setFolders(foldersData || []);
      // Fetch all public lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("id, title, is_public")
        .eq("is_public", true);
      console.log('[DEBUG] public lessons result:', lessonsData, lessonsError);
      setPublicLessons(lessonsData || []);
      // Fetch private lessons for this band
      const { data: privateLessonsData, error: privateLessonsError } = await supabase
        .from("lessons")
        .select("id, title, is_public")
        .eq("is_public", false)
        .eq("band_id", bandId);
      setPrivateLessons(privateLessonsData || []);
      setLoading(false);
    };
    fetchData();
  }, [bandId, router]);

  // Fetch lessons in selected folder
  useEffect(() => {
    const fetchFolderLessons = async () => {
      if (!selectedFolder) {
        setFolderLessons([]);
        return;
      }
      // Get lesson_ids in this folder for this band (must be in both band_lessons and folder_lessons)
      const { data: folderLessonLinks, error: folderLessonsError } = await supabase
        .from("folder_lessons")
        .select("lesson_id")
        .eq("folder_id", selectedFolder);
      const folderLessonIds = (folderLessonLinks || []).map((l: any) => l.lesson_id);
      if (folderLessonIds.length === 0) {
        setFolderLessons([]);
        return;
      }
      // Only include lessons that are also in band_lessons for this band
      const { data: bandLessonLinks, error: bandLessonsError } = await supabase
        .from("band_lessons")
        .select("lesson_id")
        .eq("band_id", bandId);
      const bandLessonIds = (bandLessonLinks || []).map((l: any) => l.lesson_id);
      const lessonIds = folderLessonIds.filter(id => bandLessonIds.includes(id));
      if (lessonIds.length === 0) {
        setFolderLessons([]);
        return;
      }
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("id, title, is_public")
        .in("id", lessonIds);
      setFolderLessons(lessonsData || []);
    };
    fetchFolderLessons();
  }, [selectedFolder, bandId]);

  // Create a new folder
  const handleCreateFolder = async () => {
    const name = prompt("Enter folder name:");
    if (!name) return;
    const { data, error } = await supabase
      .from("folders")
      .insert({ name, band_id: bandId })
      .select();
    if (!error && data) setFolders([...folders, ...data]);
  };

  // Delete a folder
  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm("Are you sure you want to delete this folder? This will not delete any lessons, but will remove their organization.")) return;
    // Remove all folder_lessons for this folder
    await supabase.from("folder_lessons").delete().eq("folder_id", folderId);
    // Remove the folder itself
    await supabase.from("folders").delete().eq("id", folderId);
    setFolders(folders.filter(f => f.id !== folderId));
    if (selectedFolder === folderId) setSelectedFolder(null);
  };

  // Add lesson to folder
  const handleAddLesson = async (lessonId: string) => {
    if (!selectedFolder) return;
    // Ensure lesson is in band_lessons for this band
    await supabase.from("band_lessons").upsert({ band_id: bandId, lesson_id: lessonId });
    // Add to folder_lessons
    await supabase.from("folder_lessons").upsert({ folder_id: selectedFolder, lesson_id: lessonId });
    // Refresh folder lessons
    const { data: folderLessonLinks } = await supabase
      .from("folder_lessons")
      .select("lesson_id")
      .eq("folder_id", selectedFolder);
    const folderLessonIds = (folderLessonLinks || []).map((l: any) => l.lesson_id);
    const { data: bandLessonLinks } = await supabase
      .from("band_lessons")
      .select("lesson_id")
      .eq("band_id", bandId);
    const bandLessonIds = (bandLessonLinks || []).map((l: any) => l.lesson_id);
    const lessonIds = folderLessonIds.filter(id => bandLessonIds.includes(id));
    const { data: lessonsData } = await supabase
      .from("lessons")
      .select("id, title, is_public")
      .in("id", lessonIds);
    setFolderLessons(lessonsData || []);
  };

  // Remove lesson from folder
  const handleRemoveLesson = async (lessonId: string) => {
    if (!selectedFolder) return;
    // Remove from folder_lessons only (do not remove from band_lessons)
    await supabase.from("folder_lessons")
      .delete()
      .eq("folder_id", selectedFolder)
      .eq("lesson_id", lessonId);
    setFolderLessons(folderLessons.filter(l => l.id !== lessonId));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <>
      <UserLogger />
      <div className="max-w-2xl mx-auto py-8">
        <a href={`/band/${bandId}`} className="text-blue-600 underline mb-4 inline-block">← Back to Band Page</a>
        <h1 className="text-2xl font-bold mb-4">Public Lessons Library</h1>
        {folders.length === 0 ? (
          <div className="mb-4">
            <p>No folders found. Create one to get started.</p>
            <button onClick={handleCreateFolder} className="bg-blue-600 text-white px-4 py-2 rounded">Create Folder</button>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block mb-2">Select Folder:</label>
            <div className="flex items-center gap-2 mb-2">
              <select value={selectedFolder || ""} onChange={e => setSelectedFolder(e.target.value)} className="border rounded px-2 py-1">
                <option value="" disabled>Select a folder</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button onClick={handleCreateFolder} className="bg-blue-600 text-white px-2 py-1 rounded">+ Folder</button>
            </div>
            <ul>
              {folders.map(f => (
                <li key={f.id} className="flex items-center gap-2 mb-1">
                  <span>{f.name}</span>
                  <button onClick={() => handleDeleteFolder(f.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {selectedFolder && (
          <>
            <h2 className="text-xl font-semibold mb-2">Lessons in Selected Folder</h2>
            <ul>
              {folderLessons.length === 0 && <li className="text-gray-500">No lessons in this folder.</li>}
              {folderLessons.map(lesson => (
                <li key={lesson.id} className="mb-2 flex items-center justify-between">
                  <span>{lesson.title}</span>
                  <button
                    className="ml-2 px-2 py-1 bg-red-600 text-white rounded"
                    onClick={() => handleRemoveLesson(lesson.id)}
                  >Remove</button>
                </li>
              ))}
            </ul>
          </>
        )}
        <h2 className="text-xl font-semibold mb-2">All Public Lessons</h2>
        <ul className="mb-8">
          {publicLessons.map(lesson => {
            const inFolder = folderLessons.some(l => l.id === lesson.id);
            return (
              <li key={lesson.id} className="mb-2 flex items-center justify-between">
                <span>{lesson.title}</span>
                <button
                  className={`ml-2 px-2 py-1 rounded ${inFolder ? 'bg-red-600' : 'bg-green-600'} text-white`}
                  disabled={!selectedFolder}
                  onClick={() => inFolder ? handleRemoveLesson(lesson.id) : handleAddLesson(lesson.id)}
                >
                  {inFolder ? 'Remove from Folder' : 'Add to Folder'}
                </button>
              </li>
            );
          })}
        </ul>
        <h2 className="text-xl font-semibold mb-2">Private Lessons</h2>
        <ul className="mb-8">
          {privateLessons.length > 0 ? (
            privateLessons.map(lesson => {
              const inFolder = folderLessons.some(l => l.id === lesson.id);
              return (
                <li key={lesson.id} className="mb-2 flex items-center justify-between">
                  <span>{lesson.title}</span>
                  <button
                    className={`ml-2 px-2 py-1 rounded ${inFolder ? 'bg-red-600' : 'bg-green-600'} text-white`}
                    disabled={!selectedFolder}
                    onClick={() => inFolder ? handleRemoveLesson(lesson.id) : handleAddLesson(lesson.id)}
                  >
                    {inFolder ? 'Remove from Folder' : 'Add to Folder'}
                  </button>
                </li>
              );
            })
          ) : (
            <div className="mb-8 text-gray-600">
              No private lessons yet. <a href="#" className="text-blue-600 underline">Order Private Material</a>
            </div>
          )}
        </ul>
      </div>
    </>
  );
}
