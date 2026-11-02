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
  assert.ok(assertEnv({ ...good, BETTER_AUTH_URL: "http://tms.example.com" }).some((e) => e.includes("https")));
  assert.ok(assertEnv({ ...good, UPLOAD_DIR: undefined }).some((e) => e.includes("UPLOAD_DIR")));
});

test("development tidak memaksa aturan produksi, tapi DATABASE_URL tetap wajib", () => {
  assert.deepEqual(assertEnv({ NODE_ENV: "development", DATABASE_URL: "postgres://x" } as NodeJS.ProcessEnv), []);
  assert.equal(assertEnv({ NODE_ENV: "development" } as NodeJS.ProcessEnv).length, 1);
});
