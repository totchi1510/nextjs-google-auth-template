import assert from "node:assert/strict";
import test from "node:test";
import { domainList, universityUser } from "../lib/auth-policy";

const claims = {
  sub: "123456789",
  email: "student@s.okayama-u.ac.jp",
  email_verified: true,
  hd: "okayama-u.ac.jp",
  exp: Math.floor(Date.now() / 1000) + 3600,
};

test("accepts a verified university account and its parent hosted domain", () => {
  assert.deepEqual(universityUser(claims), {
    id: "google:123456789",
    email: claims.email,
    hostedDomain: claims.hd,
    expiresAt: claims.exp,
  });
  assert.ok(universityUser({ ...claims, email: "Staff@okayama-u.ac.jp" }));
});

test("rejects unverified, unmanaged, malformed, and lookalike accounts", () => {
  for (const change of [
    { email_verified: false },
    { email_verified: "true" },
    { hd: undefined },
    { hd: "example.com" },
    { sub: "" },
    { sub: "id\nInjected: yes" },
    { email: "user@gmail.com" },
    { email: "user@okayama-u.ac.jp.evil.test" },
    { email: "user@evil-okayama-u.ac.jp" },
    { email: "user@s.okayama-u.ac.jp@evil.test" },
    { exp: 1 },
    { exp: undefined },
    { exp: Infinity },
  ])
    assert.equal(universityUser({ ...claims, ...change }), null);
});

test("an explicitly empty or changed allowlist cannot reuse an old permission", () => {
  assert.equal(universityUser(claims, [], [claims.hd]), null);
  assert.equal(universityUser(claims, [claims.email.split("@")[1]], []), null);
  assert.deepEqual(domainList(""), []);
});
