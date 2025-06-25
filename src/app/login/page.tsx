"use client";
import AuthForm from "../components/AuthForm";
import UserLogger from "../components/UserLogger";

export default function LoginPage() {
  return (
    <>
      <UserLogger />
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <h1 className="text-3xl font-bold mb-6">Log In</h1>
        <p className="mb-6 text-gray-700">
          Log in to access your band portal. Band admins, members, and site managers all use this page.
        </p>
        <AuthForm />
        <div className="mt-6 text-sm text-gray-500">
          {/* Future: Add Forgot Password, Sign Up, or Super Admin options here */}
          {/* Create a band link removed for logged-out users */}
        </div>
      </div>
    </>
  );
}
