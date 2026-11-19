import type { Metadata } from "next";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Sign in to the BUPL Cricket Auction admin console.",
};

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
      <AdminLoginForm />
    </main>
  );
}
