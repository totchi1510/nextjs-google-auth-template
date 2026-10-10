"use client";

import { LogIn, LogOut } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { useState } from "react";

export function AuthButton({
  action,
  disabled = false,
}: {
  action: "login" | "logout";
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const Icon = action === "login" ? LogIn : LogOut;
  async function handleClick() {
    setPending(true);
    setFailed(false);
    try {
      if (action === "login") await signIn("google", { callbackUrl: "/" });
      else await signOut({ callbackUrl: "/login" });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <button
        type="button"
        disabled={disabled || pending}
        onClick={handleClick}
      >
        <Icon size={18} aria-hidden="true" />
        {action === "login" ? "Googleでログイン" : "ログアウト"}
      </button>
      {failed && (
        <p role="alert">認証に失敗しました。もう一度お試しください。</p>
      )}
    </>
  );
}
