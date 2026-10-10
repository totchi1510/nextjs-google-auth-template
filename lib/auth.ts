import "server-only";
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { domainList, universityUser } from "./auth-policy";

const configured = (value: string | undefined) =>
  Boolean(value && !value.startsWith("replace-"));

export function googleAuthConfigured() {
  if (!(
    configured(process.env.GOOGLE_CLIENT_ID) &&
    configured(process.env.GOOGLE_CLIENT_SECRET) &&
    configured(process.env.NEXTAUTH_SECRET)
  ))
    return false;
  try {
    const url = new URL(process.env.NEXTAUTH_URL ?? "");
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

function allowedUser(claims: unknown) {
  return universityUser(
    claims,
    domainList(process.env.ALLOWED_EMAIL_DOMAINS),
    domainList(process.env.ALLOWED_GOOGLE_HOSTED_DOMAINS),
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: googleAuthConfigured()
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          authorization: {
            params: { scope: "openid email profile", prompt: "select_account" },
          },
        }),
      ]
    : [],
  session: { strategy: "jwt", maxAge: 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ account, profile }) {
      return account?.provider === "google" && allowedUser(profile) !== null;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        const user =
          account.provider === "google" ? allowedUser(profile) : null;
        token.universityUser = user ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      session.universityUser = token.universityUser;
      return session;
    },
  },
};

export async function getAuthorizedUser() {
  if (!googleAuthConfigured()) return null;
  const session = await getServerSession(authOptions);
  const user = session?.universityUser;
  if (!user) return null;
  // Reapply the current domain policy even to an existing, signed session.
  return allowedUser({
    sub: user.id.replace(/^google:/, ""),
    email: user.email,
    email_verified: true,
    hd: user.hostedDomain,
    exp: user.expiresAt,
  });
}
