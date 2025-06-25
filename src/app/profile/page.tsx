"use client";
import UserLogger from "../components/UserLogger";

export default function ProfilePage() {
  return (
    <>
      <UserLogger />
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">My Profile</h1>
        <p>View and edit your profile information here.</p>
      </div>
    </>
  );
}
