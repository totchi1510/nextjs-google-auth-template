import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { after, before, test } from "node:test";
import { encode } from "next-auth/jwt";

// Use test-only signed sessions; Google OAuth itself needs real client settings.
const secret = randomBytes(32).toString("hex");
const user = {
  id: "google:123",
  email: "student@s.okayama-u.ac.jp",
  hostedDomain: "okayama-u.ac.jp",
  expiresAt: Date.now() / 1000 + 3600,
};
let nextProcess: ChildProcess;
let baseUrl: string;

before(async () => {
  const reservation = createServer();
  await new Promise<void>((resolve) =>
    reservation.listen(0, "127.0.0.1", resolve),
  );
  const port = (reservation.address() as AddressInfo).port;
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  baseUrl = `http://127.0.0.1:${port}`;
  nextProcess = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        NEXTAUTH_URL: baseUrl,
        NEXTAUTH_SECRET: secret,
        GOOGLE_CLIENT_ID: "integration-test-client",
        GOOGLE_CLIENT_SECRET: "integration-test-secret",
        ALLOWED_EMAIL_DOMAINS: "s.okayama-u.ac.jp,okayama-u.ac.jp",
        ALLOWED_GOOGLE_HOSTED_DOMAINS: "s.okayama-u.ac.jp,okayama-u.ac.jp",
      },
      stdio: "ignore",
    },
  );
  for (let attempts = 0; attempts < 100; attempts++) {
    if (nextProcess.exitCode !== null)
      throw new Error("Run npm run build before integration tests");
    try {
      if ((await fetch(`${baseUrl}/login`)).ok) return;
    } catch {
      /* Server is still starting. */
    }
    await delay(100);
  }
  throw new Error("Next.js startup timed out");
});

after(async () => {
  if (nextProcess && nextProcess.exitCode === null) {
    const exited = new Promise<void>((resolve) =>
      nextProcess.once("exit", () => resolve()),
    );
    nextProcess.kill("SIGTERM");
    await exited;
  }
});

async function cookie(identity = user, signingSecret = secret) {
  const token = await encode({
    token: { universityUser: identity },
    secret: signingSecret,
    maxAge: 3600,
  });
  return `next-auth.session-token=${token}`;
}

test("anonymous visitors must sign in before accessing the page", async () => {
  const response = await fetch(baseUrl, { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "/login");
});

test("disallowed, expired, and incorrectly signed identities cannot access the page", async () => {
  const cookies = await Promise.all([
    cookie({ ...user, email: "outsider@gmail.com" }),
    cookie({ ...user, hostedDomain: "example.com" }),
    cookie({ ...user, expiresAt: 1 }),
    cookie(user, "incorrect-test-only-signing-secret"),
  ]);
  for (const session of cookies) {
    const response = await fetch(baseUrl, {
      redirect: "manual",
      headers: { cookie: session },
    });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "/login");
  }
});

test("a valid university session can view the page without exposing credentials", async () => {
  const page = await fetch(baseUrl, { headers: { cookie: await cookie() } });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(html.includes(user.email));
  assert.ok(!html.includes(secret));
  assert.ok(!html.includes("integration-test-secret"));
});

test("Google is the only login provider", async () => {
  const response = await fetch(`${baseUrl}/api/auth/providers`);
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(await response.json()), ["google"]);
});
