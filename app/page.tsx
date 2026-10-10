import { redirect } from "next/navigation";
import { getAuthorizedUser } from "@/lib/auth";
import { AuthButton } from "./auth-controls";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getAuthorizedUser();
  if (!user) redirect("/login");
  return (
    <main>
      <header>
        <h1>App</h1>
        <AuthButton action="logout" />
      </header>
      <p className="account">{user.email}</p>
      {/* Add the team's protected application here. */}
    </main>
  );
}
