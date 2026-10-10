import type { UniversityUser } from "@/lib/auth-policy";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    universityUser?: UniversityUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    universityUser?: UniversityUser;
  }
}
