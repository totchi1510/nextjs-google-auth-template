import { redirect } from "next/navigation";
import { getAuthorizedUser, googleAuthConfigured } from "@/lib/auth";
import { AuthButton } from "../auth-controls";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAuthorizedUser()) redirect("/");
  const { error } = await searchParams;
  const configured = googleAuthConfigured();
  return (
    <main className="login">
      <h1>ログイン</h1>
      <AuthButton action="login" disabled={!configured} />
      {!configured && <p role="status">現在ログインを利用できません。</p>}
      {error && (
        <p role="alert">
          ログインできませんでした。許可された大学アカウントでお試しください。
        </p>
      )}
    </main>
  );
}
