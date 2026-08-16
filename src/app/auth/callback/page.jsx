"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.push("/login");
        return;
      }

      const accessToken = data.session.access_token;

      const res = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      });

      if (!res.ok) {
        router.push("/login");
        return;
      }

      // Check if this is a new user who needs to set a password
      // Invited users have no password set — check app_metadata
      const user = data.session.user;
      const isInvited =
        user.app_metadata?.provider === "email" &&
        !user.user_metadata?.password_set;

      if (isInvited) {
        router.push("/set-password");
        return;
      }

      router.push("/dashboard");
    }

    handleCallback();
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p>Setting up your account...</p>
    </main>
  );
}
