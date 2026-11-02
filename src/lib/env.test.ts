import assert from "node:assert/strict";
import { test } from "node:test";
import { assertEnv } from "./env";

const good = {
  NODE_ENV: "production", DATABASE_URL: "postgres://x", BETTER_AUTH_SECRET: "a".repeat(40),
  BETTER_AUTH_URL: "https://tms.example.com", UPLOAD_DIR: "/app/uploads",
} as NodeJS.ProcessEnv;

test("konfigurasi produksi yang benar lolos", () => assert.deepEqual(assertEnv(good), []));

test("secret pendek, contoh, atau URL http ditolak di produksi", () => {
  assert.equal(assertEnv({ ...good, BETTER_AUTH_SECRET: "pendek" }).length, 1);
  assert.ok(assertEnv({ ...good, BETTER_AUTH_SECRET: "change-me-" + "x".repeat(40) }).some((e) => e.includes("contoh")));
  assert.ok(assertEnv({ ...good, BETTER_AUTH_URL: "http://tms.example.com" }).some((e) => e.includes("ALLOW_INSECURE_HTTP")));
  assert.ok(assertEnv({ ...good, UPLOAD_DIR: undefined }).some((e) => e.includes("UPLOAD_DIR")));
});

test("development tidak memaksa aturan produksi, tapi DATABASE_URL tetap wajib", () => {
  assert.deepEqual(assertEnv({ NODE_ENV: "development", DATABASE_URL: "postgres://x" } as NodeJS.ProcessEnv), []);
  assert.equal(assertEnv({ NODE_ENV: "development" } as NodeJS.ProcessEnv).length, 1);
});

test("mode IP:port: http hanya lolos bila ALLOW_INSECURE_HTTP=true", () => {
  const ip = { ...good, BETTER_AUTH_URL: "http://156.67.219.209:3010" };
  assert.equal(assertEnv(ip).length, 1);
  assert.deepEqual(assertEnv({ ...ip, ALLOW_INSECURE_HTTP: "true" }), []);
  assert.equal(assertEnv({ ...ip, ALLOW_INSECURE_HTTP: "yes" }).length, 1);
});

test("URL bukan http(s) atau tanpa host ditolak", () => {
  for (const u of ["", "tms.example.com", "ftp://x.test", "http://"]) {
    assert.ok(assertEnv({ ...good, BETTER_AUTH_URL: u, ALLOW_INSECURE_HTTP: "true" }).length >= 1, u);
  }
});
