import React from "react";

export default function LessonList({ lessons, isAdmin = false }: { lessons: any[], isAdmin?: boolean }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-md font-semibold">Lessons</h4>
        {isAdmin && <button className="text-blue-600 text-sm" disabled>Add Lesson</button>}
      </div>
      {lessons.length === 0 ? (
        <div className="text-gray-400 text-sm">No lessons yet.</div>
      ) : (
        <ul>
          {lessons.map(lesson => (
            <li key={lesson.id}>{lesson.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
