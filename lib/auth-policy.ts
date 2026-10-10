export const UNIVERSITY_DOMAINS = ["s.okayama-u.ac.jp", "okayama-u.ac.jp"];

export type UniversityUser = {
  id: string;
  email: string;
  hostedDomain: string;
  expiresAt: number;
};

export function domainList(value: string | undefined): string[] {
  return value === undefined
    ? [...UNIVERSITY_DOMAINS]
    : value
        .split(",")
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean);
}

// Only pass claims verified by the Google OIDC provider to this function.
export function universityUser(
  claims: unknown,
  emailDomains = UNIVERSITY_DOMAINS,
  hostedDomains = UNIVERSITY_DOMAINS,
): UniversityUser | null {
  if (!claims || typeof claims !== "object") return null;
  const { sub, email, email_verified, hd, exp } = claims as Record<
    string,
    unknown
  >;
  if (
    typeof sub !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(sub) ||
    typeof email !== "string" ||
    email_verified !== true ||
    typeof hd !== "string" ||
    typeof exp !== "number" ||
    !Number.isFinite(exp) ||
    exp <= Date.now() / 1000
  )
    return null;

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(normalizedEmail)) return null;
  const domain = normalizedEmail.split("@")[1];
  const hostedDomain = hd.trim().toLowerCase();
  if (!emailDomains.includes(domain) || !hostedDomains.includes(hostedDomain))
    return null;

  return {
    id: `google:${sub}`,
    email: normalizedEmail,
    hostedDomain,
    expiresAt: exp,
  };
}
