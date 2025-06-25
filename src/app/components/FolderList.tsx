import React from "react";

export default function FolderList({ folders, onSelectFolder, isAdmin = false }: { folders: any[], onSelectFolder: (id: string) => void, isAdmin?: boolean }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-md font-semibold">Folders</h4>
        {isAdmin && <button className="text-blue-600 text-sm" disabled>Add Folder</button>}
      </div>
      {folders.length === 0 ? (
        <div className="text-gray-400 text-sm">No folders yet.</div>
      ) : (
        <ul>
          {folders.map(folder => (
            <li key={folder.id}>
              <button className="hover:underline" onClick={() => onSelectFolder(folder.id)}>{folder.name}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
